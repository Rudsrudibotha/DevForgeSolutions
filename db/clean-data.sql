-- Clean all data from all tables, leaving only the DevForge admin login.
-- Compatible with Azure SQL Database.
-- Run with: npm run clean-db

-- Disable all FK constraints
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += 'ALTER TABLE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) + ' NOCHECK CONSTRAINT ALL;' + CHAR(13)
FROM sys.tables t INNER JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = 'dbo';
EXEC sp_executesql @sql;

-- Delete from all tables
DELETE FROM dbo.BalanceBroughtForward;
DELETE FROM dbo.YearEndClosing;
DELETE FROM dbo.LeaveBalances;
DELETE FROM dbo.UserRoleAssignments;
DELETE FROM dbo.StaffRoles;
DELETE FROM dbo.LeaveTypes;
DELETE FROM dbo.RegistrationFees;
DELETE FROM dbo.Refunds;
DELETE FROM dbo.FinancialAdjustments;
DELETE FROM dbo.ConsentRecords;
DELETE FROM dbo.Admissions;
DELETE FROM dbo.ParentNotificationPrefs;
DELETE FROM dbo.CommunicationHistory;
DELETE FROM dbo.InvoiceTemplates;
DELETE FROM dbo.PromiseToPay;
DELETE FROM dbo.Discounts;
DELETE FROM dbo.CreditNotes;
DELETE FROM dbo.ParentDetailChanges;
DELETE FROM dbo.ParentCommunicationLogs;
DELETE FROM dbo.AcademicNotes;
DELETE FROM dbo.BehaviourLogs;
DELETE FROM dbo.StaffDocuments;
DELETE FROM dbo.StudentDocuments;
DELETE FROM dbo.Timetable;
DELETE FROM dbo.Attendance;
DELETE FROM dbo.ReEnrolment;
DELETE FROM dbo.ReconciliationMatches;
DELETE FROM dbo.AuditLogs;
DELETE FROM dbo.Payslips;
DELETE FROM dbo.LeaveRequests;
DELETE FROM dbo.ParentLinks;
DELETE FROM dbo.Classes;
DELETE FROM dbo.Transactions;
DELETE FROM dbo.BankStatements;
DELETE FROM dbo.Invoices;
DELETE FROM dbo.Students;
DELETE FROM dbo.BillingCategories;
DELETE FROM dbo.Families;
DELETE FROM dbo.Employees;
DELETE FROM dbo.SchoolTemplates;
DELETE FROM dbo.Users WHERE Role <> 'admin' OR SchoolID IS NOT NULL;
DELETE FROM dbo.Schools;

-- Re-enable all FK constraints
SET @sql = N'';
SELECT @sql += 'ALTER TABLE ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) + ' WITH CHECK CHECK CONSTRAINT ALL;' + CHAR(13)
FROM sys.tables t INNER JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE s.name = 'dbo';
EXEC sp_executesql @sql;

-- Ensure default admin exists
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'admin' AND SchoolID IS NULL AND Role = 'admin')
BEGIN
    INSERT INTO dbo.Users (Email, Username, PasswordHash, Role, SchoolID)
    VALUES ('admin@devforge.co.za', 'admin', '$2a$10$cGwWVDQ7ysHbPXqrys4VkuuLOjOBbzFMU4ugGgplJvTyHAhLlLTBO', 'admin', NULL);
END;
