'use strict';

// Parent messaging service for the SSR portal.
// Wraps MessagingService and normalizes the user object (camelCase req.user
// from middleware vs PascalCase user object expected by MessagingService).

const { MessagingService } = require('./messagingService');

function toPascal(user) {
  return {
    UserID: user.id,
    Email: user.email,
    Role: user.role,
    FirstName: user.firstName,
    LastName: user.lastName,
    SchoolID: user.schoolId
  };
}

class ParentMessagingService {
  constructor() {
    this.inner = new MessagingService();
  }

  async listConversations(user, request) {
    return this.inner.listParentConversations(toPascal(user), request || {});
  }

  async getMessages(user, conversationId) {
    return this.inner.getParentMessages(toPascal(user), conversationId);
  }

  async sendNew(user, body) {
    return this.inner.sendFromParent(toPascal(user), body || {});
  }

  async reply(user, conversationId, body) {
    return this.inner.replyFromParent(toPascal(user), conversationId, body || {});
  }
}

module.exports = ParentMessagingService;
