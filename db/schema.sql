-- Database schema for School Finance and Management System on Azure SQL Database.
-- Keep this script idempotent for local/dev setup. Production should use migrations.

IF OBJECT_ID('dbo.Schools', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Schools (
        SchoolID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolName NVARCHAR(255) NOT NULL,
        Address NVARCHAR(500) NULL,
        LogoUrl NVARCHAR(MAX) NULL,
        ContactPerson NVARCHAR(255) NULL,
        ContactEmail NVARCHAR(255) NULL,
        ContactPhone NVARCHAR(50) NULL,
        Website NVARCHAR(255) NULL,
        CurrencyCode NVARCHAR(3) NOT NULL DEFAULT 'ZAR',
        CurrencySymbol NVARCHAR(10) NOT NULL DEFAULT 'R',
        DefaultMonthlyFee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        PaymentInstructions NVARCHAR(MAX) NULL,
        SubscriptionStatus NVARCHAR(50) NOT NULL DEFAULT 'Active',
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Schools_SubscriptionStatus CHECK (SubscriptionStatus IN ('Active', 'Suspended', 'Cancelled'))
    );
END;

-- School-level toggle: allow staff to view their own payslips
IF COL_LENGTH('dbo.Schools', 'AllowStaffPayslipView') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD AllowStaffPayslipView BIT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Schools', 'LogoUrl') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD LogoUrl NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'LogoUrl') IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.Schools')
            AND name = 'LogoUrl'
            AND max_length <> -1
    )
BEGIN
    ALTER TABLE dbo.Schools ALTER COLUMN LogoUrl NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'ContactPerson') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD ContactPerson NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'RegistrationNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD RegistrationNumber NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'Website') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD Website NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'CurrencyCode') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD CurrencyCode NVARCHAR(3) NOT NULL CONSTRAINT DF_Schools_CurrencyCode DEFAULT 'ZAR';
END;

IF COL_LENGTH('dbo.Schools', 'CurrencySymbol') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD CurrencySymbol NVARCHAR(10) NOT NULL CONSTRAINT DF_Schools_CurrencySymbol DEFAULT 'R';
END;

IF COL_LENGTH('dbo.Schools', 'DefaultMonthlyFee') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD DefaultMonthlyFee DECIMAL(10,2) NOT NULL CONSTRAINT DF_Schools_DefaultMonthlyFee DEFAULT 0.00;
END;

IF COL_LENGTH('dbo.Schools', 'PaymentInstructions') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD PaymentInstructions NVARCHAR(MAX) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Schools_SchoolName' AND object_id = OBJECT_ID('dbo.Schools'))
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.Schools
        GROUP BY SchoolName
        HAVING COUNT(1) > 1
    )
BEGIN
    CREATE UNIQUE INDEX UX_Schools_SchoolName ON dbo.Schools(SchoolName);
END;

IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(50) NOT NULL,
        SchoolID INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'school', 'parent')),
        CONSTRAINT FK_Users_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

IF COL_LENGTH('dbo.Users', 'Username') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Username NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.Users', 'IsActive') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1;
END;

-- HR permission flag for payslip access
IF COL_LENGTH('dbo.Users', 'HasHrPermission') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD HasHrPermission BIT NOT NULL DEFAULT 0;
END;

EXEC sp_executesql N'
;WITH CandidateUsernames AS (
    SELECT
        UserID,
        SchoolID,
        LOWER(LEFT(Email, NULLIF(CHARINDEX(''@'', Email + ''@'') - 1, -1))) AS BaseUsername
    FROM dbo.Users
),
RankedUsernames AS (
    SELECT
        UserID,
        BaseUsername,
        COUNT(1) OVER (PARTITION BY SchoolID, BaseUsername) AS UsernameCount
    FROM CandidateUsernames
)
UPDATE u
SET Username = CASE
    WHEN RankedUsernames.BaseUsername IS NULL OR RankedUsernames.BaseUsername = '''' THEN CONCAT(''user'', u.UserID)
    WHEN RankedUsernames.UsernameCount > 1 THEN CONCAT(RankedUsernames.BaseUsername, u.UserID)
    ELSE RankedUsernames.BaseUsername
END
FROM dbo.Users AS u
INNER JOIN RankedUsernames ON u.UserID = RankedUsernames.UserID
WHERE u.Username IS NULL OR LTRIM(RTRIM(u.Username)) = '''';
';

EXEC sp_executesql N'
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = ''UX_Users_SchoolID_Username'' AND object_id = OBJECT_ID(''dbo.Users''))
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE SchoolID IS NOT NULL AND Username IS NOT NULL
        GROUP BY SchoolID, Username
        HAVING COUNT(1) > 1
    )
BEGIN
    CREATE UNIQUE INDEX UX_Users_SchoolID_Username
        ON dbo.Users(SchoolID, Username)
        WHERE SchoolID IS NOT NULL AND Username IS NOT NULL;
END;
';

IF OBJECT_ID('dbo.Invoices', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Invoices (
        InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NULL,
        BillingCategoryID INT NULL,
        InvoiceNumber NVARCHAR(50) NOT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        Description NVARCHAR(500) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        IssueDate DATETIME NOT NULL DEFAULT GETDATE(),
        DueDate DATETIME NULL,
        PaidDate DATETIME NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Invoices_InvoiceNumber UNIQUE (InvoiceNumber),
        CONSTRAINT CK_Invoices_Amount CHECK (Amount > 0),
        CONSTRAINT CK_Invoices_Status CHECK (Status IN ('Pending', 'Paid', 'Cancelled', 'Overdue', 'Partial')),
        CONSTRAINT FK_Invoices_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

-- Add StudentID column if missing (for older schemas)
IF COL_LENGTH('dbo.Invoices', 'StudentID') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD StudentID INT NULL;
END;

IF COL_LENGTH('dbo.Invoices', 'BillingCategoryID') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD BillingCategoryID INT NULL;
END;

-- Add AmountPaid for partial payments
IF COL_LENGTH('dbo.Invoices', 'AmountPaid') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD AmountPaid DECIMAL(10,2) NOT NULL DEFAULT 0.00;
END;

-- Add IsDeleted for soft delete
IF COL_LENGTH('dbo.Invoices', 'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.Invoices ADD IsDeleted BIT NOT NULL DEFAULT 0;
END;

-- Update status constraint to include Partial
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Invoices_Status')
BEGIN
    ALTER TABLE dbo.Invoices DROP CONSTRAINT CK_Invoices_Status;
    ALTER TABLE dbo.Invoices ADD CONSTRAINT CK_Invoices_Status CHECK (Status IN ('Pending', 'Paid', 'Cancelled', 'Overdue', 'Partial'));
END;

-- Update role constraint to include parent
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_Role')
BEGIN
    ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_Role;
    ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'school', 'parent'));
END;

IF OBJECT_ID('dbo.Families', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Families (
        FamilyID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyName NVARCHAR(255) NOT NULL,
        PrimaryParentName NVARCHAR(255) NOT NULL,
        PrimaryParentIdNumber NVARCHAR(50) NULL,
        PrimaryParentPhone NVARCHAR(50) NULL,
        PrimaryParentEmail NVARCHAR(255) NULL,
        PrimaryParentOccupation NVARCHAR(255) NULL,
        PrimaryParentWorkPhone NVARCHAR(50) NULL,
        SecondaryParentName NVARCHAR(255) NULL,
        SecondaryParentIdNumber NVARCHAR(50) NULL,
        SecondaryParentPhone NVARCHAR(50) NULL,
        SecondaryParentEmail NVARCHAR(255) NULL,
        SecondaryParentOccupation NVARCHAR(255) NULL,
        SecondaryParentWorkPhone NVARCHAR(50) NULL,
        HomeAddress NVARCHAR(500) NULL,
        EmergencyContactName NVARCHAR(255) NULL,
        EmergencyContactPhone NVARCHAR(50) NULL,
        FamilyDoctor NVARCHAR(255) NULL,
        MedicalAidName NVARCHAR(255) NULL,
        MedicalAidNumber NVARCHAR(100) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Families_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

IF OBJECT_ID('dbo.BillingCategories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BillingCategories (
        BillingCategoryID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        CategoryName NVARCHAR(255) NOT NULL,
        Description NVARCHAR(500) NULL,
        BaseAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        Frequency NVARCHAR(50) NOT NULL DEFAULT 'Monthly',
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_BillingCategories_Frequency CHECK (Frequency IN ('Monthly', 'Quarterly', 'Annually', 'One-time')),
        CONSTRAINT CK_BillingCategories_BaseAmount CHECK (BaseAmount >= 0),
        CONSTRAINT FK_BillingCategories_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_BillingCategories_Frequency')
BEGIN
    ALTER TABLE dbo.BillingCategories DROP CONSTRAINT CK_BillingCategories_Frequency;
END;

IF COL_LENGTH('dbo.Invoices', 'BillingCategoryID') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Invoices_BillingCategories')
BEGIN
    ALTER TABLE dbo.Invoices ADD CONSTRAINT FK_Invoices_BillingCategories FOREIGN KEY (BillingCategoryID) REFERENCES dbo.BillingCategories(BillingCategoryID);
END;

IF OBJECT_ID('dbo.Students', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Students (
        StudentID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyID INT NOT NULL,
        FirstName NVARCHAR(255) NOT NULL,
        LastName NVARCHAR(255) NOT NULL,
        DateOfBirth DATE NULL,
        HomePhone NVARCHAR(50) NULL,
        HomeAddress NVARCHAR(500) NULL,
        ClassName NVARCHAR(100) NULL,
        BillingDate DATE NOT NULL,
        EnrolledDate DATE NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        DepartureDate DATE NULL,
        DepartureReason NVARCHAR(50) NULL,
        DepartureNote NVARCHAR(500) NULL,
        MedicalNotes NVARCHAR(1000) NULL,
        BillingCategoryID INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Students_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Students_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_Students_BillingCategories FOREIGN KEY (BillingCategoryID) REFERENCES dbo.BillingCategories(BillingCategoryID),
        CONSTRAINT CK_Students_DepartureReason CHECK (DepartureReason IS NULL OR DepartureReason IN ('Left', 'Absconded', 'Moved', 'Other'))
    );
END;

-- Add BillingCategoryID to Students if missing
IF COL_LENGTH('dbo.Students', 'BillingCategoryID') IS NULL
BEGIN
    ALTER TABLE dbo.Students ADD BillingCategoryID INT NULL;
    ALTER TABLE dbo.Students ADD CONSTRAINT FK_Students_BillingCategories FOREIGN KEY (BillingCategoryID) REFERENCES dbo.BillingCategories(BillingCategoryID);
END;

IF OBJECT_ID('dbo.StudentBillingCategories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudentBillingCategories (
        StudentBillingCategoryID INT IDENTITY(1,1) PRIMARY KEY,
        StudentID INT NOT NULL,
        BillingCategoryID INT NOT NULL,
        IsPrimary BIT NOT NULL DEFAULT 0,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_StudentBillingCategories_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_StudentBillingCategories_BillingCategories FOREIGN KEY (BillingCategoryID) REFERENCES dbo.BillingCategories(BillingCategoryID),
        CONSTRAINT UQ_StudentBillingCategories_Student_Category UNIQUE (StudentID, BillingCategoryID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StudentBillingCategories_StudentID' AND object_id = OBJECT_ID('dbo.StudentBillingCategories'))
BEGIN
    CREATE INDEX IX_StudentBillingCategories_StudentID ON dbo.StudentBillingCategories(StudentID);
END;

INSERT INTO dbo.StudentBillingCategories (StudentID, BillingCategoryID, IsPrimary)
SELECT s.StudentID, s.BillingCategoryID, 1
FROM dbo.Students s
WHERE s.BillingCategoryID IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.StudentBillingCategories sbc
      WHERE sbc.StudentID = s.StudentID
        AND sbc.BillingCategoryID = s.BillingCategoryID
  );

IF OBJECT_ID('dbo.BankStatements', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankStatements (
        BankStatementID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        StatementDate DATE NULL,
        RawData NVARCHAR(MAX) NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_BankStatements_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

IF OBJECT_ID('dbo.Transactions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Transactions (
        TransactionID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        InvoiceID INT NULL,
        BankStatementID INT NULL,
        PaymentMethod NVARCHAR(100) NULL,
        Reference NVARCHAR(250) NULL,
        Description NVARCHAR(500) NULL,
        TransactionType NVARCHAR(50) NOT NULL DEFAULT 'Credit',
        Amount DECIMAL(10,2) NOT NULL,
        TransactionDate DATETIME NOT NULL DEFAULT GETDATE(),
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Transactions_Type CHECK (TransactionType IN ('Credit', 'Debit', 'Bank', 'Payment')),
        CONSTRAINT CK_Transactions_Amount CHECK (Amount >= 0),
        CONSTRAINT FK_Transactions_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Transactions_Invoices FOREIGN KEY (InvoiceID) REFERENCES dbo.Invoices(InvoiceID),
        CONSTRAINT FK_Transactions_BankStatements FOREIGN KEY (BankStatementID) REFERENCES dbo.BankStatements(BankStatementID)
    );
END;

-- HR Module: Employees
IF OBJECT_ID('dbo.Employees', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Employees (
        EmployeeID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        UserID INT NULL,
        FirstName NVARCHAR(255) NOT NULL,
        LastName NVARCHAR(255) NOT NULL,
        Email NVARCHAR(255) NULL,
        Phone NVARCHAR(50) NULL,
        JobTitle NVARCHAR(255) NULL,
        Department NVARCHAR(255) NULL,
        StartDate DATE NOT NULL,
        Salary DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        LeaveBalance INT NOT NULL DEFAULT 21,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Employees_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Employees_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
    );
END;

-- HR Module: Leave Requests
IF OBJECT_ID('dbo.LeaveRequests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LeaveRequests (
        LeaveRequestID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL,
        LeaveType NVARCHAR(50) NOT NULL,
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        Days INT NOT NULL,
        Reason NVARCHAR(500) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        ReviewedBy INT NULL,
        ReviewedDate DATETIME NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_LeaveRequests_Type CHECK (LeaveType IN ('Annual', 'Sick', 'Family', 'Unpaid', 'Other')),
        CONSTRAINT CK_LeaveRequests_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
        CONSTRAINT FK_LeaveRequests_Employees FOREIGN KEY (EmployeeID) REFERENCES dbo.Employees(EmployeeID),
        CONSTRAINT FK_LeaveRequests_ReviewedBy FOREIGN KEY (ReviewedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- HR Module: Payslips
IF OBJECT_ID('dbo.Payslips', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Payslips (
        PayslipID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL,
        PayPeriod NVARCHAR(7) NOT NULL,
        GrossAmount DECIMAL(10,2) NOT NULL,
        Deductions DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        NetAmount DECIMAL(10,2) NOT NULL,
        Notes NVARCHAR(500) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Payslips_GrossAmount CHECK (GrossAmount > 0),
        CONSTRAINT CK_Payslips_NetAmount CHECK (NetAmount >= 0),
        CONSTRAINT FK_Payslips_Employees FOREIGN KEY (EmployeeID) REFERENCES dbo.Employees(EmployeeID),
        CONSTRAINT UQ_Payslips_Employee_Period UNIQUE (EmployeeID, PayPeriod)
    );
END;

-- Payslip finalization columns
IF COL_LENGTH('dbo.Payslips', 'IsFinalized') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD IsFinalized BIT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'FinalizedDate') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD FinalizedDate DATETIME NULL;
END;

IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        AuditLogID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NULL,
        SchoolID INT NULL,
        EntityName NVARCHAR(100) NOT NULL,
        EntityID NVARCHAR(100) NOT NULL,
        Action NVARCHAR(100) NOT NULL,
        BeforeValue NVARCHAR(MAX) NULL,
        AfterValue NVARCHAR(MAX) NULL,
        IpAddress NVARCHAR(100) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

IF OBJECT_ID('dbo.ReconciliationMatches', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReconciliationMatches (
        ReconciliationMatchID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        TransactionID INT NOT NULL,
        InvoiceID INT NOT NULL,
        MatchScore INT NOT NULL,
        MatchReason NVARCHAR(500) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Suggested',
        ApprovedBy INT NULL,
        ApprovedDate DATETIME NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_ReconciliationMatches_Status CHECK (Status IN ('Suggested', 'Approved', 'Rejected')),
        CONSTRAINT FK_ReconciliationMatches_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_ReconciliationMatches_Transactions FOREIGN KEY (TransactionID) REFERENCES dbo.Transactions(TransactionID),
        CONSTRAINT FK_ReconciliationMatches_Invoices FOREIGN KEY (InvoiceID) REFERENCES dbo.Invoices(InvoiceID),
        CONSTRAINT FK_ReconciliationMatches_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Indexes for performance
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_SchoolID' AND object_id = OBJECT_ID('dbo.Users'))
BEGIN
    CREATE INDEX IX_Users_SchoolID ON dbo.Users(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_SchoolID' AND object_id = OBJECT_ID('dbo.Invoices'))
BEGIN
    CREATE INDEX IX_Invoices_SchoolID ON dbo.Invoices(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_Status' AND object_id = OBJECT_ID('dbo.Invoices'))
BEGIN
    CREATE INDEX IX_Invoices_Status ON dbo.Invoices(Status);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_DueDate' AND object_id = OBJECT_ID('dbo.Invoices'))
BEGIN
    CREATE INDEX IX_Invoices_DueDate ON dbo.Invoices(DueDate);
END;

-- Composite index for monthly invoice generation batch check
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_StudentID_IssueDate' AND object_id = OBJECT_ID('dbo.Invoices'))
BEGIN
    CREATE INDEX IX_Invoices_StudentID_IssueDate ON dbo.Invoices(StudentID, IssueDate);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Families_SchoolID' AND object_id = OBJECT_ID('dbo.Families'))
BEGIN
    CREATE INDEX IX_Families_SchoolID ON dbo.Families(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Students_SchoolID_IsActive' AND object_id = OBJECT_ID('dbo.Students'))
BEGIN
    CREATE INDEX IX_Students_SchoolID_IsActive ON dbo.Students(SchoolID, IsActive);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Students_FamilyID' AND object_id = OBJECT_ID('dbo.Students'))
BEGIN
    CREATE INDEX IX_Students_FamilyID ON dbo.Students(FamilyID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Transactions_SchoolID' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    CREATE INDEX IX_Transactions_SchoolID ON dbo.Transactions(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BankStatements_SchoolID' AND object_id = OBJECT_ID('dbo.BankStatements'))
BEGIN
    CREATE INDEX IX_BankStatements_SchoolID ON dbo.BankStatements(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_SchoolID' AND object_id = OBJECT_ID('dbo.Employees'))
BEGIN
    CREATE INDEX IX_Employees_SchoolID ON dbo.Employees(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_UserID' AND object_id = OBJECT_ID('dbo.Employees'))
BEGIN
    CREATE INDEX IX_Employees_UserID ON dbo.Employees(UserID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LeaveRequests_EmployeeID' AND object_id = OBJECT_ID('dbo.LeaveRequests'))
BEGIN
    CREATE INDEX IX_LeaveRequests_EmployeeID ON dbo.LeaveRequests(EmployeeID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Payslips_EmployeeID' AND object_id = OBJECT_ID('dbo.Payslips'))
BEGIN
    CREATE INDEX IX_Payslips_EmployeeID ON dbo.Payslips(EmployeeID);
END;

-- Parent portal: link parents to families
IF OBJECT_ID('dbo.ParentLinks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParentLinks (
        ParentLinkID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        FamilyID INT NOT NULL,
        SchoolID INT NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ParentLinks_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_ParentLinks_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_ParentLinks_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT UQ_ParentLinks_User_Family UNIQUE (UserID, FamilyID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ParentLinks_UserID' AND object_id = OBJECT_ID('dbo.ParentLinks'))
BEGIN
    CREATE INDEX IX_ParentLinks_UserID ON dbo.ParentLinks(UserID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_SchoolID' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE INDEX IX_AuditLogs_SchoolID ON dbo.AuditLogs(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_EntityName_EntityID' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE INDEX IX_AuditLogs_EntityName_EntityID ON dbo.AuditLogs(EntityName, EntityID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReconciliationMatches_SchoolID_Status' AND object_id = OBJECT_ID('dbo.ReconciliationMatches'))
BEGIN
    CREATE INDEX IX_ReconciliationMatches_SchoolID_Status ON dbo.ReconciliationMatches(SchoolID, Status);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ReconciliationMatches_Transaction_Invoice' AND object_id = OBJECT_ID('dbo.ReconciliationMatches'))
BEGIN
    CREATE UNIQUE INDEX UX_ReconciliationMatches_Transaction_Invoice ON dbo.ReconciliationMatches(TransactionID, InvoiceID);
END;

-- Insert default admin user for testing
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'admin' AND SchoolID IS NULL)
BEGIN
    INSERT INTO dbo.Users (Email, Username, PasswordHash, Role, SchoolID)
    VALUES ('admin@devforge.co.za', 'admin', '$2a$10$cGwWVDQ7ysHbPXqrys4VkuuLOjOBbzFMU4ugGgplJvTyHAhLlLTBO', 'admin', NULL);
END;

-- =============================================
-- NEW FEATURE TABLES
-- =============================================

-- Attendance
IF OBJECT_ID('dbo.Attendance', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Attendance (
        AttendanceID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        ClassID INT NULL,
        AttendanceDate DATE NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Present',
        Notes NVARCHAR(500) NULL,
        RecordedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Attendance_Status CHECK (Status IN ('Present','Absent','Late','Excused')),
        CONSTRAINT FK_Attendance_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Attendance_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_Attendance_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(UserID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attendance_SchoolID_Date' AND object_id = OBJECT_ID('dbo.Attendance'))
BEGIN
    CREATE INDEX IX_Attendance_SchoolID_Date ON dbo.Attendance(SchoolID, AttendanceDate);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attendance_StudentID' AND object_id = OBJECT_ID('dbo.Attendance'))
BEGIN
    CREATE INDEX IX_Attendance_StudentID ON dbo.Attendance(StudentID);
END;

-- Classes
IF OBJECT_ID('dbo.Classes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Classes (
        ClassID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        ClassName NVARCHAR(100) NOT NULL,
        TeacherID INT NULL,
        Capacity INT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Classes_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Classes_Teacher FOREIGN KEY (TeacherID) REFERENCES dbo.Employees(EmployeeID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Classes_SchoolID' AND object_id = OBJECT_ID('dbo.Classes'))
BEGIN
    CREATE INDEX IX_Classes_SchoolID ON dbo.Classes(SchoolID);
END;

-- Timetable
IF OBJECT_ID('dbo.Timetable', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Timetable (
        TimetableID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        ClassID INT NOT NULL,
        DayOfWeek NVARCHAR(10) NOT NULL,
        PeriodNumber INT NOT NULL,
        Subject NVARCHAR(100) NULL,
        TeacherID INT NULL,
        StartTime NVARCHAR(5) NULL,
        EndTime NVARCHAR(5) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Timetable_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Timetable_Classes FOREIGN KEY (ClassID) REFERENCES dbo.Classes(ClassID),
        CONSTRAINT FK_Timetable_Teacher FOREIGN KEY (TeacherID) REFERENCES dbo.Employees(EmployeeID)
    );
END;

-- Student Documents
IF OBJECT_ID('dbo.StudentDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudentDocuments (
        DocumentID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        DocumentType NVARCHAR(100) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        FileData NVARCHAR(MAX) NULL,
        UploadedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_StudentDocuments_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_StudentDocuments_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_StudentDocuments_UploadedBy FOREIGN KEY (UploadedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Staff Documents
IF OBJECT_ID('dbo.StaffDocuments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StaffDocuments (
        DocumentID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        EmployeeID INT NOT NULL,
        DocumentType NVARCHAR(100) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        FileData NVARCHAR(MAX) NULL,
        UploadedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_StaffDocuments_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_StaffDocuments_Employees FOREIGN KEY (EmployeeID) REFERENCES dbo.Employees(EmployeeID),
        CONSTRAINT FK_StaffDocuments_UploadedBy FOREIGN KEY (UploadedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Employee emergency contacts and contract end date
IF COL_LENGTH('dbo.Employees', 'EmergencyContactName') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD EmergencyContactName NVARCHAR(255) NULL;
END;
IF COL_LENGTH('dbo.Employees', 'EmergencyContactPhone') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD EmergencyContactPhone NVARCHAR(50) NULL;
END;
IF COL_LENGTH('dbo.Employees', 'ContractEndDate') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD ContractEndDate DATE NULL;
END;

-- Behaviour / Incident Log
IF OBJECT_ID('dbo.BehaviourLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BehaviourLogs (
        BehaviourLogID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        LogDate DATE NOT NULL,
        Category NVARCHAR(100) NOT NULL,
        Description NVARCHAR(1000) NOT NULL,
        ActionTaken NVARCHAR(500) NULL,
        RecordedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_BehaviourLogs_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_BehaviourLogs_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_BehaviourLogs_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(UserID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BehaviourLogs_StudentID' AND object_id = OBJECT_ID('dbo.BehaviourLogs'))
BEGIN
    CREATE INDEX IX_BehaviourLogs_StudentID ON dbo.BehaviourLogs(StudentID);
END;

-- Academic Notes
IF OBJECT_ID('dbo.AcademicNotes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AcademicNotes (
        AcademicNoteID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        Term NVARCHAR(50) NOT NULL,
        Year INT NOT NULL,
        Notes NVARCHAR(2000) NOT NULL,
        RecordedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_AcademicNotes_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_AcademicNotes_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_AcademicNotes_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Student Demographics (ethnicity as sensitive POPIA data)
IF COL_LENGTH('dbo.Students', 'Gender') IS NULL
BEGIN
    ALTER TABLE dbo.Students ADD Gender NVARCHAR(20) NULL;
END;
IF COL_LENGTH('dbo.Students', 'Ethnicity') IS NULL
BEGIN
    ALTER TABLE dbo.Students ADD Ethnicity NVARCHAR(50) NULL;
END;

-- Parent Communication Log
IF OBJECT_ID('dbo.ParentCommunicationLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParentCommunicationLogs (
        CommunicationLogID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyID INT NOT NULL,
        CommunicationType NVARCHAR(50) NOT NULL,
        Subject NVARCHAR(255) NULL,
        Notes NVARCHAR(2000) NULL,
        RecordedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_ParentComm_Type CHECK (CommunicationType IN ('Call','Email','Meeting','Fee Follow-up','SMS','Other')),
        CONSTRAINT FK_ParentComm_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_ParentComm_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_ParentComm_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Parent Detail Change Requests
IF OBJECT_ID('dbo.ParentDetailChanges', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParentDetailChanges (
        ChangeID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyID INT NOT NULL,
        RequestedBy INT NOT NULL,
        FieldName NVARCHAR(100) NOT NULL,
        OldValue NVARCHAR(500) NULL,
        NewValue NVARCHAR(500) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        ReviewedBy INT NULL,
        ReviewedDate DATETIME NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_ParentDetailChanges_Status CHECK (Status IN ('Pending','Approved','Rejected')),
        CONSTRAINT FK_ParentDetailChanges_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_ParentDetailChanges_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_ParentDetailChanges_RequestedBy FOREIGN KEY (RequestedBy) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_ParentDetailChanges_ReviewedBy FOREIGN KEY (ReviewedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Credit Notes
IF OBJECT_ID('dbo.CreditNotes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CreditNotes (
        CreditNoteID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        InvoiceID INT NOT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        CreatedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_CreditNotes_Amount CHECK (Amount > 0),
        CONSTRAINT FK_CreditNotes_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_CreditNotes_Invoices FOREIGN KEY (InvoiceID) REFERENCES dbo.Invoices(InvoiceID),
        CONSTRAINT FK_CreditNotes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Discounts / Bursaries
IF OBJECT_ID('dbo.Discounts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Discounts (
        DiscountID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        BillingCategoryID INT NULL,
        DiscountType NVARCHAR(50) NOT NULL,
        FixedAmount DECIMAL(10,2) NULL,
        Percentage DECIMAL(5,2) NULL,
        Description NVARCHAR(255) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Discounts_Type CHECK (DiscountType IN ('Fixed','Percentage','Sibling','Bursary')),
        CONSTRAINT FK_Discounts_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Discounts_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_Discounts_BillingCategories FOREIGN KEY (BillingCategoryID) REFERENCES dbo.BillingCategories(BillingCategoryID)
    );
END;

-- Pro-rata billing config per school
IF COL_LENGTH('dbo.Schools', 'EnableProRataBilling') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD EnableProRataBilling BIT NOT NULL DEFAULT 0;
END;

-- Promise to Pay
IF OBJECT_ID('dbo.PromiseToPay', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PromiseToPay (
        PromiseID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyID INT NOT NULL,
        PromisedDate DATE NOT NULL,
        PromisedAmount DECIMAL(10,2) NOT NULL,
        Notes NVARCHAR(500) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        RecordedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_PromiseToPay_Status CHECK (Status IN ('Pending','Kept','Broken')),
        CONSTRAINT FK_PromiseToPay_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_PromiseToPay_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_PromiseToPay_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Invoice Templates
IF OBJECT_ID('dbo.InvoiceTemplates', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.InvoiceTemplates (
        TemplateID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        TemplateName NVARCHAR(100) NOT NULL,
        LogoUrl NVARCHAR(MAX) NULL,
        HeaderText NVARCHAR(500) NULL,
        FooterText NVARCHAR(500) NULL,
        ContactDetails NVARCHAR(500) NULL,
        BankingDetails NVARCHAR(1000) NULL,
        Notes NVARCHAR(1000) NULL,
        IsDefault BIT NOT NULL DEFAULT 0,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_InvoiceTemplates_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

-- Communication History (sent invoices/statements tracking)
IF OBJECT_ID('dbo.CommunicationHistory', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CommunicationHistory (
        CommunicationID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyID INT NULL,
        ParentUserID INT NULL,
        CommunicationType NVARCHAR(50) NOT NULL,
        Subject NVARCHAR(255) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Sent',
        SentDate DATETIME NOT NULL DEFAULT GETDATE(),
        DeliveryStatus NVARCHAR(50) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_CommHistory_Type CHECK (CommunicationType IN ('Invoice','Statement','Reminder','Message')),
        CONSTRAINT CK_CommHistory_Status CHECK (Status IN ('Sent','Delivered','Opened','Failed','Pending')),
        CONSTRAINT FK_CommHistory_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CommHistory_SchoolID' AND object_id = OBJECT_ID('dbo.CommunicationHistory'))
BEGIN
    CREATE INDEX IX_CommHistory_SchoolID ON dbo.CommunicationHistory(SchoolID);
END;

-- Parent notification preferences
IF OBJECT_ID('dbo.ParentNotificationPrefs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParentNotificationPrefs (
        PrefID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        PreferEmail BIT NOT NULL DEFAULT 1,
        PreferSMS BIT NOT NULL DEFAULT 0,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ParentNotifPrefs_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
    );
END;

-- School visibility toggles for parent portal
IF COL_LENGTH('dbo.Schools', 'ShowBehaviourToParents') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD ShowBehaviourToParents BIT NOT NULL DEFAULT 0;
END;
IF COL_LENGTH('dbo.Schools', 'ShowAcademicNotesToParents') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD ShowAcademicNotesToParents BIT NOT NULL DEFAULT 0;
END;
IF COL_LENGTH('dbo.Schools', 'RequireParentUpdateApproval') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD RequireParentUpdateApproval BIT NOT NULL DEFAULT 1;
END;

-- =============================================
-- ADMISSIONS, CONSENT, ADJUSTMENTS, REFUNDS, REGISTRATION FEES
-- =============================================

-- Admissions / Enrolment
IF OBJECT_ID('dbo.Admissions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Admissions (
        AdmissionID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyID INT NULL,
        FirstName NVARCHAR(255) NOT NULL,
        LastName NVARCHAR(255) NOT NULL,
        DateOfBirth DATE NULL,
        ClassName NVARCHAR(100) NULL,
        BillingCategoryID INT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'New',
        Notes NVARCHAR(1000) NULL,
        AppliedDate DATE NOT NULL DEFAULT GETDATE(),
        EnrolledDate DATE NULL,
        ConvertedStudentID INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Admissions_Status CHECK (Status IN ('New','In Review','Accepted','Rejected','Enrolled')),
        CONSTRAINT FK_Admissions_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Admissions_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_Admissions_BillingCategories FOREIGN KEY (BillingCategoryID) REFERENCES dbo.BillingCategories(BillingCategoryID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Admissions_SchoolID_Status' AND object_id = OBJECT_ID('dbo.Admissions'))
BEGIN
    CREATE INDEX IX_Admissions_SchoolID_Status ON dbo.Admissions(SchoolID, Status);
END;

-- Consent Records
IF OBJECT_ID('dbo.ConsentRecords', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConsentRecords (
        ConsentID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        ParentUserID INT NULL,
        ConsentType NVARCHAR(100) NOT NULL,
        Response NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        ResponseDate DATETIME NULL,
        Notes NVARCHAR(500) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Consent_Response CHECK (Response IN ('Pending','Accepted','Declined')),
        CONSTRAINT FK_Consent_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Consent_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_Consent_ParentUser FOREIGN KEY (ParentUserID) REFERENCES dbo.Users(UserID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ConsentRecords_SchoolID' AND object_id = OBJECT_ID('dbo.ConsentRecords'))
BEGIN
    CREATE INDEX IX_ConsentRecords_SchoolID ON dbo.ConsentRecords(SchoolID);
END;

-- Financial Adjustments
IF OBJECT_ID('dbo.FinancialAdjustments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FinancialAdjustments (
        AdjustmentID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NULL,
        FamilyID INT NULL,
        InvoiceID INT NULL,
        AdjustmentType NVARCHAR(50) NOT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        CreatedBy INT NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Adjustments_Type CHECK (AdjustmentType IN ('Write-off','Reversal','Credit Correction','Debit Correction','Fee Correction')),
        CONSTRAINT FK_Adjustments_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Adjustments_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_Adjustments_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_Adjustments_Invoices FOREIGN KEY (InvoiceID) REFERENCES dbo.Invoices(InvoiceID),
        CONSTRAINT FK_Adjustments_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FinancialAdjustments_SchoolID' AND object_id = OBJECT_ID('dbo.FinancialAdjustments'))
BEGIN
    CREATE INDEX IX_FinancialAdjustments_SchoolID ON dbo.FinancialAdjustments(SchoolID);
END;

-- Refunds
IF OBJECT_ID('dbo.Refunds', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Refunds (
        RefundID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyID INT NOT NULL,
        StudentID INT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        ApprovedBy INT NULL,
        ApprovedDate DATETIME NULL,
        CreatedBy INT NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Refunds_Status CHECK (Status IN ('Pending','Approved','Completed','Rejected')),
        CONSTRAINT CK_Refunds_Amount CHECK (Amount > 0),
        CONSTRAINT FK_Refunds_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Refunds_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_Refunds_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_Refunds_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_Refunds_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES dbo.Users(UserID)
    );
END;

-- Registration / Deposit Fees
IF OBJECT_ID('dbo.RegistrationFees', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RegistrationFees (
        RegistrationFeeID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NULL,
        FamilyID INT NULL,
        FeeType NVARCHAR(100) NOT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        IsRefundable BIT NOT NULL DEFAULT 0,
        IsPaid BIT NOT NULL DEFAULT 0,
        PaidDate DATETIME NULL,
        Notes NVARCHAR(500) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_RegFees_Amount CHECK (Amount > 0),
        CONSTRAINT FK_RegFees_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_RegFees_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_RegFees_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID)
    );
END;

-- =============================================
-- RE-ENROLMENT, SCHOOL TEMPLATES, PLATFORM USAGE
-- =============================================

-- Re-Enrolment / Year Rollover
IF OBJECT_ID('dbo.ReEnrolment', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReEnrolment (
        ReEnrolmentID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        AcademicYear INT NOT NULL,
        StudentID INT NOT NULL,
        PreviousClassName NVARCHAR(100) NULL,
        NewClassName NVARCHAR(100) NULL,
        Action NVARCHAR(50) NOT NULL,
        BalanceCarriedForward DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        AdvanceCreditCarriedForward DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        ProcessedBy INT NULL,
        ProcessedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_ReEnrolment_Action CHECK (Action IN ('Promoted','Left','Retained','Pending')),
        CONSTRAINT FK_ReEnrolment_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_ReEnrolment_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_ReEnrolment_ProcessedBy FOREIGN KEY (ProcessedBy) REFERENCES dbo.Users(UserID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReEnrolment_SchoolID_Year' AND object_id = OBJECT_ID('dbo.ReEnrolment'))
BEGIN
    CREATE INDEX IX_ReEnrolment_SchoolID_Year ON dbo.ReEnrolment(SchoolID, AcademicYear);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ReEnrolment_Student_Year' AND object_id = OBJECT_ID('dbo.ReEnrolment'))
    AND NOT EXISTS (SELECT 1 FROM dbo.ReEnrolment GROUP BY StudentID, AcademicYear HAVING COUNT(1) > 1)
BEGIN
    CREATE UNIQUE INDEX UX_ReEnrolment_Student_Year ON dbo.ReEnrolment(StudentID, AcademicYear);
END;

-- School Setup Templates (DevForge-managed)
IF OBJECT_ID('dbo.SchoolTemplates', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SchoolTemplates (
        TemplateID INT IDENTITY(1,1) PRIMARY KEY,
        TemplateName NVARCHAR(255) NOT NULL,
        Description NVARCHAR(500) NULL,
        DefaultBillingTerms NVARCHAR(MAX) NULL,
        DefaultRoles NVARCHAR(MAX) NULL,
        DefaultDashboardSettings NVARCHAR(MAX) NULL,
        DefaultNotificationSettings NVARCHAR(MAX) NULL,
        DefaultReportSettings NVARCHAR(MAX) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE()
    );
END;

-- Track which template was applied to a school
IF COL_LENGTH('dbo.Schools', 'AppliedTemplateID') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD AppliedTemplateID INT NULL;
END;

-- =============================================
-- ROLES, PERMISSIONS, LEAVE TYPES, LEAVE BALANCES, YEAR-END CLOSING
-- =============================================

-- Staff Roles
IF OBJECT_ID('dbo.StaffRoles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StaffRoles (
        StaffRoleID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        RoleName NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500) NULL,
        Permissions NVARCHAR(MAX) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_StaffRoles_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StaffRoles_SchoolID' AND object_id = OBJECT_ID('dbo.StaffRoles'))
BEGIN
    CREATE INDEX IX_StaffRoles_SchoolID ON dbo.StaffRoles(SchoolID);
END;

-- User Role Assignments (many-to-many)
IF OBJECT_ID('dbo.UserRoleAssignments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserRoleAssignments (
        AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL,
        StaffRoleID INT NOT NULL,
        AssignedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_UserRoleAssign_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_UserRoleAssign_Roles FOREIGN KEY (StaffRoleID) REFERENCES dbo.StaffRoles(StaffRoleID),
        CONSTRAINT FK_UserRoleAssign_AssignedBy FOREIGN KEY (AssignedBy) REFERENCES dbo.Users(UserID),
        CONSTRAINT UQ_UserRoleAssign UNIQUE (UserID, StaffRoleID)
    );
END;

-- Leave Types (school-configurable)
IF OBJECT_ID('dbo.LeaveTypes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LeaveTypes (
        LeaveTypeID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        LeaveTypeName NVARCHAR(100) NOT NULL,
        IsPaid BIT NOT NULL DEFAULT 1,
        AnnualAllocation INT NOT NULL DEFAULT 0,
        RequiresApproval BIT NOT NULL DEFAULT 1,
        RequiresDocument BIT NOT NULL DEFAULT 0,
        CarryForwardAllowed BIT NOT NULL DEFAULT 0,
        AffectsPayroll BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_LeaveTypes_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LeaveTypes_SchoolID' AND object_id = OBJECT_ID('dbo.LeaveTypes'))
BEGIN
    CREATE INDEX IX_LeaveTypes_SchoolID ON dbo.LeaveTypes(SchoolID);
END;

-- Leave Balances (per employee, per leave type, per year)
IF OBJECT_ID('dbo.LeaveBalances', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LeaveBalances (
        LeaveBalanceID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL,
        LeaveTypeID INT NOT NULL,
        Year INT NOT NULL,
        Allocated INT NOT NULL DEFAULT 0,
        Used INT NOT NULL DEFAULT 0,
        Adjustment INT NOT NULL DEFAULT 0,
        AdjustmentReason NVARCHAR(500) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_LeaveBalances_Employees FOREIGN KEY (EmployeeID) REFERENCES dbo.Employees(EmployeeID),
        CONSTRAINT FK_LeaveBalances_LeaveTypes FOREIGN KEY (LeaveTypeID) REFERENCES dbo.LeaveTypes(LeaveTypeID),
        CONSTRAINT UQ_LeaveBalance_Emp_Type_Year UNIQUE (EmployeeID, LeaveTypeID, Year)
    );
END;

-- Year-End Financial Closing
IF OBJECT_ID('dbo.YearEndClosing', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.YearEndClosing (
        ClosingID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FinancialYear INT NOT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Open',
        TotalOutstanding DECIMAL(10,2) NOT NULL DEFAULT 0,
        TotalAdvanceCredit DECIMAL(10,2) NOT NULL DEFAULT 0,
        TotalInvoiced DECIMAL(10,2) NOT NULL DEFAULT 0,
        TotalPaid DECIMAL(10,2) NOT NULL DEFAULT 0,
        ClosedBy INT NULL,
        ClosedDate DATETIME NULL,
        ReopenedBy INT NULL,
        ReopenedDate DATETIME NULL,
        ReopenReason NVARCHAR(500) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_YearEndClosing_Status CHECK (Status IN ('Open','In Review','Ready to Close','Closed','Reopened for Correction')),
        CONSTRAINT FK_YearEndClosing_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_YearEndClosing_ClosedBy FOREIGN KEY (ClosedBy) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_YearEndClosing_ReopenedBy FOREIGN KEY (ReopenedBy) REFERENCES dbo.Users(UserID),
        CONSTRAINT UQ_YearEndClosing_School_Year UNIQUE (SchoolID, FinancialYear)
    );
END;

-- Balance Brought Forward records
IF OBJECT_ID('dbo.BalanceBroughtForward', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BalanceBroughtForward (
        BBFID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        FamilyID INT NULL,
        FromYear INT NOT NULL,
        ToYear INT NOT NULL,
        OutstandingAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
        AdvanceCreditAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_BBF_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_BBF_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT UQ_BBF_Student_Year UNIQUE (StudentID, FromYear, ToYear)
    );
END;

-- Update Admissions status constraint to use Refused instead of Rejected
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Admissions_Status')
BEGIN
    ALTER TABLE dbo.Admissions DROP CONSTRAINT CK_Admissions_Status;
    ALTER TABLE dbo.Admissions ADD CONSTRAINT CK_Admissions_Status CHECK (Status IN ('New','In Review','Accepted','Waitlisted','Refused','Enrolled'));
END;

-- Add LeaveTypeID to LeaveRequests for linking to configurable leave types
IF COL_LENGTH('dbo.LeaveRequests', 'LeaveTypeID') IS NULL
BEGIN
    ALTER TABLE dbo.LeaveRequests ADD LeaveTypeID INT NULL;
END;

-- School setting for manager leave approval
IF COL_LENGTH('dbo.Schools', 'EnableManagerLeaveApproval') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD EnableManagerLeaveApproval BIT NOT NULL DEFAULT 0;
END;

-- =============================================
-- SCHOOL NAME UNIQUENESS
-- =============================================

-- Add computed persisted column for normalized school name
IF COL_LENGTH('dbo.Schools', 'NormalizedSchoolName') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD NormalizedSchoolName AS UPPER(LTRIM(RTRIM(SchoolName))) PERSISTED;
END;

-- Add unique index on normalized school name to prevent duplicates at the database level
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Schools_NormalizedSchoolName' AND object_id = OBJECT_ID('dbo.Schools'))
BEGIN
    CREATE UNIQUE INDEX UX_Schools_NormalizedSchoolName ON dbo.Schools(NormalizedSchoolName);
END;

-- =============================================
-- FINANCE FIXES: Transaction allocation, Employee payroll, Payslip details, Bank statement import
-- =============================================

-- Transaction allocation status and type
IF COL_LENGTH('dbo.Transactions', 'AllocationStatus') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD AllocationStatus NVARCHAR(50) NOT NULL DEFAULT 'Unallocated';
END;

IF COL_LENGTH('dbo.Transactions', 'AllocationType') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD AllocationType NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'FamilyID') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD FamilyID INT NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'StudentID') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD StudentID INT NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'AllocatedBy') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD AllocatedBy INT NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'AllocatedDate') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD AllocatedDate DATETIME NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'BankTransactionKey') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD BankTransactionKey NVARCHAR(500) NULL;
END;

-- Bank statement import tracking columns
IF COL_LENGTH('dbo.BankStatements', 'UploadedBy') IS NULL
BEGIN
    ALTER TABLE dbo.BankStatements ADD UploadedBy INT NULL;
END;

IF COL_LENGTH('dbo.BankStatements', 'TotalRows') IS NULL
BEGIN
    ALTER TABLE dbo.BankStatements ADD TotalRows INT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.BankStatements', 'RowsImported') IS NULL
BEGIN
    ALTER TABLE dbo.BankStatements ADD RowsImported INT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.BankStatements', 'RowsSkippedDuplicate') IS NULL
BEGIN
    ALTER TABLE dbo.BankStatements ADD RowsSkippedDuplicate INT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.BankStatements', 'RowsSkippedPending') IS NULL
BEGIN
    ALTER TABLE dbo.BankStatements ADD RowsSkippedPending INT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.BankStatements', 'StatementEndDate') IS NULL
BEGIN
    ALTER TABLE dbo.BankStatements ADD StatementEndDate DATE NULL;
END;

-- Employee payroll detail fields
IF COL_LENGTH('dbo.Employees', 'EmployeeNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD EmployeeNumber NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'IdNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD IdNumber NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'PassportNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD PassportNumber NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'TaxNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD TaxNumber NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'UifNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD UifNumber NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'PaymentMethod') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD PaymentMethod NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'BankName') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD BankName NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'BankAccountNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD BankAccountNumber NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'BranchCode') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD BranchCode NVARCHAR(20) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'AccountType') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD AccountType NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'StandardAllowances') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD StandardAllowances DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Employees', 'StandardDeductions') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD StandardDeductions DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Employees', 'TaxPaye') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD TaxPaye DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Employees', 'UifDeduction') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD UifDeduction DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

-- Payslip detail fields for itemised payslip
IF COL_LENGTH('dbo.Payslips', 'BasicSalary') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD BasicSalary DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'Allowances') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD Allowances DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'Overtime') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD Overtime DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'Bonus') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD Bonus DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'LeaveDeduction') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD LeaveDeduction DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'TaxPaye') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD TaxPaye DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'UifDeduction') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD UifDeduction DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'OtherDeductions') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD OtherDeductions DECIMAL(10,2) NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Payslips', 'PaymentDate') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD PaymentDate DATE NULL;
END;

IF COL_LENGTH('dbo.Payslips', 'Status') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD Status NVARCHAR(50) NOT NULL DEFAULT 'Draft';
END;

IF COL_LENGTH('dbo.Payslips', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD CreatedBy INT NULL;
END;

IF COL_LENGTH('dbo.Payslips', 'FinalizedBy') IS NULL
BEGIN
    ALTER TABLE dbo.Payslips ADD FinalizedBy INT NULL;
END;

UPDATE dbo.Payslips
SET Status = 'Finalized'
WHERE IsFinalized = 1 AND ISNULL(Status, '') <> 'Finalized';

UPDATE dbo.Payslips
SET PaymentDate = CONVERT(date, FinalizedDate)
WHERE PaymentDate IS NULL AND FinalizedDate IS NOT NULL;

UPDATE dbo.Payslips
SET BasicSalary = GrossAmount
WHERE ISNULL(BasicSalary, 0) = 0 AND GrossAmount > 0;

UPDATE dbo.Payslips
SET TaxPaye = Deductions
WHERE ISNULL(TaxPaye, 0) = 0 AND ISNULL(Deductions, 0) > 0;

UPDATE dbo.Employees
SET EmployeeNumber = 'EMP-' + RIGHT('00000' + CAST(EmployeeID AS NVARCHAR(10)), 5)
WHERE EmployeeNumber IS NULL OR LTRIM(RTRIM(EmployeeNumber)) = '';

UPDATE p
SET CreatedBy = u.UserID
FROM dbo.Payslips p
INNER JOIN dbo.Employees e ON e.EmployeeID = p.EmployeeID
OUTER APPLY (
    SELECT TOP 1 UserID
    FROM dbo.Users
    WHERE SchoolID = e.SchoolID AND Role = 'school' AND ISNULL(HasHrPermission, 0) = 1 AND ISNULL(IsActive, 1) = 1
    ORDER BY UserID
) u
WHERE p.CreatedBy IS NULL AND u.UserID IS NOT NULL;

UPDATE p
SET FinalizedBy = u.UserID
FROM dbo.Payslips p
INNER JOIN dbo.Employees e ON e.EmployeeID = p.EmployeeID
OUTER APPLY (
    SELECT TOP 1 UserID
    FROM dbo.Users
    WHERE SchoolID = e.SchoolID AND Role = 'school' AND ISNULL(HasHrPermission, 0) = 1 AND ISNULL(IsActive, 1) = 1
    ORDER BY UserID
) u
WHERE p.IsFinalized = 1 AND p.FinalizedBy IS NULL AND u.UserID IS NOT NULL;

-- Index for transaction duplicate key checking
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Transactions_BankTransactionKey' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    CREATE INDEX IX_Transactions_BankTransactionKey ON dbo.Transactions(BankTransactionKey) WHERE BankTransactionKey IS NOT NULL;
END;

-- Index for transaction allocation status
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Transactions_AllocationStatus' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    CREATE INDEX IX_Transactions_AllocationStatus ON dbo.Transactions(SchoolID, AllocationStatus);
END;

-- =============================================
-- GRANT FULL ACCESS TO TEST USERS
-- =============================================

-- Ensure all existing school and admin users have HR permission for testing
UPDATE dbo.Users SET HasHrPermission = 1 WHERE Role IN ('admin', 'school') AND HasHrPermission = 0;

-- Enable staff payslip view for test schools
UPDATE dbo.Schools SET AllowStaffPayslipView = 1 WHERE AllowStaffPayslipView = 0;
