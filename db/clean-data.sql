-- Clean all data from all tables, leaving only the DevForge admin login.
-- Compatible with Azure SQL Database (no sp_MSforeachtable).
-- Run with: npm run clean-db
-- WARNING: This removes ALL data. Use only in development.

-- Child/leaf tables first (safe FK order)
IF OBJECT_ID('dbo.BalanceBroughtForward', 'U') IS NOT NULL DELETE FROM dbo.BalanceBroughtForward;
IF OBJECT_ID('dbo.YearEndClosing', 'U') IS NOT NULL DELETE FROM dbo.YearEndClosing;
IF OBJECT_ID('dbo.LeaveBalances', 'U') IS NOT NULL DELETE FROM dbo.LeaveBalances;
IF OBJECT_ID('dbo.UserRoleAssignments', 'U') IS NOT NULL DELETE FROM dbo.UserRoleAssignments;
IF OBJECT_ID('dbo.StaffRoles', 'U') IS NOT NULL DELETE FROM dbo.StaffRoles;
IF OBJECT_ID('dbo.LeaveTypes', 'U') IS NOT NULL DELETE FROM dbo.LeaveTypes;
IF OBJECT_ID('dbo.RegistrationFees', 'U') IS NOT NULL DELETE FROM dbo.RegistrationFees;
IF OBJECT_ID('dbo.Refunds', 'U') IS NOT NULL DELETE FROM dbo.Refunds;
IF OBJECT_ID('dbo.FinancialAdjustments', 'U') IS NOT NULL DELETE FROM dbo.FinancialAdjustments;
IF OBJECT_ID('dbo.ConsentRecords', 'U') IS NOT NULL DELETE FROM dbo.ConsentRecords;
IF OBJECT_ID('dbo.Admissions', 'U') IS NOT NULL DELETE FROM dbo.Admissions;
IF OBJECT_ID('dbo.ParentNotificationPrefs', 'U') IS NOT NULL DELETE FROM dbo.ParentNotificationPrefs;
IF OBJECT_ID('dbo.CommunicationHistory', 'U') IS NOT NULL DELETE FROM dbo.CommunicationHistory;
IF OBJECT_ID('dbo.InvoiceTemplates', 'U') IS NOT NULL DELETE FROM dbo.InvoiceTemplates;
IF OBJECT_ID('dbo.PromiseToPay', 'U') IS NOT NULL DELETE FROM dbo.PromiseToPay;
IF OBJECT_ID('dbo.Discounts', 'U') IS NOT NULL DELETE FROM dbo.Discounts;
IF OBJECT_ID('dbo.CreditNotes', 'U') IS NOT NULL DELETE FROM dbo.CreditNotes;
IF OBJECT_ID('dbo.ParentDetailChanges', 'U') IS NOT NULL DELETE FROM dbo.ParentDetailChanges;
IF OBJECT_ID('dbo.ParentCommunicationLogs', 'U') IS NOT NULL DELETE FROM dbo.ParentCommunicationLogs;
IF OBJECT_ID('dbo.AcademicNotes', 'U') IS NOT NULL DELETE FROM dbo.AcademicNotes;
IF OBJECT_ID('dbo.BehaviourLogs', 'U') IS NOT NULL DELETE FROM dbo.BehaviourLogs;
IF OBJECT_ID('dbo.StaffDocuments', 'U') IS NOT NULL DELETE FROM dbo.StaffDocuments;
IF OBJECT_ID('dbo.StudentDocuments', 'U') IS NOT NULL DELETE FROM dbo.StudentDocuments;
IF OBJECT_ID('dbo.Timetable', 'U') IS NOT NULL DELETE FROM dbo.Timetable;
IF OBJECT_ID('dbo.Attendance', 'U') IS NOT NULL DELETE FROM dbo.Attendance;
IF OBJECT_ID('dbo.ReEnrolment', 'U') IS NOT NULL DELETE FROM dbo.ReEnrolment;
IF OBJECT_ID('dbo.ReconciliationMatches', 'U') IS NOT NULL DELETE FROM dbo.ReconciliationMatches;
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NOT NULL DELETE FROM dbo.AuditLogs;
IF OBJECT_ID('dbo.Payslips', 'U') IS NOT NULL DELETE FROM dbo.Payslips;
IF OBJECT_ID('dbo.LeaveRequests', 'U') IS NOT NULL DELETE FROM dbo.LeaveRequests;
IF OBJECT_ID('dbo.ParentLinks', 'U') IS NOT NULL DELETE FROM dbo.ParentLinks;
IF OBJECT_ID('dbo.Classes', 'U') IS NOT NULL DELETE FROM dbo.Classes;
IF OBJECT_ID('dbo.Transactions', 'U') IS NOT NULL DELETE FROM dbo.Transactions;
IF OBJECT_ID('dbo.BankStatements', 'U') IS NOT NULL DELETE FROM dbo.BankStatements;
IF OBJECT_ID('dbo.Invoices', 'U') IS NOT NULL DELETE FROM dbo.Invoices;
IF OBJECT_ID('dbo.Students', 'U') IS NOT NULL DELETE FROM dbo.Students;
IF OBJECT_ID('dbo.BillingCategories', 'U') IS NOT NULL DELETE FROM dbo.BillingCategories;
IF OBJECT_ID('dbo.Families', 'U') IS NOT NULL DELETE FROM dbo.Families;
IF OBJECT_ID('dbo.Employees', 'U') IS NOT NULL DELETE FROM dbo.Employees;
IF OBJECT_ID('dbo.SchoolTemplates', 'U') IS NOT NULL DELETE FROM dbo.SchoolTemplates;

-- Delete all non-admin users (keep DevForge admin logins only)
DELETE FROM dbo.Users WHERE Role <> 'admin' OR SchoolID IS NOT NULL;

-- Delete all schools
IF OBJECT_ID('dbo.Schools', 'U') IS NOT NULL DELETE FROM dbo.Schools;

-- Ensure the default DevForge admin exists
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'admin' AND SchoolID IS NULL AND Role = 'admin')
BEGIN
    INSERT INTO dbo.Users (Email, Username, PasswordHash, Role, SchoolID)
    VALUES ('admin@devforge.co.za', 'admin', '$2a$10$cGwWVDQ7ysHbPXqrys4VkuuLOjOBbzFMU4ugGgplJvTyHAhLlLTBO', 'admin', NULL);
END;

PRINT 'Database cleaned. Only DevForge admin login remains.';
