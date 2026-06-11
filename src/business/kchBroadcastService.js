// Business Layer - KCH broadcast announcements (WhatsApp broadcast-list
// style). A school user sends one message to every parent linked to
// their school; each delivery lands in the existing direct conversation
// with that parent (or creates it), so replies come back as normal
// one-to-one chats.
//
// Scope: school users only. DevForge platform announcements are a
// separate concern and are not exposed here.

const {
  ConversationRepository,
  ConversationParticipantRepository,
  MessageRepository,
  MessageNotificationEventRepository,
  ConversationAuditLogRepository
} = require('../data/kinderCareHubRepository');
const {
  BroadcastAnnouncementRepository,
  BroadcastDeliveryRepository
} = require('../data/kinderCareHubOperationsRepository');
const { KchContactRepository } = require('../data/kchContactRepository');
const { canTenantUseFeature } = require('../data/entitlementRepository');

const MAX_BODY_LENGTH = 5000;
const PREVIEW_LENGTH = 200;

function httpError(status, code) {
  const err = new Error(code);
  err.statusCode = status;
  return err;
}

class KchBroadcastService {
  constructor(deps = {}) {
    this.conversations = deps.conversationRepository || new ConversationRepository();
    this.participants = deps.participantRepository || new ConversationParticipantRepository();
    this.messages = deps.messageRepository || new MessageRepository();
    this.events = deps.notificationEventRepository || new MessageNotificationEventRepository();
    this.auditLog = deps.conversationAuditLogRepository || new ConversationAuditLogRepository();
    this.broadcasts = deps.broadcastRepository || new BroadcastAnnouncementRepository();
    this.deliveries = deps.deliveryRepository || new BroadcastDeliveryRepository();
    this.contacts = deps.contactRepository || new KchContactRepository();
    this.canTenantUseFeature = deps.canTenantUseFeature || canTenantUseFeature;
  }

  context(req) {
    const ctx = req.sessionContext;
    if (!ctx || !ctx.UserId) throw httpError(401, 'no_session');
    if (!ctx.IsSchoolUser) throw httpError(403, 'school_role_required');
    if (!ctx.ActiveTenantId || !ctx.ActiveSchoolId) throw httpError(401, 'no_active_tenant');
    return ctx;
  }

  // Create the announcement plus a Pending delivery row per parent.
  async createBroadcast(req, { messageBody } = {}) {
    const ctx = this.context(req);
    const ent = await this.canTenantUseFeature(ctx.ActiveTenantId, 'KINDER_CARE_HUB_BROADCASTS');
    if (!ent.IsAllowed) throw httpError(402, 'feature_not_entitled');

    const body = String(messageBody || '').trim().slice(0, MAX_BODY_LENGTH);
    if (!body) throw httpError(400, 'message_required');

    const recipients = await this.contacts.listParentsForSchool({ schoolId: ctx.ActiveSchoolId });
    if (!recipients.length) throw httpError(400, 'no_recipients');

    const broadcastId = await this.broadcasts.create({
      tenantId: ctx.ActiveTenantId,
      createdByUserId: ctx.UserId,
      broadcastType: 'SchoolToParents',
      messageBody: body,
      totalRecipients: recipients.length,
      status: 'Pending'
    });
    for (const r of recipients) {
      await this.deliveries.create({
        broadcastAnnouncementId: broadcastId,
        tenantId: ctx.ActiveTenantId,
        recipientUserId: r.UserID,
        recipientTenantId: ctx.ActiveTenantId,
        deliveryStatus: 'Pending'
      });
    }
    await this.auditLog.write({
      tenantId: ctx.ActiveTenantId, schoolId: ctx.ActiveSchoolId, userId: ctx.UserId,
      actionType: 'BroadcastCreated', entityType: 'Broadcast', entityId: broadcastId,
      description: `recipients=${recipients.length}`
    });
    return { broadcastAnnouncementId: broadcastId, totalRecipients: recipients.length, status: 'Pending' };
  }

  // Deliver one batch: each delivery drops the message into the direct
  // conversation with that parent (created on first contact).
  async processBroadcast(req, broadcastId, { batchSize = 50 } = {}) {
    const ctx = this.context(req);
    const broadcast = await this.broadcasts.getById(broadcastId, ctx.ActiveTenantId);
    if (!broadcast) throw httpError(404, 'not_found');

    const pending = await this.deliveries.listPending(broadcastId, { batchSize });
    let processed = 0;
    for (const d of pending) {
      try {
        const conversationId = await this.ensureDirectConversation(ctx, d.RecipientUserId);
        const messageId = await this.messages.create({
          tenantId: ctx.ActiveTenantId,
          schoolId: ctx.ActiveSchoolId,
          conversationId,
          senderUserId: broadcast.CreatedByUserId,
          messageType: 'Text',
          messageBody: broadcast.MessageBody
        });
        await this.conversations.updateLastMessage(conversationId, messageId, new Date(), broadcast.MessageBody.slice(0, PREVIEW_LENGTH));
        await this.participants.incrementUnread(conversationId, d.RecipientUserId);
        await this.events.create({
          tenantId: ctx.ActiveTenantId,
          schoolId: ctx.ActiveSchoolId,
          conversationId,
          messageId,
          targetUserId: d.RecipientUserId,
          eventType: 'NewMessage',
          status: 'Pending'
        });
        await this.deliveries.setStatus(d.BroadcastDeliveryId, 'Delivered');
        processed++;
      } catch (err) {
        await this.deliveries.setStatus(d.BroadcastDeliveryId, 'Failed', err.message.slice(0, 500));
      }
    }

    const counts = await this.deliveries.countByStatus(broadcastId);
    const status = counts.Pending > 0 ? 'InProgress' : (counts.Failed > 0 ? 'Failed' : 'Completed');
    await this.broadcasts.setCounts(broadcastId, counts.Delivered, counts.Failed, status);
    return { processed, remaining: counts.Pending, delivered: counts.Delivered, failed: counts.Failed, status };
  }

  async ensureDirectConversation(ctx, parentUserId) {
    for (const type of ['SchoolToParent', 'ParentToSchool']) {
      const existing = await this.conversations.findDirectConversation({
        tenantId: ctx.ActiveTenantId,
        schoolId: ctx.ActiveSchoolId,
        conversationType: type,
        participantUserIds: [ctx.UserId, parentUserId]
      });
      if (existing) return existing.ConversationId;
    }
    const conversationId = await this.conversations.create({
      tenantId: ctx.ActiveTenantId,
      schoolId: ctx.ActiveSchoolId,
      conversationType: 'SchoolToParent',
      conversationName: null,
      createdByUserId: ctx.UserId,
      isBroadcast: false
    });
    await this.participants.add({ conversationId, tenantId: ctx.ActiveTenantId, schoolId: ctx.ActiveSchoolId, userId: ctx.UserId, roleAtTime: 'school' });
    await this.participants.add({ conversationId, tenantId: ctx.ActiveTenantId, schoolId: ctx.ActiveSchoolId, userId: parentUserId, roleAtTime: 'parent' });
    return conversationId;
  }
}

module.exports = { KchBroadcastService };
