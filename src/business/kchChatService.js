// Business Layer - Kinder Care Hub chat (WhatsApp-style direct
// messaging). The only place that talks to the KCH repositories on
// behalf of the chat routes.
//
// Model: a user picks a CONTACT (role-aware audience, validated server
// side), which opens (or creates) the direct conversation between the
// two of them. Messages are text and/or a single image; images live in
// blob storage and are swept after the retention window (see
// attachmentRetentionService).
//
// Tenancy: every access runs through canUserAccessConversation /
// canUserSendMessage (tenant match + participant membership). Contact
// targets are re-validated against the actor's school via
// KchContactRepository.findContact, so a school user can never open a
// conversation with another school's parent.

const path = require('path');
const {
  ConversationRepository,
  ConversationParticipantRepository,
  MessageRepository,
  MessageAttachmentRepository,
  MessageNotificationEventRepository,
  ConversationAuditLogRepository
} = require('../data/kinderCareHubRepository');
const { KchContactRepository } = require('../data/kchContactRepository');
const kchAccess = require('./kinderCareHubAccess');
const { canTenantUseFeature } = require('../data/entitlementRepository');
const { getBlobStorageProvider } = require('../data/blobStorage');

const MAX_BODY_LENGTH = 5000;
const PREVIEW_LENGTH = 200;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Direct conversation type for each actor-role -> target-role pair.
// Pairs not listed here cannot start a conversation.
const TYPE_BY_PAIR = {
  'school>parent': 'SchoolToParent',
  'school>school': 'SchoolInternal',
  'school>admin': 'SchoolToDevForge',
  'parent>school': 'ParentToSchool',
  'admin>school': 'DevForgeToSchool',
  'admin>parent': 'DevForgeToParent'
};

function httpError(status, code) {
  const err = new Error(code);
  err.statusCode = status;
  return err;
}

// Defence in depth: the multipart MIME type is client-supplied and
// spoofable, so confirm the actual file signature (magic bytes) matches
// an allowed raster image. Blocks a disguised SVG/HTML/script upload
// even before nosniff would. Returns the detected type or null.
function sniffImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function displayName({ FirstName, LastName, Username, Email } = {}) {
  const full = `${FirstName || ''} ${LastName || ''}`.trim();
  return full || Username || Email || 'Unknown';
}

class KchChatService {
  constructor(deps = {}) {
    this.conversations = deps.conversationRepository || new ConversationRepository();
    this.participants = deps.participantRepository || new ConversationParticipantRepository();
    this.messages = deps.messageRepository || new MessageRepository();
    this.attachments = deps.attachmentRepository || new MessageAttachmentRepository();
    this.events = deps.notificationEventRepository || new MessageNotificationEventRepository();
    this.auditLog = deps.conversationAuditLogRepository || new ConversationAuditLogRepository();
    this.contacts = deps.contactRepository || new KchContactRepository();
    this.blobProvider = deps.blobProvider || null;
    this.access = deps.access || kchAccess;
    this.canTenantUseFeature = deps.canTenantUseFeature || canTenantUseFeature;
  }

  provider() {
    return this.blobProvider || getBlobStorageProvider();
  }

  context(req) {
    const ctx = req.sessionContext;
    if (!ctx || !ctx.UserId) throw httpError(401, 'no_session');
    if (!ctx.ActiveTenantId && !ctx.IsDevForgeUser) throw httpError(401, 'no_active_tenant');
    return ctx;
  }

  async ensureEntitled(ctx) {
    if (ctx.IsDevForgeUser) return;
    const ent = await this.canTenantUseFeature(ctx.ActiveTenantId, 'KINDER_CARE_HUB_MESSAGING');
    if (!ent.IsAllowed) throw httpError(402, 'feature_not_entitled');
  }

  // Role-aware contact list for the "new chat" picker.
  async listContacts(req, { q } = {}) {
    const ctx = this.context(req);
    await this.ensureEntitled(ctx);
    let rows;
    if (ctx.IsSchoolUser) {
      rows = await this.contacts.listForSchoolUser({ schoolId: ctx.ActiveSchoolId, userId: ctx.UserId, q });
    } else if (ctx.IsParentUser) {
      rows = await this.contacts.listForParentUser({ schoolId: ctx.ActiveSchoolId, q });
    } else if (ctx.IsDevForgeUser) {
      rows = await this.contacts.listForAdminUser({ q });
    } else {
      throw httpError(403, 'forbidden');
    }
    return rows.map(r => ({
      userId: r.UserID,
      name: displayName(r),
      role: r.ContactRole,
      tenantId: r.ContactTenantId || null,
      schoolId: r.ContactSchoolId || null,
      schoolName: r.SchoolName || null
    }));
  }

  // Open (or create) the direct conversation with a validated contact.
  async startConversation(req, { targetUserId, targetSchoolId } = {}) {
    const ctx = this.context(req);
    await this.ensureEntitled(ctx);
    const target = Number(targetUserId);
    if (!Number.isInteger(target) || target <= 0) throw httpError(400, 'target_user_required');
    if (target === ctx.UserId) throw httpError(400, 'cannot_message_yourself');
    const selectedSchoolId = Number(targetSchoolId);

    const contact = await this.contacts.findContact({
      actorRole: ctx.UserRole,
      schoolId: ctx.ActiveSchoolId,
      userId: ctx.UserId,
      targetUserId: target,
      targetSchoolId: Number.isInteger(selectedSchoolId) && selectedSchoolId > 0 ? selectedSchoolId : null
    });
    if (!contact) throw httpError(403, 'not_a_contact');

    const conversationType = TYPE_BY_PAIR[`${ctx.UserRole}>${contact.ContactRole}`];
    if (!conversationType) throw httpError(403, 'conversation_type_not_allowed');

    // DevForge conversations live in the school's tenant so the school
    // or parent participant can see them.
    const tenantId = ctx.IsDevForgeUser ? (contact.ContactTenantId || contact.ContactSchoolId) : ctx.ActiveTenantId;
    if (!tenantId) throw httpError(400, 'contact_has_no_school');
    const schoolId = ctx.IsDevForgeUser ? contact.ContactSchoolId : (ctx.ActiveSchoolId || contact.ContactSchoolId || null);

    // One thread per pair regardless of who started it: a school->parent
    // chat and a parent->school chat are the same conversation.
    const reverseType = TYPE_BY_PAIR[`${contact.ContactRole}>${ctx.UserRole}`];
    const candidateTypes = reverseType && reverseType !== conversationType
      ? [conversationType, reverseType]
      : [conversationType];
    for (const type of candidateTypes) {
      const existing = await this.conversations.findDirectConversation({
        tenantId, schoolId, conversationType: type,
        participantUserIds: [ctx.UserId, target]
      });
      if (existing) {
        return { conversationId: existing.ConversationId, conversationType: type, otherUserId: target, otherName: displayName(contact), existing: true };
      }
    }

    const conversationId = await this.conversations.create({
      tenantId, schoolId, conversationType,
      conversationName: null,
      createdByUserId: ctx.UserId,
      isBroadcast: false
    });
    await this.participants.add({ conversationId, tenantId, schoolId, userId: ctx.UserId, roleAtTime: ctx.UserRole });
    await this.participants.add({ conversationId, tenantId, schoolId, userId: target, roleAtTime: contact.ContactRole });
    await this.auditLog.write({
      tenantId, schoolId, userId: ctx.UserId,
      actionType: 'ConversationCreated', entityType: 'Conversation', entityId: conversationId,
      description: conversationType
    });
    return { conversationId, conversationType, otherUserId: target, otherName: displayName(contact), existing: false };
  }

  async listConversations(req, { limit = 30, offset = 0 } = {}) {
    const ctx = this.context(req);
    await this.ensureEntitled(ctx);
    const rows = await this.conversations.listForUser(
      ctx.UserId,
      ctx.IsDevForgeUser ? null : ctx.ActiveTenantId,
      { limit, offset }
    );
    return rows.map(r => ({
      conversationId: r.ConversationId,
      conversationType: r.ConversationType,
      name: r.ConversationName || r.OtherFullName || r.OtherUsername || ('Chat ' + r.ConversationId),
      otherUserId: r.OtherUserId || null,
      otherRole: r.OtherRole || null,
      isBroadcast: !!r.IsBroadcast,
      lastMessageAt: r.LastMessageAt,
      lastMessagePreview: r.LastMessagePreview,
      unreadCount: Number(r.UnreadCount || 0)
    }));
  }

  async listMessages(req, conversationId, { beforeMessageId, pageSize = 40 } = {}) {
    const access = await this.access.canUserAccessConversation(req, conversationId);
    if (!access.allowed) {
      throw httpError(access.reason === 'conversation-not-found' ? 404 : 403, access.reason);
    }
    const rows = await this.messages.listForConversation(conversationId, access.conversation.TenantId, {
      beforeMessageId: Number(beforeMessageId) || undefined,
      pageSize
    });
    return rows.map(m => ({
      messageId: m.MessageId,
      senderUserId: m.SenderUserId,
      senderName: (m.SenderFullName || '').trim() || m.SenderUsername || 'Unknown',
      senderRole: m.SenderRole || null,
      type: m.MessageType,
      body: m.MessageBody,
      createdAt: m.CreatedAt,
      isSystem: !!m.IsSystemMessage,
      attachment: m.AttachmentId ? {
        attachmentId: m.AttachmentId,
        mimeType: m.AttachmentMimeType,
        fileName: m.AttachmentFileName,
        expired: !!m.AttachmentExpired
      } : null
    }));
  }

  // Send a text and/or single-image message. `file` is the multer file
  // object ({ buffer, mimetype, originalname, size }) when present.
  async sendMessage(req, conversationId, { body, file } = {}) {
    const ctx = this.context(req);
    const canSend = await this.access.canUserSendMessage(req, conversationId);
    if (!canSend.allowed) throw httpError(403, canSend.reason);

    const text = String(body || '').trim().slice(0, MAX_BODY_LENGTH);
    if (!text && !file) throw httpError(400, 'message_or_image_required');

    if (file) {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) throw httpError(400, 'unsupported_image_type');
      // The declared MIME is not trusted; the bytes must actually be an image.
      const sniffed = sniffImageType(file.buffer);
      if (!sniffed) throw httpError(400, 'unsupported_image_type');
      file = { ...file, mimetype: sniffed }; // store the verified type, not the client's claim
      const canUpload = await this.access.canUserUploadImage(req, conversationId);
      if (!canUpload.allowed) throw httpError(403, canUpload.reason);
    }

    const conv = canSend.conversation || (await this.conversations.getById(conversationId));
    const messageType = file ? (text ? 'TextWithImage' : 'Image') : 'Text';
    const messageId = await this.messages.create({
      tenantId: conv.TenantId,
      schoolId: conv.SchoolId,
      conversationId,
      senderUserId: ctx.UserId,
      messageType,
      messageBody: text
    });

    let attachment = null;
    if (file) {
      const stored = await this.provider().store({
        buffer: file.buffer,
        contentType: file.mimetype,
        filename: file.originalname,
        tenantId: conv.TenantId,
        schoolId: conv.SchoolId,
        ownerId: ctx.UserId
      });
      const attachmentId = await this.attachments.create({
        tenantId: conv.TenantId,
        schoolId: conv.SchoolId,
        conversationId,
        messageId,
        uploadedByUserId: ctx.UserId,
        originalFileName: file.originalname || null,
        storedFileName: path.basename(stored.blobUrl),
        fileExtension: path.extname(file.originalname || '') || '',
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        storagePath: stored.blobUrl,
        thumbnailPath: null,
        isImage: true
      });
      attachment = { attachmentId, mimeType: file.mimetype, fileName: file.originalname, expired: false };
    }

    const preview = text ? text.slice(0, PREVIEW_LENGTH) : 'Photo';
    await this.conversations.updateLastMessage(conversationId, messageId, new Date(), preview);

    const others = (await this.participants.listActiveForConversation(conversationId))
      .filter(p => p.UserId !== ctx.UserId);
    for (const p of others) {
      await this.participants.incrementUnread(conversationId, p.UserId);
      await this.events.create({
        tenantId: conv.TenantId,
        schoolId: conv.SchoolId,
        conversationId,
        messageId,
        targetUserId: p.UserId,
        eventType: 'NewMessage',
        status: 'Pending'
      });
    }
    await this.auditLog.write({
      tenantId: conv.TenantId, schoolId: conv.SchoolId, userId: ctx.UserId,
      actionType: 'MessageSent', entityType: 'Message', entityId: messageId,
      description: messageType
    });

    return {
      messageId,
      senderUserId: ctx.UserId,
      type: messageType,
      body: text,
      createdAt: new Date().toISOString(),
      attachment
    };
  }

  async markRead(req, conversationId) {
    const ctx = this.context(req);
    const access = await this.access.canUserAccessConversation(req, conversationId);
    if (!access.allowed) {
      throw httpError(access.reason === 'conversation-not-found' ? 404 : 403, access.reason);
    }
    await this.participants.markRead(conversationId, ctx.UserId, access.conversation.LastMessageId || null);
    return { ok: true };
  }

  // Returns { expired: true } when the image is past retention, or the
  // bytes to stream. The caller must NOT serve anything before this
  // resolves: access is checked against the attachment's conversation.
  async getAttachmentForView(req, attachmentId) {
    this.context(req);
    const id = Number(attachmentId);
    if (!Number.isInteger(id) || id <= 0) throw httpError(404, 'not_found');
    const att = await this.attachments.findById(id);
    if (!att) throw httpError(404, 'not_found');
    const access = await this.access.canUserAccessConversation(req, att.ConversationId);
    if (!access.allowed) throw httpError(403, access.reason);
    if (att.IsDeleted) return { expired: true };
    const read = await this.provider().read(att.StoragePath);
    return {
      expired: false,
      buffer: read.buffer,
      contentType: att.MimeType || read.contentType || 'application/octet-stream',
      filename: att.OriginalFileName || read.filename || 'image'
    };
  }

  async pollEvents(req, { sinceEventId } = {}) {
    const ctx = this.context(req);
    const rows = await this.events.listForUserSince(
      ctx.UserId,
      ctx.IsDevForgeUser ? null : ctx.ActiveTenantId,
      Number(sinceEventId) || 0
    );
    return rows.map(e => ({
      eventId: e.MessageNotificationEventId,
      conversationId: e.ConversationId,
      messageId: e.MessageId,
      eventType: e.EventType,
      createdAt: e.CreatedAt
    }));
  }
}

module.exports = { KchChatService };
