// Data Layer - Messaging conversations, targets, and messages.

const { getPool, sql } = require('./db');

class MessagingRepository {
  async getFamiliesForEntireSchool(schoolId) {
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
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('familyId', sql.Int, data.familyId)
      .input('subject', sql.NVarChar, data.subject)
      .input('targetType', sql.NVarChar, data.targetType)
      .input('createdByUserId', sql.Int, data.createdByUserId)
      .query(`INSERT INTO MessagingConversations (
                SchoolID, FamilyID, Subject, TargetType, CreatedByUserID
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @familyId, @subject, @targetType, @createdByUserId
              )`);
    return result.recordset[0];
  }

  async createMessage(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('conversationId', sql.Int, data.conversationId)
      .input('schoolId', sql.Int, data.schoolId)
      .input('familyId', sql.Int, data.familyId)
      .input('senderUserId', sql.Int, data.senderUserId)
      .input('senderRole', sql.NVarChar, data.senderRole)
      .input('body', sql.NVarChar(sql.MAX), data.body)
      .query(`INSERT INTO MessagingMessages (
                ConversationID, SchoolID, FamilyID, SenderUserID, SenderRole, Body
              )
              OUTPUT INSERTED.*
              VALUES (
                @conversationId, @schoolId, @familyId, @senderUserId, @senderRole, @body
              );

              UPDATE MessagingConversations
              SET LastMessageDate = GETDATE(), UpdatedDate = GETDATE()
              WHERE ConversationID = @conversationId;`);
    return result.recordset[0];
  }

  async getConversationById(conversationId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('conversationId', sql.Int, conversationId)
      .query(`SELECT mc.*, f.FamilyName, s.SchoolName
              FROM MessagingConversations mc
              INNER JOIN Families f ON f.FamilyID = mc.FamilyID AND f.SchoolID = mc.SchoolID
              INNER JOIN Schools s ON s.SchoolID = mc.SchoolID
              WHERE mc.ConversationID = @conversationId`);
    return result.recordset[0];
  }

  async listConversationsForSchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT mc.*, f.FamilyName, f.PrimaryParentName, f.PrimaryParentEmail,
                lastMessage.Body AS LastMessageBody, lastMessage.SenderRole AS LastMessageSenderRole
              FROM MessagingConversations mc
              INNER JOIN Families f ON f.FamilyID = mc.FamilyID AND f.SchoolID = mc.SchoolID
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

  async listConversationsForParent(userId, schoolId = null) {
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
