// Data Layer - Messaging conversations, targets, and messages.

const { getPool, sql } = require('./db');

class MessagingRepository {
  constructor() {
    this.schemaEnsured = false;
  }

  async ensureMessagingSchema() {
    if (this.schemaEnsured) return;
    const pool = await getPool();
    await pool.request().query(`
      IF COL_LENGTH('dbo.MessagingConversations', 'FamilyID') IS NOT NULL
        ALTER TABLE dbo.MessagingConversations ALTER COLUMN FamilyID INT NULL;
      IF COL_LENGTH('dbo.MessagingMessages', 'FamilyID') IS NOT NULL
        ALTER TABLE dbo.MessagingMessages ALTER COLUMN FamilyID INT NULL;

      IF COL_LENGTH('dbo.MessagingConversations', 'ConversationType') IS NULL
        ALTER TABLE dbo.MessagingConversations ADD ConversationType NVARCHAR(50) NOT NULL CONSTRAINT DF_MessagingConversations_ConversationType DEFAULT 'ParentSchool' WITH VALUES;
      IF COL_LENGTH('dbo.MessagingConversations', 'RecipientUserID') IS NULL
        ALTER TABLE dbo.MessagingConversations ADD RecipientUserID INT NULL;
      IF COL_LENGTH('dbo.MessagingConversations', 'ChannelKey') IS NULL
        ALTER TABLE dbo.MessagingConversations ADD ChannelKey NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.MessagingMessages', 'RecipientUserID') IS NULL
        ALTER TABLE dbo.MessagingMessages ADD RecipientUserID INT NULL;

      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_MessagingConversations_TargetType')
        ALTER TABLE dbo.MessagingConversations DROP CONSTRAINT CK_MessagingConversations_TargetType;
      ALTER TABLE dbo.MessagingConversations WITH CHECK ADD CONSTRAINT CK_MessagingConversations_TargetType
        CHECK (TargetType IN ('ParentSchool','class','entire_school','outstanding_fees','selected_families','StaffDirect','SchoolDevForge','KinderCareHubParents','KinderCareHubSchools','DevForgeSchool','DevForgeParents'));

      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_MessagingMessages_SenderRole')
        ALTER TABLE dbo.MessagingMessages DROP CONSTRAINT CK_MessagingMessages_SenderRole;
      ALTER TABLE dbo.MessagingMessages WITH CHECK ADD CONSTRAINT CK_MessagingMessages_SenderRole
        CHECK (SenderRole IN ('admin','devforge','school','parent'));

      IF OBJECT_ID('dbo.MessagingNotifications', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.MessagingNotifications (
          NotificationID INT IDENTITY(1,1) PRIMARY KEY,
          UserID INT NOT NULL,
          ConversationID INT NOT NULL,
          MessageID INT NOT NULL,
          SchoolID INT NULL,
          FamilyID INT NULL,
          IsRead BIT NOT NULL DEFAULT 0,
          CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
          ReadDate DATETIME NULL,
          CONSTRAINT FK_MessagingNotifications_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
          CONSTRAINT FK_MessagingNotifications_Conversations FOREIGN KEY (ConversationID) REFERENCES dbo.MessagingConversations(ConversationID),
          CONSTRAINT FK_MessagingNotifications_Messages FOREIGN KEY (MessageID) REFERENCES dbo.MessagingMessages(MessageID)
        );
      END;

      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MessagingNotifications_User_Unread' AND object_id = OBJECT_ID('dbo.MessagingNotifications'))
        CREATE INDEX IX_MessagingNotifications_User_Unread ON dbo.MessagingNotifications(UserID, IsRead, CreatedDate DESC);
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MessagingConversations_ChannelKey' AND object_id = OBJECT_ID('dbo.MessagingConversations'))
        CREATE INDEX IX_MessagingConversations_ChannelKey ON dbo.MessagingConversations(ChannelKey);
    `);
    this.schemaEnsured = true;
  }

  async getFamiliesForEntireSchool(schoolId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT DISTINCT ${this.familyColumns()}
              FROM Families f
              WHERE f.SchoolID = @schoolId
                AND EXISTS (
                  SELECT 1
                  FROM Students s
                  WHERE s.FamilyID = f.FamilyID
                    AND s.SchoolID = f.SchoolID
                    AND s.IsActive = 1
                )
              ORDER BY f.FamilyName`);
    return result.recordset;
  }

  async getFamiliesForClass(schoolId, className) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('className', sql.NVarChar, className)
      .query(`SELECT DISTINCT ${this.familyColumns()}
              FROM Families f
              WHERE f.SchoolID = @schoolId
                AND EXISTS (
                  SELECT 1
                  FROM Students s
                  WHERE s.FamilyID = f.FamilyID
                    AND s.SchoolID = f.SchoolID
                    AND s.IsActive = 1
                    AND s.ClassName = @className
                )
              ORDER BY f.FamilyName`);
    return result.recordset;
  }

  async getFamiliesWithOutstandingFees(schoolId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT ${this.familyColumns()},
                SUM(i.Amount - ISNULL(i.AmountPaid, 0)) AS TotalOutstanding
              FROM Families f
              INNER JOIN Students s ON s.FamilyID = f.FamilyID AND s.SchoolID = f.SchoolID
              INNER JOIN Invoices i ON i.StudentID = s.StudentID AND i.SchoolID = s.SchoolID
              WHERE f.SchoolID = @schoolId
                AND s.IsActive = 1
                AND i.IsDeleted = 0
                AND i.Status <> 'Paid'
                AND i.Status <> 'Cancelled'
              GROUP BY f.FamilyID, f.SchoolID, f.FamilyName, f.PrimaryParentName, f.PrimaryParentEmail,
                f.SecondaryParentName, f.SecondaryParentEmail
              HAVING SUM(i.Amount - ISNULL(i.AmountPaid, 0)) > 0
              ORDER BY f.FamilyName`);
    return result.recordset;
  }

  async getFamiliesByIds(schoolId, familyIds) {
    await this.ensureMessagingSchema();
    const ids = this.cleanIds(familyIds);
    if (!ids.length) {
      return [];
    }

    const pool = await getPool();
    const request = pool.request().input('schoolId', sql.Int, schoolId);
    const placeholders = ids.map((id, index) => {
      request.input(`familyId${index}`, sql.Int, id);
      return `@familyId${index}`;
    });

    const result = await request.query(`SELECT DISTINCT ${this.familyColumns()}
              FROM Families f
              WHERE f.SchoolID = @schoolId
                AND f.FamilyID IN (${placeholders.join(', ')})
              ORDER BY f.FamilyName`);
    return result.recordset;
  }

  async getParentFamilies(userId, schoolId = null) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const request = pool.request().input('userId', sql.Int, userId);
    let schoolClause = '';

    if (schoolId) {
      request.input('schoolId', sql.Int, schoolId);
      schoolClause = 'AND pl.SchoolID = @schoolId';
    }

    const result = await request.query(`SELECT DISTINCT ${this.familyColumns()}
              FROM Families f
              INNER JOIN ParentLinks pl ON pl.FamilyID = f.FamilyID AND pl.SchoolID = f.SchoolID
              INNER JOIN Schools s ON s.SchoolID = pl.SchoolID
              WHERE pl.UserID = @userId
                ${schoolClause}
                AND s.SubscriptionStatus = 'Active'
              ORDER BY f.FamilyName`);
    return result.recordset;
  }

  async createConversation(data) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('familyId', sql.Int, data.familyId || null)
      .input('subject', sql.NVarChar, data.subject)
      .input('targetType', sql.NVarChar, data.targetType)
      .input('conversationType', sql.NVarChar, data.conversationType || data.targetType || 'ParentSchool')
      .input('recipientUserId', sql.Int, data.recipientUserId || null)
      .input('channelKey', sql.NVarChar, data.channelKey || null)
      .input('createdByUserId', sql.Int, data.createdByUserId)
      .query(`INSERT INTO MessagingConversations (
                SchoolID, FamilyID, Subject, TargetType, ConversationType, RecipientUserID, ChannelKey, CreatedByUserID
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @familyId, @subject, @targetType, @conversationType, @recipientUserId, @channelKey, @createdByUserId
              )`);
    return result.recordset[0];
  }

  async createMessage(data) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('conversationId', sql.Int, data.conversationId)
      .input('schoolId', sql.Int, data.schoolId)
      .input('familyId', sql.Int, data.familyId || null)
      .input('recipientUserId', sql.Int, data.recipientUserId || null)
      .input('senderUserId', sql.Int, data.senderUserId)
      .input('senderRole', sql.NVarChar, data.senderRole)
      .input('body', sql.NVarChar(sql.MAX), data.body)
      .query(`INSERT INTO MessagingMessages (
                ConversationID, SchoolID, FamilyID, RecipientUserID, SenderUserID, SenderRole, Body
              )
              OUTPUT INSERTED.*
              VALUES (
                @conversationId, @schoolId, @familyId, @recipientUserId, @senderUserId, @senderRole, @body
              );

              UPDATE MessagingConversations
              SET LastMessageDate = GETDATE(), UpdatedDate = GETDATE()
              WHERE ConversationID = @conversationId;`);
    return result.recordset[0];
  }

  async getConversationById(conversationId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('conversationId', sql.Int, conversationId)
      .query(`SELECT mc.*, f.FamilyName, s.SchoolName,
                recipient.Username AS RecipientUsername, recipient.Email AS RecipientEmail
              FROM MessagingConversations mc
              LEFT JOIN Families f ON f.FamilyID = mc.FamilyID AND f.SchoolID = mc.SchoolID
              INNER JOIN Schools s ON s.SchoolID = mc.SchoolID
              LEFT JOIN Users recipient ON recipient.UserID = mc.RecipientUserID
              WHERE mc.ConversationID = @conversationId`);
    return result.recordset[0];
  }

  async listConversationsForSchool(schoolId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT mc.*, f.FamilyName, f.PrimaryParentName, f.PrimaryParentEmail,
                recipient.Username AS RecipientUsername, recipient.Email AS RecipientEmail,
                lastMessage.Body AS LastMessageBody, lastMessage.SenderRole AS LastMessageSenderRole
              FROM MessagingConversations mc
              LEFT JOIN Families f ON f.FamilyID = mc.FamilyID AND f.SchoolID = mc.SchoolID
              LEFT JOIN Users recipient ON recipient.UserID = mc.RecipientUserID
              OUTER APPLY (
                SELECT TOP 1 Body, SenderRole
                FROM MessagingMessages mm
                WHERE mm.ConversationID = mc.ConversationID
                ORDER BY mm.CreatedDate DESC, mm.MessageID DESC
              ) lastMessage
              WHERE mc.SchoolID = @schoolId
              ORDER BY mc.LastMessageDate DESC, mc.ConversationID DESC`);
    return result.recordset;
  }

  async listConversationsForSchoolUser(schoolId, userId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('userId', sql.Int, userId)
      .query(`SELECT mc.*, f.FamilyName, f.PrimaryParentName, f.PrimaryParentEmail,
                recipient.Username AS RecipientUsername, recipient.Email AS RecipientEmail,
                lastMessage.Body AS LastMessageBody, lastMessage.SenderRole AS LastMessageSenderRole
              FROM MessagingConversations mc
              LEFT JOIN Families f ON f.FamilyID = mc.FamilyID AND f.SchoolID = mc.SchoolID
              LEFT JOIN Users recipient ON recipient.UserID = mc.RecipientUserID
              OUTER APPLY (
                SELECT TOP 1 Body, SenderRole
                FROM MessagingMessages mm
                WHERE mm.ConversationID = mc.ConversationID
                ORDER BY mm.CreatedDate DESC, mm.MessageID DESC
              ) lastMessage
              WHERE mc.SchoolID = @schoolId
                AND (
                  ISNULL(mc.ConversationType, mc.TargetType) <> 'StaffDirect'
                  OR mc.CreatedByUserID = @userId
                  OR mc.RecipientUserID = @userId
                )
              ORDER BY mc.LastMessageDate DESC, mc.ConversationID DESC`);
    return result.recordset;
  }

  async listConversationsForDevForge() {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT mc.*, f.FamilyName, f.PrimaryParentName, f.PrimaryParentEmail,
                s.SchoolName,
                recipient.Username AS RecipientUsername, recipient.Email AS RecipientEmail,
                creator.Username AS CreatedByUsername, creator.Email AS CreatedByEmail,
                lastMessage.Body AS LastMessageBody, lastMessage.SenderRole AS LastMessageSenderRole
              FROM MessagingConversations mc
              LEFT JOIN Families f ON f.FamilyID = mc.FamilyID AND f.SchoolID = mc.SchoolID
              INNER JOIN Schools s ON s.SchoolID = mc.SchoolID
              LEFT JOIN Users recipient ON recipient.UserID = mc.RecipientUserID
              LEFT JOIN Users creator ON creator.UserID = mc.CreatedByUserID
              OUTER APPLY (
                SELECT TOP 1 Body, SenderRole
                FROM MessagingMessages mm
                WHERE mm.ConversationID = mc.ConversationID
                ORDER BY mm.CreatedDate DESC, mm.MessageID DESC
              ) lastMessage
              WHERE ISNULL(mc.ConversationType, mc.TargetType) IN (
                'SchoolDevForge',
                'KinderCareHubParents',
                'KinderCareHubSchools',
                'DevForgeSchool',
                'DevForgeParents'
              )
              ORDER BY mc.LastMessageDate DESC, mc.ConversationID DESC`);
    return result.recordset;
  }

  async listConversationsForParent(userId, schoolId = null) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const request = pool.request().input('userId', sql.Int, userId);
    let schoolClause = '';

    if (schoolId) {
      request.input('schoolId', sql.Int, schoolId);
      schoolClause = 'AND mc.SchoolID = @schoolId';
    }

    const result = await request.query(`SELECT mc.*, f.FamilyName, s.SchoolName,
                lastMessage.Body AS LastMessageBody, lastMessage.SenderRole AS LastMessageSenderRole
              FROM MessagingConversations mc
              INNER JOIN ParentLinks pl ON pl.FamilyID = mc.FamilyID AND pl.SchoolID = mc.SchoolID
              INNER JOIN Families f ON f.FamilyID = mc.FamilyID AND f.SchoolID = mc.SchoolID
              INNER JOIN Schools s ON s.SchoolID = mc.SchoolID
              OUTER APPLY (
                SELECT TOP 1 Body, SenderRole
                FROM MessagingMessages mm
                WHERE mm.ConversationID = mc.ConversationID
                ORDER BY mm.CreatedDate DESC, mm.MessageID DESC
              ) lastMessage
              WHERE pl.UserID = @userId
                ${schoolClause}
                AND s.SubscriptionStatus = 'Active'
              ORDER BY mc.LastMessageDate DESC, mc.ConversationID DESC`);
    return result.recordset;
  }

  async getMessages(conversationId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('conversationId', sql.Int, conversationId)
      .query(`SELECT mm.MessageID, mm.ConversationID, mm.SchoolID, mm.FamilyID,
                mm.SenderUserID, mm.SenderRole, mm.Body, mm.CreatedDate,
                u.Username, u.Email
              FROM MessagingMessages mm
              INNER JOIN Users u ON u.UserID = mm.SenderUserID
              WHERE mm.ConversationID = @conversationId
              ORDER BY mm.CreatedDate, mm.MessageID`);
    return result.recordset;
  }

  async getSchoolUsers(schoolId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT DISTINCT u.UserID, u.Username, u.Email,
                CASE WHEN u.Role = 'admin' THEN 'school' ELSE u.Role END AS Role,
                e.SchoolID
              FROM Users u
              INNER JOIN Employees e ON e.UserID = u.UserID AND e.SchoolID = @schoolId
              WHERE u.Role IN ('school','admin')
                AND ISNULL(u.IsActive, 1) = 1
                AND ISNULL(e.IsActive, 1) = 1
              ORDER BY u.Username, u.Email`);
    return result.recordset;
  }

  async getDevForgeUsers() {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT UserID, Username, Email, Role
              FROM Users
              WHERE Role IN ('admin','devforge') AND ISNULL(IsActive, 1) = 1
              ORDER BY Username, Email`);
    return result.recordset;
  }

  async getParentUsersForFamily(familyId, schoolId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('familyId', sql.Int, familyId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT u.UserID, u.Username, u.Email, u.Role
              FROM ParentLinks pl
              INNER JOIN Users u ON u.UserID = pl.UserID
              WHERE pl.FamilyID = @familyId AND pl.SchoolID = @schoolId AND ISNULL(u.IsActive, 1) = 1`);
    return result.recordset;
  }

  async getAllParentUsers() {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT DISTINCT u.UserID, u.Username, u.Email, pl.SchoolID, pl.FamilyID
              FROM ParentLinks pl
              INNER JOIN Users u ON u.UserID = pl.UserID
              INNER JOIN Schools s ON s.SchoolID = pl.SchoolID
              WHERE u.Role = 'parent' AND ISNULL(u.IsActive, 1) = 1 AND s.SubscriptionStatus = 'Active'`);
    return result.recordset;
  }

  async getAllSchoolUsers() {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT DISTINCT u.UserID, u.Username, u.Email, e.SchoolID
              FROM Users u
              INNER JOIN Employees e ON e.UserID = u.UserID
              INNER JOIN Schools s ON s.SchoolID = e.SchoolID
              WHERE u.Role IN ('school','admin')
                AND ISNULL(u.IsActive, 1) = 1
                AND ISNULL(e.IsActive, 1) = 1
                AND s.SubscriptionStatus = 'Active'`);
    return result.recordset;
  }

  async findConversationByChannelKey(channelKey) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('channelKey', sql.NVarChar, channelKey)
      .query(`SELECT TOP 1 * FROM MessagingConversations WHERE ChannelKey = @channelKey ORDER BY ConversationID DESC`);
    return result.recordset[0] || null;
  }

  async createNotifications(message, recipients = []) {
    await this.ensureMessagingSchema();
    const uniqueIds = [...new Set((recipients || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0 && id !== Number(message.SenderUserID)))];
    if (!uniqueIds.length) return [];
    const pool = await getPool();
    const created = [];
    for (const userId of uniqueIds) {
      const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('conversationId', sql.Int, message.ConversationID)
        .input('messageId', sql.Int, message.MessageID)
        .input('schoolId', sql.Int, message.SchoolID || null)
        .input('familyId', sql.Int, message.FamilyID || null)
        .query(`INSERT INTO MessagingNotifications (UserID, ConversationID, MessageID, SchoolID, FamilyID)
                OUTPUT INSERTED.*
                VALUES (@userId, @conversationId, @messageId, @schoolId, @familyId)`);
      created.push(result.recordset[0]);
    }
    return created;
  }

  async getNotificationsForUser(userId, limit = 20) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('limit', sql.Int, Math.min(Math.max(Number(limit) || 20, 1), 100))
      .query(`SELECT TOP (@limit) n.*, mc.Subject, mc.ConversationType, mc.TargetType,
                mm.Body, mm.SenderRole, s.SchoolName, f.FamilyName
              FROM MessagingNotifications n
              INNER JOIN MessagingMessages mm ON mm.MessageID = n.MessageID
              INNER JOIN MessagingConversations mc ON mc.ConversationID = n.ConversationID
              LEFT JOIN Schools s ON s.SchoolID = n.SchoolID
              LEFT JOIN Families f ON f.FamilyID = n.FamilyID AND f.SchoolID = n.SchoolID
              WHERE n.UserID = @userId
              ORDER BY n.CreatedDate DESC, n.NotificationID DESC`);
    return result.recordset;
  }

  async markNotificationsRead(userId, conversationId = null) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const request = pool.request().input('userId', sql.Int, userId);
    let clause = '';
    if (conversationId) {
      request.input('conversationId', sql.Int, conversationId);
      clause = 'AND ConversationID = @conversationId';
    }
    await request.query(`UPDATE MessagingNotifications
                         SET IsRead = 1, ReadDate = COALESCE(ReadDate, GETDATE())
                         WHERE UserID = @userId AND IsRead = 0 ${clause}`);
  }

  async unreadCount(userId) {
    await this.ensureMessagingSchema();
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT COUNT(1) AS UnreadCount FROM MessagingNotifications WHERE UserID = @userId AND IsRead = 0`);
    return Number(result.recordset[0]?.UnreadCount || 0);
  }

  familyColumns() {
    return `f.FamilyID, f.SchoolID, f.FamilyName,
                f.PrimaryParentName, f.PrimaryParentEmail,
                f.SecondaryParentName, f.SecondaryParentEmail`;
  }

  cleanIds(values) {
    return [...new Set((Array.isArray(values) ? values : [values])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0))];
  }
}

module.exports = MessagingRepository;
