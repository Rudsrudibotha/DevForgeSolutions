// Business Layer - KinderCareHub access checks. Implements Tasks 29, 30,
// 31, 32: ValidateActiveTenantAccess, CanUserAccessConversation,
// CanUserSendMessage, CanUserUploadImage. Every check validates
// TenantId against the active tenant, fetches the participant record, and
// returns a deny reason on failure.

const { canTenantUseFeature } = require('../data/entitlementRepository');
const { ConversationRepository, ConversationParticipantRepository } = require('../data/kinderCareHubRepository');

// ValidateActiveTenantAccess (Task 29). Returns { allowed, reason }.
async function validateActiveTenantAccess(req) {
  if (!req.sessionContext) {
    return { allowed: false, reason: 'no-session-context' };
  }
  const { UserId, ActiveTenantId } = req.sessionContext;
  if (!UserId) return { allowed: false, reason: 'no-user' };
  if (!ActiveTenantId) {
    return { allowed: false, reason: 'no-active-tenant' };
  }
  // For non-DevForge users, must have active membership.
  if (!req.sessionContext.IsDevForgeUser) {
    if (!req.sessionContext.HasTenantAccess) {
      return { allowed: false, reason: 'no-active-membership' };
    }
  }
  return { allowed: true, reason: 'ok' };
}

// CanUserAccessConversation (Task 30). Returns { allowed, reason, conversation }.
async function canUserAccessConversation(req, conversationId) {
  const tenantCheck = await validateActiveTenantAccess(req);
  if (!tenantCheck.allowed) return { allowed: false, reason: tenantCheck.reason };

  const convRepo = new ConversationRepository();
  const conversation = await convRepo.getById(conversationId);
  if (!conversation) return { allowed: false, reason: 'conversation-not-found' };

  // TenantId match unless DevForge.
  if (!req.sessionContext.IsDevForgeUser) {
    if (conversation.TenantId !== req.sessionContext.ActiveTenantId) {
      return { allowed: false, reason: 'cross-tenant-access-denied' };
    }
  }

  const partRepo = new ConversationParticipantRepository();
  const participant = await partRepo.getParticipant(conversationId, req.sessionContext.UserId);
  if (!participant || !participant.IsActive) {
    return { allowed: false, reason: 'not-a-participant' };
  }
  if (!participant.CanRead) {
    return { allowed: false, reason: 'cannot-read' };
  }
  return { allowed: true, reason: 'ok', conversation, participant };
}

// CanUserSendMessage (Task 31). Includes feature entitlement, role rules,
// and conversation membership.
async function canUserSendMessage(req, conversationId) {
  const access = await canUserAccessConversation(req, conversationId);
  if (!access.allowed) return { allowed: false, reason: access.reason };
  if (!access.participant.CanSend) return { allowed: false, reason: 'cannot-send' };
  const conv = access.conversation;
  if (!req.sessionContext.IsDevForgeUser) {
    // Parent users may only message their own school (either side may
    // have started the thread) or reply to DevForge.
    if (req.sessionContext.IsParentUser) {
      const parentTypes = ['ParentToSchool', 'SchoolToParent', 'DevForgeToParent', 'BroadcastAnnouncement'];
      if (!parentTypes.includes(conv.ConversationType)) {
        return { allowed: false, reason: 'parent-cannot-message-this-type' };
      }
    }
    // School users may only message staff/parents in same tenant +
    // DevForge support (again, either side may have started the thread).
    if (req.sessionContext.IsSchoolUser) {
      const allowedTypes = ['SchoolInternal', 'SchoolToParent', 'ParentToSchool', 'SchoolToDevForge', 'DevForgeToSchool', 'BroadcastAnnouncement'];
      if (!allowedTypes.includes(conv.ConversationType)) {
        return { allowed: false, reason: 'school-cannot-message-this-type' };
      }
    }
  }
  const ent = await canTenantUseFeature(conv.TenantId, 'KINDER_CARE_HUB_MESSAGING');
  if (!ent.IsAllowed) return { allowed: false, reason: 'feature-disabled:' + ent.Reason };
  return { allowed: true, reason: 'ok', conversation: conv, participant: access.participant };
}

// CanUserUploadImage (Task 32).
async function canUserUploadImage(req, conversationId) {
  const access = await canUserAccessConversation(req, conversationId);
  if (!access.allowed) return { allowed: false, reason: access.reason };
  if (!access.participant.CanUploadImage) return { allowed: false, reason: 'cannot-upload-image' };
  // Broadcasts: blocked unless DevForge has explicit permission.
  if (access.conversation.IsBroadcast && !req.sessionContext.IsDevForgeUser) {
    return { allowed: false, reason: 'broadcast-image-upload-blocked' };
  }
  const ent = await canTenantUseFeature(access.conversation.TenantId, 'KINDER_CARE_HUB_IMAGE_MESSAGING');
  if (!ent.IsAllowed) return { allowed: false, reason: 'feature-disabled:' + ent.Reason };
  return { allowed: true, reason: 'ok' };
}

module.exports = {
  validateActiveTenantAccess,
  canUserAccessConversation,
  canUserSendMessage,
  canUserUploadImage
};
