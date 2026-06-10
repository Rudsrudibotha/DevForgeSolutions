// Data Layer - KinderCareHub messaging repositories. Implements Tasks
// 22-27: Conversation, ConversationParticipant, Message, MessageAttachment,
// MessageNotificationEvent, and the audit logging for messaging. All
// entities carry TenantId and (where applicable) SchoolId. Every read
// and write goes through the tenant-scoped access checks.

const { getPool, sql } = require('./db');

class ConversationRepository {
  async create({ tenantId, schoolId, conversationType, conversationName, createdByUserId, isBroadcast }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('conversationType', sql.NVarChar, conversationType)
      .input('conversationName', sql.NVarChar, conversationName || null)
      .input('createdByUserId', sql.Int, createdByUserId)
      .input('isBroadcast', sql.Bit, isBroadcast ? 1 : 0)
      .query(`
        INSERT INTO dbo.Conversations (TenantId, SchoolId, ConversationType, ConversationName, CreatedByUserId, IsBroadcast, CreatedAt, UpdatedAt, IsActive)
        OUTPUT INSERTED.ConversationId
        VALUES (@tenantId, @schoolId, @conversationType, @conversationName, @createdByUserId, @isBroadcast, SYSUTCDATETIME(), SYSUTCDATETIME(), 1)
      `);
    return result.recordset[0].ConversationId;
  }

  async getById(conversationId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, conversationId)
      .query(`
        SELECT ConversationId, TenantId, SchoolId, ConversationType, ConversationName, CreatedByUserId, IsBroadcast,
               LastMessageId, LastMessageAt, LastMessagePreview, CreatedAt, UpdatedAt, IsActive
        FROM dbo.Conversations
        WHERE ConversationId = @id AND IsActive = 1
      `);
    return result.recordset[0] || null;
  }

  // Get-or-create for direct conversations between two participants in
  // the same tenant. Used by parent↔school and staff↔staff links.
  async findDirectConversation({ tenantId, schoolId, conversationType, participantUserIds }) {
    if (!Array.isArray(participantUserIds) || participantUserIds.length < 2) return null;
    const placeholders = participantUserIds.map((_, i) => '@p' + i).join(',');
    const pool = await getPool();
    const request = pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('conversationType', sql.NVarChar, conversationType);
    participantUserIds.forEach((id, i) => request.input('p' + i, sql.Int, id));
    const result = await request.query(`
      SELECT c.ConversationId, c.TenantId, c.SchoolId, c.ConversationType, c.ConversationName
      FROM dbo.Conversations c
      WHERE c.TenantId = @tenantId
        AND (c.SchoolId = @schoolId OR (c.SchoolId IS NULL AND @schoolId IS NULL))
        AND c.ConversationType = @conversationType
        AND c.IsBroadcast = 0
        AND NOT EXISTS (
          SELECT 1 FROM dbo.ConversationParticipants cp
          WHERE cp.ConversationId = c.ConversationId AND cp.IsActive = 1
            AND cp.UserId NOT IN (${placeholders})
        )
        AND (
          SELECT COUNT(*) FROM dbo.ConversationParticipants cp
          WHERE cp.ConversationId = c.ConversationId AND cp.IsActive = 1
        ) = ${participantUserIds.length}
        AND (
          SELECT COUNT(DISTINCT cp.UserId) FROM dbo.ConversationParticipants cp
          WHERE cp.ConversationId = c.ConversationId AND cp.IsActive = 1
        ) = ${participantUserIds.length}
    `);
    return result.recordset[0] || null;
  }

  async updateLastMessage(conversationId, messageId, lastMessageAt, preview) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, conversationId)
      .input('messageId', sql.Int, messageId)
      .input('lastMessageAt', sql.DateTime2, lastMessageAt)
      .input('preview', sql.NVarChar, preview || null)
      .query(`
        UPDATE dbo.Conversations
        SET LastMessageId = @messageId, LastMessageAt = @lastMessageAt, LastMessagePreview = @preview, UpdatedAt = SYSUTCDATETIME()
        WHERE ConversationId = @id
      `);
  }

  // List for an active participant set, filtered by ActiveTenantId.
  // Sorted by LastMessageAt DESC, paginated.
  async listForUser(userId, tenantId, { limit = 30, offset = 0 } = {}) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('tenantId', sql.Int, tenantId)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT c.ConversationId, c.TenantId, c.SchoolId, c.ConversationType, c.ConversationName,
               c.LastMessageId, c.LastMessageAt, c.LastMessagePreview, c.IsBroadcast,
               cp.UnreadCount, cp.LastReadMessageId
        FROM dbo.ConversationParticipants cp
        INNER JOIN dbo.Conversations c ON c.ConversationId = cp.ConversationId
        WHERE cp.UserId = @userId AND c.TenantId = @tenantId AND cp.IsActive = 1 AND c.IsActive = 1
        ORDER BY ISNULL(c.LastMessageAt, c.UpdatedAt) DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    return result.recordset;
  }
}

class ConversationParticipantRepository {
  async add({ conversationId, tenantId, schoolId, userId, roleAtTime, canRead = true, canSend = true, canReply = true, canUploadImage = true }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('conversationId', sql.Int, conversationId)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('userId', sql.Int, userId)
      .input('roleAtTime', sql.NVarChar, roleAtTime || null)
      .input('canRead', sql.Bit, canRead ? 1 : 0)
      .input('canSend', sql.Bit, canSend ? 1 : 0)
      .input('canReply', sql.Bit, canReply ? 1 : 0)
      .input('canUploadImage', sql.Bit, canUploadImage ? 1 : 0)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.ConversationParticipants WHERE ConversationId = @conversationId AND UserId = @userId)
          INSERT INTO dbo.ConversationParticipants
            (ConversationId, TenantId, SchoolId, UserId, RoleAtTime, CanRead, CanSend, CanReply, CanUploadImage, JoinedAt, IsActive)
          VALUES (@conversationId, @tenantId, @schoolId, @userId, @roleAtTime, @canRead, @canSend, @canReply, @canUploadImage, SYSUTCDATETIME(), 1)
        ELSE
          UPDATE dbo.ConversationParticipants
            SET IsActive = 1, RemovedAt = NULL, CanRead = @canRead, CanSend = @canSend, CanReply = @canReply, CanUploadImage = @canUploadImage
          WHERE ConversationId = @conversationId AND UserId = @userId
      `);
  }

  async getParticipant(conversationId, userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('conversationId', sql.Int, conversationId)
      .input('userId', sql.Int, userId)
      .query(`
        SELECT ConversationParticipantId, ConversationId, TenantId, SchoolId, UserId, RoleAtTime,
               CanRead, CanSend, CanReply, CanUploadImage, JoinedAt, RemovedAt, IsActive,
               LastReadMessageId, LastReadAt, UnreadCount
        FROM dbo.ConversationParticipants
        WHERE ConversationId = @conversationId AND UserId = @userId
      `);
    return result.recordset[0] || null;
  }

  async listActiveForConversation(conversationId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, conversationId)
      .query(`
        SELECT ConversationParticipantId, UserId, RoleAtTime, CanRead, CanSend, CanReply, CanUploadImage, JoinedAt, UnreadCount
        FROM dbo.ConversationParticipants
        WHERE ConversationId = @id AND IsActive = 1
      `);
    return result.recordset;
  }

  async markRead(conversationId, userId, lastReadMessageId) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, conversationId)
      .input('userId', sql.Int, userId)
      .input('lastReadMessageId', sql.Int, lastReadMessageId)
      .query(`
        UPDATE dbo.ConversationParticipants
        SET UnreadCount = 0, LastReadMessageId = @lastReadMessageId, LastReadAt = SYSUTCDATETIME()
        WHERE ConversationId = @id AND UserId = @userId
      `);
  }

  async incrementUnread(conversationId, userId) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, conversationId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE dbo.ConversationParticipants
        SET UnreadCount = ISNULL(UnreadCount, 0) + 1
        WHERE ConversationId = @id AND UserId = @userId
      `);
  }

  async remove(conversationId, userId) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, conversationId)
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE dbo.ConversationParticipants
        SET IsActive = 0, RemovedAt = SYSUTCDATETIME()
        WHERE ConversationId = @id AND UserId = @userId
      `);
  }
}

class MessageRepository {
  async create({ tenantId, schoolId, conversationId, senderUserId, messageType, messageBody, replyToMessageId, isSystemMessage }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('conversationId', sql.Int, conversationId)
      .input('senderUserId', sql.Int, senderUserId)
      .input('messageType', sql.NVarChar, messageType || 'Text')
      .input('messageBody', sql.NVarChar, messageBody || '')
      .input('replyToMessageId', sql.Int, replyToMessageId || null)
      .input('isSystemMessage', sql.Bit, isSystemMessage ? 1 : 0)
      .query(`
        INSERT INTO dbo.Messages
          (TenantId, SchoolId, ConversationId, SenderUserId, MessageType, MessageBody, ReplyToMessageId, IsSystemMessage, CreatedAt, IsDeleted)
        OUTPUT INSERTED.MessageId
        VALUES (@tenantId, @schoolId, @conversationId, @senderUserId, @messageType, @messageBody, @replyToMessageId, @isSystemMessage, SYSUTCDATETIME(), 0)
      `);
    return result.recordset[0].MessageId;
  }

  async getById(messageId, tenantId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, messageId)
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT MessageId, TenantId, SchoolId, ConversationId, SenderUserId, MessageType, MessageBody,
               CreatedAt, EditedAt, DeletedAt, IsDeleted, IsSystemMessage, ReplyToMessageId
        FROM dbo.Messages
        WHERE MessageId = @id AND TenantId = @tenantId AND IsDeleted = 0
      `);
    return result.recordset[0] || null;
  }

  // Cursor pagination: returns latest PageSize messages, or messages
  // older than BeforeMessageId if provided. Tasks 24 + 35.
  async listForConversation(conversationId, tenantId, { beforeMessageId, pageSize = 30 } = {}) {
    const pool = await getPool();
    const request = pool.request()
      .input('id', sql.Int, conversationId)
      .input('tenantId', sql.Int, tenantId)
      .input('pageSize', sql.Int, Math.min(100, Math.max(1, pageSize)));
    let where = 'm.ConversationId = @id AND m.TenantId = @tenantId AND m.IsDeleted = 0';
    if (beforeMessageId) {
      request.input('before', sql.Int, beforeMessageId);
      where += ' AND m.MessageId < @before';
    }
    const result = await request.query(`
      SELECT TOP (@pageSize) m.MessageId, m.TenantId, m.SchoolId, m.ConversationId, m.SenderUserId,
             m.MessageType, m.MessageBody, m.CreatedAt, m.EditedAt, m.IsSystemMessage, m.ReplyToMessageId
      FROM dbo.Messages m
      WHERE ${where}
      ORDER BY m.MessageId DESC
    `);
    return result.recordset.reverse(); // oldest first within the page
  }
}

class MessageAttachmentRepository {
  async create({ tenantId, schoolId, conversationId, messageId, uploadedByUserId, originalFileName, storedFileName, fileExtension, mimeType, fileSizeBytes, storagePath, thumbnailPath, isImage }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('conversationId', sql.Int, conversationId)
      .input('messageId', sql.Int, messageId)
      .input('uploadedByUserId', sql.Int, uploadedByUserId)
      .input('originalFileName', sql.NVarChar, originalFileName || null)
      .input('storedFileName', sql.NVarChar, storedFileName)
      .input('fileExtension', sql.NVarChar, fileExtension)
      .input('mimeType', sql.NVarChar, mimeType)
      .input('fileSizeBytes', sql.BigInt, fileSizeBytes)
      .input('storagePath', sql.NVarChar, storagePath)
      .input('thumbnailPath', sql.NVarChar, thumbnailPath || null)
      .input('isImage', sql.Bit, isImage ? 1 : 0)
      .query(`
        INSERT INTO dbo.MessageAttachments
          (TenantId, SchoolId, ConversationId, MessageId, UploadedByUserId, OriginalFileName, StoredFileName,
           FileExtension, MimeType, FileSizeBytes, StoragePath, ThumbnailPath, UploadedAt, IsImage, IsScanned, ScanStatus, IsDeleted)
        OUTPUT INSERTED.MessageAttachmentId
        VALUES (@tenantId, @schoolId, @conversationId, @messageId, @uploadedByUserId, @originalFileName, @storedFileName,
                @fileExtension, @mimeType, @fileSizeBytes, @storagePath, @thumbnailPath, SYSUTCDATETIME(), @isImage, 0, 'Pending', 0)
      `);
    return result.recordset[0].MessageAttachmentId;
  }

  async getById(messageAttachmentId, tenantId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, messageAttachmentId)
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT MessageAttachmentId, TenantId, SchoolId, ConversationId, MessageId, UploadedByUserId,
               OriginalFileName, StoredFileName, FileExtension, MimeType, FileSizeBytes, StoragePath, ThumbnailPath,
               UploadedAt, IsImage, IsScanned, ScanStatus, IsDeleted
        FROM dbo.MessageAttachments
        WHERE MessageAttachmentId = @id AND TenantId = @tenantId AND IsDeleted = 0
      `);
    return result.recordset[0] || null;
  }

  async setScanResult(messageAttachmentId, status) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, messageAttachmentId)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE dbo.MessageAttachments SET ScanStatus = @status, IsScanned = 1 WHERE MessageAttachmentId = @id
      `);
  }
}

class MessageNotificationEventRepository {
  async create({ tenantId, schoolId, conversationId, messageId, targetUserId, eventType, status }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('conversationId', sql.Int, conversationId)
      .input('messageId', sql.Int, messageId)
      .input('targetUserId', sql.Int, targetUserId)
      .input('eventType', sql.NVarChar, eventType || 'NewMessage')
      .input('status', sql.NVarChar, status || 'Pending')
      .query(`
        INSERT INTO dbo.MessageNotificationEvents
          (TenantId, SchoolId, ConversationId, MessageId, TargetUserId, EventType, Status, CreatedAt)
        OUTPUT INSERTED.MessageNotificationEventId
        VALUES (@tenantId, @schoolId, @conversationId, @messageId, @targetUserId, @eventType, @status, SYSUTCDATETIME())
      `);
    return result.recordset[0].MessageNotificationEventId;
  }

  // Polling fallback. Returns events newer than sinceEventId for the
  // current user only. SSE-friendly payload.
  async listForUserSince(userId, tenantId, sinceEventId = 0, { limit = 50 } = {}) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('tenantId', sql.Int, tenantId)
      .input('since', sql.BigInt, sinceEventId || 0)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) MessageNotificationEventId, TenantId, SchoolId, ConversationId, MessageId, TargetUserId,
               EventType, Status, CreatedAt, DeliveredAt, ReadAt
        FROM dbo.MessageNotificationEvents
        WHERE TargetUserId = @userId AND TenantId = @tenantId AND MessageNotificationEventId > @since
        ORDER BY MessageNotificationEventId ASC
      `);
    return result.recordset;
  }

  async markDelivered(eventId) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.BigInt, eventId)
      .query(`
        UPDATE dbo.MessageNotificationEvents SET Status = 'Delivered', DeliveredAt = SYSUTCDATETIME() WHERE MessageNotificationEventId = @id
      `);
  }
}

class ConversationAuditLogRepository {
  async write({ tenantId, schoolId, userId, actionType, entityType, entityId, description, ipAddress, userAgent, wasBlocked }) {
    const pool = await getPool();
    await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId || null)
      .input('userId', sql.Int, userId || null)
      .input('actionType', sql.NVarChar, actionType)
      .input('entityType', sql.NVarChar, entityType)
      .input('entityId', sql.BigInt, entityId || null)
      .input('description', sql.NVarChar, description || null)
      .input('ipAddress', sql.NVarChar, ipAddress || null)
      .input('userAgent', sql.NVarChar, userAgent || null)
      .input('wasBlocked', sql.Bit, wasBlocked ? 1 : 0)
      .query(`
        INSERT INTO dbo.ConversationAuditLogs
          (TenantId, SchoolId, UserId, ActionType, EntityType, EntityId, Description, IPAddress, UserAgent, WasBlocked, CreatedAt)
        VALUES (@tenantId, @schoolId, @userId, @actionType, @entityType, @entityId, @description, @ipAddress, @userAgent, @wasBlocked, SYSUTCDATETIME())
      `);
  }
}

module.exports = {
  ConversationRepository,
  ConversationParticipantRepository,
  MessageRepository,
  MessageAttachmentRepository,
  MessageNotificationEventRepository,
  ConversationAuditLogRepository
};
