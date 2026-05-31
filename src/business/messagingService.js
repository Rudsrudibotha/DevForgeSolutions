// Business Layer - Messaging rules and conversation workflows.

const MessagingRepository = require('../data/messagingRepository');
const { MessagingPackageService } = require('./messagingPackageService');

const SCHOOL_TARGET_TYPES = ['class', 'entire_school', 'outstanding_fees', 'selected_families'];
const MAX_MESSAGE_LENGTH = 5000;
const MAX_SUBJECT_LENGTH = 200;

class MessagingService {
  constructor(dependencies = {}) {
    this.messagingRepository = dependencies.messagingRepository || new MessagingRepository();
    this.messagingPackageService = dependencies.messagingPackageService || new MessagingPackageService();
  }

  async previewTargets(user, request = {}) {
    const school = await this.messagingPackageService.resolveSchoolForUser(user, request.schoolId);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);

    if (!['admin', 'school'].includes(user.Role)) {
      throw new Error('Only schools can preview messaging targets');
    }

    const targetType = this.schoolTargetType(request.targetType);
    const families = await this.resolveSchoolTargets(status.schoolId, targetType, request);

    return {
      targetType,
      schoolId: status.schoolId,
      recipientFamilyCount: families.length,
      families: families.map((family) => this.targetSummary(family))
    };
  }

  async sendFromSchool(user, request = {}) {
    const school = await this.messagingPackageService.resolveSchoolForUser(user, request.schoolId);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);

    if (!['admin', 'school'].includes(user.Role)) {
      throw new Error('Only schools can send school messaging broadcasts');
    }

    const targetType = this.schoolTargetType(request.targetType);
    const body = this.requiredString(request.body || request.message, 'Message', MAX_MESSAGE_LENGTH);
    const subject = this.subject(request.subject, targetType);
    const families = await this.resolveSchoolTargets(status.schoolId, targetType, request);

    if (!families.length) {
      throw new Error('No parent families matched the selected messaging target');
    }

    const conversations = [];
    for (const family of families) {
      const conversation = await this.messagingRepository.createConversation({
        schoolId: status.schoolId,
        familyId: family.FamilyID,
        subject,
        targetType,
        createdByUserId: user.UserID
      });
      await this.messagingRepository.createMessage({
        conversationId: conversation.ConversationID,
        schoolId: status.schoolId,
        familyId: family.FamilyID,
        senderUserId: user.UserID,
        senderRole: user.Role,
        body
      });
      conversations.push({
        conversationId: conversation.ConversationID,
        familyId: family.FamilyID,
        familyName: family.FamilyName
      });
    }

    return {
      sent: true,
      targetType,
      schoolId: status.schoolId,
      recipientFamilyCount: conversations.length,
      conversations
    };
  }

  async sendFromParent(user, request = {}) {
    if (user.Role !== 'parent') {
      throw new Error('Only parents can use the parent messaging route');
    }

    if (request.targetType && String(request.targetType).trim().toLowerCase() !== 'school') {
      throw new Error('Parents can only message the school');
    }

    const school = await this.messagingPackageService.resolveSchoolForUser(user, request.schoolId);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);

    const body = this.requiredString(request.body || request.message, 'Message', MAX_MESSAGE_LENGTH);
    const subject = this.subject(request.subject, 'school');
    const family = await this.parentFamilyForMessage(user, status.schoolId, request.familyId);

    const conversation = await this.messagingRepository.createConversation({
      schoolId: status.schoolId,
      familyId: family.FamilyID,
      subject,
      targetType: 'ParentSchool',
      createdByUserId: user.UserID
    });
    await this.messagingRepository.createMessage({
      conversationId: conversation.ConversationID,
      schoolId: status.schoolId,
      familyId: family.FamilyID,
      senderUserId: user.UserID,
      senderRole: user.Role,
      body
    });

    return {
      sent: true,
      targetType: 'school',
      schoolId: status.schoolId,
      conversationId: conversation.ConversationID,
      familyId: family.FamilyID
    };
  }

  async listSchoolConversations(user, request = {}) {
    const school = await this.messagingPackageService.resolveSchoolForUser(user, request.schoolId);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);

    if (!['admin', 'school'].includes(user.Role)) {
      throw new Error('Only schools can view school messaging conversations');
    }

    return await this.messagingRepository.listConversationsForSchool(status.schoolId);
  }

  async listParentConversations(user, request = {}) {
    if (user.Role !== 'parent') {
      throw new Error('Only parents can view parent messaging conversations');
    }

    const school = await this.messagingPackageService.resolveSchoolForUser(user, request.schoolId);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);

    return await this.messagingRepository.listConversationsForParent(user.UserID, status.schoolId);
  }

  async getSchoolMessages(user, conversationId) {
    const conversation = await this.requiredConversation(conversationId);
    const school = await this.messagingPackageService.resolveSchoolForUser(user, conversation.SchoolID);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);

    if (!['admin', 'school'].includes(user.Role)) {
      throw new Error('Only schools can view this conversation');
    }

    return await this.messagesResponse(conversation);
  }

  async getParentMessages(user, conversationId) {
    const conversation = await this.requiredConversation(conversationId);
    const school = await this.messagingPackageService.resolveSchoolForUser(user, conversation.SchoolID);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);
    await this.requireParentLinkedToFamily(user, conversation.SchoolID, conversation.FamilyID);

    return await this.messagesResponse(conversation);
  }

  async replyFromSchool(user, conversationId, request = {}) {
    const conversation = await this.requiredConversation(conversationId);
    const school = await this.messagingPackageService.resolveSchoolForUser(user, conversation.SchoolID);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);

    if (!['admin', 'school'].includes(user.Role)) {
      throw new Error('Only schools can reply to school messaging conversations');
    }

    return await this.reply(conversation, user, request);
  }

  async replyFromParent(user, conversationId, request = {}) {
    if (user.Role !== 'parent') {
      throw new Error('Only parents can reply on the parent messaging route');
    }

    const conversation = await this.requiredConversation(conversationId);
    const school = await this.messagingPackageService.resolveSchoolForUser(user, conversation.SchoolID);
    const status = this.messagingPackageService.statusForSchool(school);
    this.requireActivePackage(status);
    await this.requireParentLinkedToFamily(user, conversation.SchoolID, conversation.FamilyID);

    return await this.reply(conversation, user, request);
  }

  async reply(conversation, user, request) {
    const body = this.requiredString(request.body || request.message, 'Message', MAX_MESSAGE_LENGTH);
    const message = await this.messagingRepository.createMessage({
      conversationId: conversation.ConversationID,
      schoolId: conversation.SchoolID,
      familyId: conversation.FamilyID,
      senderUserId: user.UserID,
      senderRole: user.Role,
      body
    });

    return {
      sent: true,
      conversationId: conversation.ConversationID,
      messageId: message.MessageID
    };
  }

  async messagesResponse(conversation) {
    const messages = await this.messagingRepository.getMessages(conversation.ConversationID);

    return {
      conversation,
      messages
    };
  }

  async resolveSchoolTargets(schoolId, targetType, request) {
    if (targetType === 'class') {
      const className = this.requiredString(request.className, 'Class name', 100);
      return await this.messagingRepository.getFamiliesForClass(schoolId, className);
    }

    if (targetType === 'entire_school') {
      return await this.messagingRepository.getFamiliesForEntireSchool(schoolId);
    }

    if (targetType === 'outstanding_fees') {
      return await this.messagingRepository.getFamiliesWithOutstandingFees(schoolId);
    }

    const familyIds = this.familyIds(request.familyIds);
    const families = await this.messagingRepository.getFamiliesByIds(schoolId, familyIds);

    if (families.length !== familyIds.length) {
      throw new Error('Selected families must belong to the school');
    }

    return families;
  }

  async parentFamilyForMessage(user, schoolId, requestedFamilyId) {
    const families = await this.messagingRepository.getParentFamilies(user.UserID, schoolId);

    if (!families.length) {
      throw new Error('Parent is not linked to this school');
    }

    if (requestedFamilyId) {
      const familyId = this.positiveInteger(requestedFamilyId, 'Family ID');
      const family = families.find((item) => Number(item.FamilyID) === familyId);

      if (!family) {
        throw new Error('Parent can only message the school for their linked family');
      }

      return family;
    }

    if (families.length > 1) {
      throw new Error('Family ID is required when a parent is linked to multiple families');
    }

    return families[0];
  }

  async requireParentLinkedToFamily(user, schoolId, familyId) {
    const families = await this.messagingRepository.getParentFamilies(user.UserID, schoolId);
    const linked = families.some((family) => Number(family.FamilyID) === Number(familyId));

    if (!linked) {
      throw new Error('Parent cannot access another family conversation');
    }
  }

  async requiredConversation(conversationId) {
    const id = this.positiveInteger(conversationId, 'Conversation ID');
    const conversation = await this.messagingRepository.getConversationById(id);

    if (!conversation) {
      throw new Error('Messaging conversation not found');
    }

    return conversation;
  }

  schoolTargetType(value) {
    const targetType = String(value || '').trim().toLowerCase();

    if (!SCHOOL_TARGET_TYPES.includes(targetType)) {
      throw new Error(`School messaging target must be one of: ${SCHOOL_TARGET_TYPES.join(', ')}`);
    }

    return targetType;
  }

  subject(value, targetType) {
    const fallback = targetType === 'school' ? 'Message to school' : 'School message';
    return this.optionalString(value, 'Subject', MAX_SUBJECT_LENGTH) || fallback;
  }

  familyIds(values) {
    const ids = [...new Set((Array.isArray(values) ? values : [values])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0))];

    if (!ids.length) {
      throw new Error('At least one family must be selected');
    }

    if (ids.length > 500) {
      throw new Error('Selected family messages are limited to 500 families at once');
    }

    return ids;
  }

  targetSummary(family) {
    return {
      familyId: family.FamilyID,
      familyName: family.FamilyName,
      primaryParentName: family.PrimaryParentName,
      primaryParentEmail: family.PrimaryParentEmail,
      secondaryParentName: family.SecondaryParentName,
      secondaryParentEmail: family.SecondaryParentEmail,
      totalOutstanding: family.TotalOutstanding
    };
  }

  requireActivePackage(status) {
    if (!status.active) {
      const error = new Error(status.reason);
      error.statusCode = 403;
      throw error;
    }
  }

  requiredString(value, label, maxLength) {
    const cleaned = this.optionalString(value, label, maxLength);

    if (!cleaned) {
      throw new Error(`${label} is required`);
    }

    return cleaned;
  }

  optionalString(value, label, maxLength) {
    if (value === undefined || value === null) {
      return null;
    }

    const cleaned = String(value).trim();

    if (cleaned.length > maxLength) {
      throw new Error(`${label} must be ${maxLength} characters or less`);
    }

    return cleaned || null;
  }

  positiveInteger(value, label) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }

    return parsed;
  }
}

module.exports = {
  SCHOOL_TARGET_TYPES,
  MessagingService
};
