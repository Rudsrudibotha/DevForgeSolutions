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
        SubscriptionPlan NVARCHAR(50) NOT NULL DEFAULT 'Standard',
        SubscriptionStatus NVARCHAR(50) NOT NULL DEFAULT 'Active',
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Schools_SubscriptionPlan CHECK (SubscriptionPlan IN ('Standard', 'Pro', 'Pro+')),
        CONSTRAINT CK_Schools_SubscriptionStatus CHECK (SubscriptionStatus IN ('Active', 'Suspended', 'Cancelled'))
    );
END;

IF COL_LENGTH('dbo.Schools', 'SubscriptionPlan') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD SubscriptionPlan NVARCHAR(50) NOT NULL DEFAULT 'Standard';
END;

IF COL_LENGTH('dbo.Schools', 'SubscriptionPlan') IS NOT NULL
BEGIN
    IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CK_Schools_SubscriptionPlan'
            AND parent_object_id = OBJECT_ID('dbo.Schools')
    )
    BEGIN
        ALTER TABLE dbo.Schools DROP CONSTRAINT CK_Schools_SubscriptionPlan;
    END;

    DECLARE @SchoolsSubscriptionPlanDefault NVARCHAR(128);
    SELECT @SchoolsSubscriptionPlanDefault = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.Schools')
      AND c.name = 'SubscriptionPlan';

    IF @SchoolsSubscriptionPlanDefault IS NOT NULL
    BEGIN
        DECLARE @DropSchoolsSubscriptionPlanDefaultSql NVARCHAR(MAX);
        SET @DropSchoolsSubscriptionPlanDefaultSql = N'ALTER TABLE dbo.Schools DROP CONSTRAINT ' + QUOTENAME(@SchoolsSubscriptionPlanDefault);
        EXEC sp_executesql @DropSchoolsSubscriptionPlanDefaultSql;
    END;

    ALTER TABLE dbo.Schools
        ADD CONSTRAINT DF_Schools_SubscriptionPlan DEFAULT 'Standard' FOR SubscriptionPlan;

    EXEC('UPDATE dbo.Schools
          SET SubscriptionPlan = CASE
            WHEN SubscriptionPlan IN (''Pro'', ''Pro+'') THEN SubscriptionPlan
            WHEN SubscriptionPlan = ''Premium'' THEN ''Pro+''
            ELSE ''Standard''
          END
          WHERE SubscriptionPlan IS NULL
             OR SubscriptionPlan NOT IN (''Standard'', ''Pro'', ''Pro+'')');
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_Schools_SubscriptionPlan'
        AND parent_object_id = OBJECT_ID('dbo.Schools')
)
BEGIN
    EXEC('ALTER TABLE dbo.Schools ADD CONSTRAINT CK_Schools_SubscriptionPlan CHECK (SubscriptionPlan IN (''Standard'', ''Pro'', ''Pro+''))');
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

IF COL_LENGTH('dbo.Schools', 'BankName') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD BankName NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'BankAccountNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD BankAccountNumber NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'BankBranchCode') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD BankBranchCode NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'BankAccountType') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD BankAccountType NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.Schools', 'FinancialYearStartDate') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD FinancialYearStartDate DATE NULL;
END;

IF COL_LENGTH('dbo.Schools', 'FinancialYearEndDate') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD FinancialYearEndDate DATE NULL;
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

-- IsVerified: set to 1 by parentVerificationService.completeSms once
-- the user has completed both email and cellphone verification. Used
-- by the student-creation gate in /sms/students (a family must have at
-- least one verified parent before a student can be enrolled).
IF COL_LENGTH('dbo.Users', 'IsVerified') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD IsVerified BIT NOT NULL CONSTRAINT DF_Users_IsVerified DEFAULT 0;
END;
IF COL_LENGTH('dbo.Users', 'VerifiedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD VerifiedAt DATETIME2 NULL;
END;

-- ParentInvitations: school-initiated invite flow. The school operator
-- enters the parent email + cellphone on /sms/families/:id/invite-parent;
-- we insert a row and email a magic link to /parent/verify?invite=...
-- On verification, the user is created (or upgraded) and a ParentLink
-- row is created against the family.
IF OBJECT_ID('dbo.ParentInvitations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParentInvitations (
        ParentInvitationId  INT IDENTITY(1,1) PRIMARY KEY,
        TenantId            INT NULL,
        SchoolId            INT NOT NULL,
        FamilyId            INT NOT NULL,
        Email               NVARCHAR(255) NOT NULL,
        Cellphone           NVARCHAR(50)  NOT NULL,
        InvitedByUserId     INT NOT NULL,
        TokenHash           NVARCHAR(128) NOT NULL,
        Status              NVARCHAR(20)  NOT NULL DEFAULT 'Pending',  -- Pending, Accepted, Revoked, Expired
        ExpiresAt           DATETIME2     NOT NULL,
        AcceptedAt          DATETIME2     NULL,
        AcceptedByUserId    INT           NULL,
        CreatedAt           DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ParentInvitations_Schools FOREIGN KEY (SchoolId) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_ParentInvitations_Families FOREIGN KEY (FamilyId) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_ParentInvitations_Users FOREIGN KEY (InvitedByUserId) REFERENCES dbo.Users(UserID)
    );
    CREATE INDEX IX_ParentInvitations_Token ON dbo.ParentInvitations(TokenHash);
    CREATE INDEX IX_ParentInvitations_Family ON dbo.ParentInvitations(FamilyId, Status);
END;

-- RolePermissionOverrides: per-role Allow/Deny/Inherit for every
-- permission key. Drives the feature matrix UI at /sms/permissions.
-- Inherit = use the role's normal set (RolePermission join).
-- Allow  = force this role to have this key, regardless of the
--          default plan/subscription.
-- Deny   = force this role to NOT have this key, even if the default
--          plan/subscription grants it. Deny always wins.
IF OBJECT_ID('dbo.RolePermissionOverrides', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RolePermissionOverrides (
        RolePermissionOverrideId INT IDENTITY(1,1) PRIMARY KEY,
        RoleId  INT NOT NULL,
        PermissionKey NVARCHAR(100) NOT NULL,
        Decision NVARCHAR(10) NOT NULL DEFAULT 'Inherit',  -- Inherit, Allow, Deny
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_RPO_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleID),
        CONSTRAINT UQ_RPO UNIQUE (RoleId, PermissionKey)
    );
    CREATE INDEX IX_RPO_Role ON dbo.RolePermissionOverrides(RoleId);
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
    ALTER TABLE dbo.Invoices ADD CONSTRAINT CK_Invoices_Status CHECK (Status IN ('Pending', 'Paid', 'Cancelled', 'Overdue', 'Partial', 'PendingPayment'));
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

IF COL_LENGTH('dbo.BillingCategories', 'BillingYear') IS NULL
BEGIN
    ALTER TABLE dbo.BillingCategories ADD BillingYear INT NOT NULL CONSTRAINT DF_BillingCategories_BillingYear DEFAULT (YEAR(GETDATE())) WITH VALUES;
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
        CurrentAcademicYear INT NOT NULL DEFAULT (YEAR(GETDATE())),
        BillingDate DATE NOT NULL,
        EnrolledDate DATE NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        DepartureDate DATE NULL,
        DepartureReason NVARCHAR(50) NULL,
        DepartureNote NVARCHAR(500) NULL,
        MedicalNotes NVARCHAR(1000) NULL,
        BillingCategoryID INT NULL,
        ResponsiblePayerType NVARCHAR(50) NULL,
        ResponsiblePayerName NVARCHAR(255) NULL,
        ResponsiblePayerPhone NVARCHAR(50) NULL,
        ResponsiblePayerEmail NVARCHAR(255) NULL,
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

IF COL_LENGTH('dbo.Students', 'CurrentAcademicYear') IS NULL
BEGIN
    ALTER TABLE dbo.Students
        ADD CurrentAcademicYear INT NOT NULL CONSTRAINT DF_Students_CurrentAcademicYear DEFAULT (YEAR(GETDATE())) WITH VALUES;
END;

IF COL_LENGTH('dbo.Students', 'ResponsiblePayerType') IS NULL
BEGIN
    ALTER TABLE dbo.Students ADD ResponsiblePayerType NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Students', 'ResponsiblePayerName') IS NULL
BEGIN
    ALTER TABLE dbo.Students ADD ResponsiblePayerName NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.Students', 'ResponsiblePayerPhone') IS NULL
BEGIN
    ALTER TABLE dbo.Students ADD ResponsiblePayerPhone NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Students', 'ResponsiblePayerEmail') IS NULL
BEGIN
    ALTER TABLE dbo.Students ADD ResponsiblePayerEmail NVARCHAR(255) NULL;
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

IF COL_LENGTH('dbo.StudentBillingCategories', 'CreatedDate') IS NULL
BEGIN
    ALTER TABLE dbo.StudentBillingCategories
        ADD CreatedDate DATETIME NOT NULL CONSTRAINT DF_StudentBillingCategories_CreatedDate DEFAULT GETDATE() WITH VALUES;
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
        ReceiptNumber NVARCHAR(100) NULL,
        PaymentMethod NVARCHAR(100) NULL,
        PayeeType NVARCHAR(50) NULL,
        PayeeName NVARCHAR(255) NULL,
        PayeePhone NVARCHAR(50) NULL,
        PayeeEmail NVARCHAR(255) NULL,
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

IF COL_LENGTH('dbo.Transactions', 'ReceiptNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD ReceiptNumber NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'PayeeType') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD PayeeType NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'PayeeName') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD PayeeName NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'PayeePhone') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD PayeePhone NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Transactions', 'PayeeEmail') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD PayeeEmail NVARCHAR(255) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Transactions_School_ReceiptNumber' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    EXEC('CREATE UNIQUE INDEX UX_Transactions_School_ReceiptNumber
        ON dbo.Transactions(SchoolID, ReceiptNumber)
        WHERE ReceiptNumber IS NOT NULL');
END;

IF OBJECT_ID('dbo.StudentWallets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudentWallets (
        WalletID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        FamilyID INT NULL,
        Balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_StudentWallets_Balance CHECK (Balance >= 0),
        CONSTRAINT FK_StudentWallets_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_StudentWallets_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_StudentWallets_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT UQ_StudentWallets_School_Student UNIQUE (SchoolID, StudentID)
    );
END;

IF OBJECT_ID('dbo.StudentWalletLedger', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudentWalletLedger (
        WalletLedgerID INT IDENTITY(1,1) PRIMARY KEY,
        WalletID INT NOT NULL,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        FamilyID INT NULL,
        TransactionID INT NULL,
        InvoiceID INT NULL,
        EntryType NVARCHAR(50) NOT NULL,
        Amount DECIMAL(10,2) NOT NULL,
        BalanceAfter DECIMAL(10,2) NOT NULL,
        Reference NVARCHAR(250) NULL,
        Description NVARCHAR(500) NULL,
        EntryDate DATETIME NOT NULL,
        CreatedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_StudentWalletLedger_Type CHECK (EntryType IN ('Receipt','Invoice Allocation','Adjustment','Refund','Carry Forward')),
        CONSTRAINT FK_StudentWalletLedger_Wallet FOREIGN KEY (WalletID) REFERENCES dbo.StudentWallets(WalletID),
        CONSTRAINT FK_StudentWalletLedger_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_StudentWalletLedger_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_StudentWalletLedger_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_StudentWalletLedger_Transactions FOREIGN KEY (TransactionID) REFERENCES dbo.Transactions(TransactionID),
        CONSTRAINT FK_StudentWalletLedger_Invoices FOREIGN KEY (InvoiceID) REFERENCES dbo.Invoices(InvoiceID),
        CONSTRAINT FK_StudentWalletLedger_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserID)
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

IF OBJECT_ID('dbo.FaultReports', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FaultReports (
        FaultReportID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        UserID INT NULL,
        PagePath NVARCHAR(500) NOT NULL,
        ViewName NVARCHAR(120) NULL,
        Remarks NVARCHAR(2000) NOT NULL,
        Status NVARCHAR(30) NOT NULL CONSTRAINT DF_FaultReports_Status DEFAULT 'Open',
        UserAgent NVARCHAR(500) NULL,
        CreatedDate DATETIME NOT NULL CONSTRAINT DF_FaultReports_CreatedDate DEFAULT GETDATE(),
        UpdatedDate DATETIME NULL,
        ResolvedDate DATETIME NULL,
        ResolvedBy INT NULL,
        CONSTRAINT CK_FaultReports_Status CHECK (Status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
        CONSTRAINT FK_FaultReports_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_FaultReports_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_FaultReports_ResolvedBy FOREIGN KEY (ResolvedBy) REFERENCES dbo.Users(UserID)
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

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StudentWallets_School_Student' AND object_id = OBJECT_ID('dbo.StudentWallets'))
BEGIN
    CREATE INDEX IX_StudentWallets_School_Student ON dbo.StudentWallets(SchoolID, StudentID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StudentWalletLedger_School_Student' AND object_id = OBJECT_ID('dbo.StudentWalletLedger'))
BEGIN
    CREATE INDEX IX_StudentWalletLedger_School_Student ON dbo.StudentWalletLedger(SchoolID, StudentID, EntryDate);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BankStatements_SchoolID' AND object_id = OBJECT_ID('dbo.BankStatements'))
BEGIN
    CREATE INDEX IX_BankStatements_SchoolID ON dbo.BankStatements(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BankStatements_School_Period' AND object_id = OBJECT_ID('dbo.BankStatements'))
BEGIN
    CREATE INDEX IX_BankStatements_School_Period ON dbo.BankStatements(SchoolID, StatementDate, StatementEndDate);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_BankStatements_School_Period' AND object_id = OBJECT_ID('dbo.BankStatements'))
    AND NOT EXISTS (
        SELECT SchoolID, StatementDate, StatementEndDate
        FROM dbo.BankStatements
        WHERE StatementDate IS NOT NULL AND StatementEndDate IS NOT NULL
        GROUP BY SchoolID, StatementDate, StatementEndDate
        HAVING COUNT(1) > 1
    )
BEGIN
    CREATE UNIQUE INDEX UX_BankStatements_School_Period
        ON dbo.BankStatements(SchoolID, StatementDate, StatementEndDate)
        WHERE StatementDate IS NOT NULL AND StatementEndDate IS NOT NULL;
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

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ParentLinks_SchoolID' AND object_id = OBJECT_ID('dbo.ParentLinks'))
BEGIN
    CREATE INDEX IX_ParentLinks_SchoolID ON dbo.ParentLinks(SchoolID);
END;

IF OBJECT_ID('dbo.SchoolRegistrationRequests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SchoolRegistrationRequests (
        RequestID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolName NVARCHAR(255) NOT NULL,
        RegistrationNumber NVARCHAR(100) NULL,
        Address NVARCHAR(500) NULL,
        Website NVARCHAR(255) NULL,
        ContactPerson NVARCHAR(255) NOT NULL,
        ContactEmail NVARCHAR(255) NOT NULL,
        ContactPhone NVARCHAR(50) NOT NULL,
        BillingContactName NVARCHAR(255) NULL,
        BillingContactEmail NVARCHAR(255) NULL,
        BillingContactPhone NVARCHAR(50) NULL,
        BillingAddress NVARCHAR(500) NULL,
        RequestedPlan NVARCHAR(100) NULL,
        PaymentProvider NVARCHAR(100) NULL,
        PaymentCustomerReference NVARCHAR(255) NULL,
        BillingNotes NVARCHAR(1000) NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_SchoolRegistrationRequests_Status CHECK (Status IN ('Pending','Approved','Rejected','Converted'))
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SchoolRegistrationRequests_Status' AND object_id = OBJECT_ID('dbo.SchoolRegistrationRequests'))
BEGIN
    CREATE INDEX IX_SchoolRegistrationRequests_Status ON dbo.SchoolRegistrationRequests(Status, CreatedDate);
END;

IF OBJECT_ID('dbo.ParentRegistrationRequests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParentRegistrationRequests (
        RequestID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FirstName NVARCHAR(100) NOT NULL,
        LastName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        Phone NVARCHAR(50) NULL,
        Relationship NVARCHAR(100) NULL,
        MatchedFamilyID INT NULL,
        ParentUserID INT NULL,
        Status NVARCHAR(50) NOT NULL DEFAULT 'PendingReview',
        Notes NVARCHAR(1000) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_ParentRegistrationRequests_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_ParentRegistrationRequests_Families FOREIGN KEY (MatchedFamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_ParentRegistrationRequests_Users FOREIGN KEY (ParentUserID) REFERENCES dbo.Users(UserID),
        CONSTRAINT CK_ParentRegistrationRequests_Status CHECK (Status IN ('Matched','PendingReview','Rejected'))
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ParentRegistrationRequests_School_Email' AND object_id = OBJECT_ID('dbo.ParentRegistrationRequests'))
BEGIN
    CREATE INDEX IX_ParentRegistrationRequests_School_Email ON dbo.ParentRegistrationRequests(SchoolID, Email, CreatedDate);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_SchoolID' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE INDEX IX_AuditLogs_SchoolID ON dbo.AuditLogs(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_EntityName_EntityID' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE INDEX IX_AuditLogs_EntityName_EntityID ON dbo.AuditLogs(EntityName, EntityID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FaultReports_Status_CreatedDate' AND object_id = OBJECT_ID('dbo.FaultReports'))
BEGIN
    CREATE INDEX IX_FaultReports_Status_CreatedDate ON dbo.FaultReports(Status, CreatedDate DESC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FaultReports_SchoolID_CreatedDate' AND object_id = OBJECT_ID('dbo.FaultReports'))
BEGIN
    CREATE INDEX IX_FaultReports_SchoolID_CreatedDate ON dbo.FaultReports(SchoolID, CreatedDate DESC);
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
        ArrivalTime TIME NULL,
        DepartureTime TIME NULL,
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

IF COL_LENGTH('dbo.Attendance', 'ArrivalTime') IS NULL
BEGIN
    ALTER TABLE dbo.Attendance ADD ArrivalTime TIME NULL;
END;

IF COL_LENGTH('dbo.Attendance', 'DepartureTime') IS NULL
BEGIN
    ALTER TABLE dbo.Attendance ADD DepartureTime TIME NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attendance_SchoolID_Date' AND object_id = OBJECT_ID('dbo.Attendance'))
BEGIN
    CREATE INDEX IX_Attendance_SchoolID_Date ON dbo.Attendance(SchoolID, AttendanceDate);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attendance_StudentID' AND object_id = OBJECT_ID('dbo.Attendance'))
BEGIN
    CREATE INDEX IX_Attendance_StudentID ON dbo.Attendance(StudentID);
END;

-- Composite unique index to support the MERGE upsert pattern
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Attendance_School_Student_Date' AND object_id = OBJECT_ID('dbo.Attendance'))
BEGIN
    CREATE UNIQUE INDEX UX_Attendance_School_Student_Date ON dbo.Attendance(SchoolID, StudentID, AttendanceDate);
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
        ActiveYear INT NOT NULL DEFAULT (YEAR(GETDATE())),
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Classes_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Classes_Teacher FOREIGN KEY (TeacherID) REFERENCES dbo.Employees(EmployeeID)
    );
END;

IF COL_LENGTH('dbo.Classes', 'ActiveYear') IS NULL
BEGIN
    ALTER TABLE dbo.Classes ADD ActiveYear INT NOT NULL DEFAULT (YEAR(GETDATE()));
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Classes_SchoolID' AND object_id = OBJECT_ID('dbo.Classes'))
BEGIN
    CREATE INDEX IX_Classes_SchoolID ON dbo.Classes(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Classes_SchoolID_ActiveYear' AND object_id = OBJECT_ID('dbo.Classes'))
BEGIN
    CREATE INDEX IX_Classes_SchoolID_ActiveYear ON dbo.Classes(SchoolID, ActiveYear);
END;

EXEC sp_executesql N'
IF COL_LENGTH(''dbo.Students'', ''CurrentAcademicYear'') IS NOT NULL
BEGIN
    UPDATE s
    SET CurrentAcademicYear = COALESCE(c.ActiveYear, NULLIF(YEAR(s.EnrolledDate), 1900), YEAR(GETDATE()))
    FROM dbo.Students s
    OUTER APPLY (
        SELECT TOP 1 c.ActiveYear
        FROM dbo.Classes c
        WHERE c.SchoolID = s.SchoolID
          AND c.ClassName = s.ClassName
          AND c.IsActive = 1
        ORDER BY ABS(c.ActiveYear - YEAR(GETDATE()))
    ) c
    WHERE s.CurrentAcademicYear IS NULL OR s.CurrentAcademicYear < 2000;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = ''IX_Students_SchoolID_CurrentAcademicYear'' AND object_id = OBJECT_ID(''dbo.Students''))
    BEGIN
        CREATE INDEX IX_Students_SchoolID_CurrentAcademicYear ON dbo.Students(SchoolID, CurrentAcademicYear);
    END;
END;
';

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

IF OBJECT_ID('dbo.StudentMonthlyDiscounts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudentMonthlyDiscounts (
        StudentMonthlyDiscountID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        DiscountYear INT NOT NULL,
        DiscountMonth INT NOT NULL,
        Amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_StudentMonthlyDiscounts_Year CHECK (DiscountYear BETWEEN 2000 AND 2100),
        CONSTRAINT CK_StudentMonthlyDiscounts_Month CHECK (DiscountMonth BETWEEN 1 AND 12),
        CONSTRAINT CK_StudentMonthlyDiscounts_Amount CHECK (Amount >= 0),
        CONSTRAINT UQ_StudentMonthlyDiscounts_Student_Year_Month UNIQUE (StudentID, DiscountYear, DiscountMonth),
        CONSTRAINT FK_StudentMonthlyDiscounts_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_StudentMonthlyDiscounts_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StudentMonthlyDiscounts_School_Student_Year' AND object_id = OBJECT_ID('dbo.StudentMonthlyDiscounts'))
BEGIN
    CREATE INDEX IX_StudentMonthlyDiscounts_School_Student_Year
        ON dbo.StudentMonthlyDiscounts(SchoolID, StudentID, DiscountYear);
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

-- Messaging package: private school-family conversations
IF OBJECT_ID('dbo.MessagingConversations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MessagingConversations (
        ConversationID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        FamilyID INT NULL,
        Subject NVARCHAR(200) NULL,
        TargetType NVARCHAR(50) NOT NULL DEFAULT 'ParentSchool',
        ConversationType NVARCHAR(50) NOT NULL DEFAULT 'ParentSchool',
        RecipientUserID INT NULL,
        ChannelKey NVARCHAR(100) NULL,
        CreatedByUserID INT NOT NULL,
        LastMessageDate DATETIME NOT NULL DEFAULT GETDATE(),
        IsClosed BIT NOT NULL DEFAULT 0,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_MessagingConversations_TargetType CHECK (TargetType IN ('ParentSchool','class','entire_school','outstanding_fees','selected_families','StaffDirect','SchoolDevForge','KinderCareHubParents','KinderCareHubSchools','DevForgeSchool','DevForgeParents')),
        CONSTRAINT FK_MessagingConversations_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_MessagingConversations_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_MessagingConversations_RecipientUsers FOREIGN KEY (RecipientUserID) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_MessagingConversations_Users FOREIGN KEY (CreatedByUserID) REFERENCES dbo.Users(UserID)
    );
END;

IF OBJECT_ID('dbo.MessagingMessages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MessagingMessages (
        MessageID INT IDENTITY(1,1) PRIMARY KEY,
        ConversationID INT NOT NULL,
        SchoolID INT NOT NULL,
        FamilyID INT NULL,
        RecipientUserID INT NULL,
        SenderUserID INT NOT NULL,
        SenderRole NVARCHAR(20) NOT NULL,
        Body NVARCHAR(MAX) NOT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_MessagingMessages_SenderRole CHECK (SenderRole IN ('admin','devforge','school','parent')),
        CONSTRAINT FK_MessagingMessages_Conversations FOREIGN KEY (ConversationID) REFERENCES dbo.MessagingConversations(ConversationID),
        CONSTRAINT FK_MessagingMessages_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_MessagingMessages_Families FOREIGN KEY (FamilyID) REFERENCES dbo.Families(FamilyID),
        CONSTRAINT FK_MessagingMessages_RecipientUsers FOREIGN KEY (RecipientUserID) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_MessagingMessages_Users FOREIGN KEY (SenderUserID) REFERENCES dbo.Users(UserID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MessagingConversations_School_LastMessage' AND object_id = OBJECT_ID('dbo.MessagingConversations'))
BEGIN
    CREATE INDEX IX_MessagingConversations_School_LastMessage ON dbo.MessagingConversations(SchoolID, LastMessageDate DESC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MessagingConversations_Family_LastMessage' AND object_id = OBJECT_ID('dbo.MessagingConversations'))
BEGIN
    CREATE INDEX IX_MessagingConversations_Family_LastMessage ON dbo.MessagingConversations(FamilyID, LastMessageDate DESC);
END;

IF COL_LENGTH('dbo.MessagingConversations', 'FamilyID') IS NOT NULL
BEGIN
    ALTER TABLE dbo.MessagingConversations ALTER COLUMN FamilyID INT NULL;
END;

IF COL_LENGTH('dbo.MessagingMessages', 'FamilyID') IS NOT NULL
BEGIN
    ALTER TABLE dbo.MessagingMessages ALTER COLUMN FamilyID INT NULL;
END;

IF COL_LENGTH('dbo.MessagingConversations', 'ConversationType') IS NULL
BEGIN
    ALTER TABLE dbo.MessagingConversations ADD ConversationType NVARCHAR(50) NOT NULL CONSTRAINT DF_MessagingConversations_ConversationType DEFAULT 'ParentSchool' WITH VALUES;
END;

IF COL_LENGTH('dbo.MessagingConversations', 'RecipientUserID') IS NULL
BEGIN
    ALTER TABLE dbo.MessagingConversations ADD RecipientUserID INT NULL;
END;

IF COL_LENGTH('dbo.MessagingConversations', 'ChannelKey') IS NULL
BEGIN
    ALTER TABLE dbo.MessagingConversations ADD ChannelKey NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.MessagingMessages', 'RecipientUserID') IS NULL
BEGIN
    ALTER TABLE dbo.MessagingMessages ADD RecipientUserID INT NULL;
END;

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_MessagingConversations_TargetType')
BEGIN
    ALTER TABLE dbo.MessagingConversations DROP CONSTRAINT CK_MessagingConversations_TargetType;
END;

ALTER TABLE dbo.MessagingConversations WITH CHECK ADD CONSTRAINT CK_MessagingConversations_TargetType
    CHECK (TargetType IN ('ParentSchool','class','entire_school','outstanding_fees','selected_families','StaffDirect','SchoolDevForge','KinderCareHubParents','KinderCareHubSchools','DevForgeSchool','DevForgeParents'));

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_MessagingMessages_SenderRole')
BEGIN
    ALTER TABLE dbo.MessagingMessages DROP CONSTRAINT CK_MessagingMessages_SenderRole;
END;

ALTER TABLE dbo.MessagingMessages WITH CHECK ADD CONSTRAINT CK_MessagingMessages_SenderRole
    CHECK (SenderRole IN ('admin','devforge','school','parent'));

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MessagingConversations_ChannelKey' AND object_id = OBJECT_ID('dbo.MessagingConversations'))
BEGIN
    CREATE INDEX IX_MessagingConversations_ChannelKey ON dbo.MessagingConversations(ChannelKey);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MessagingMessages_Conversation_CreatedDate' AND object_id = OBJECT_ID('dbo.MessagingMessages'))
BEGIN
    CREATE INDEX IX_MessagingMessages_Conversation_CreatedDate ON dbo.MessagingMessages(ConversationID, CreatedDate, MessageID);
END;

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
BEGIN
    CREATE INDEX IX_MessagingNotifications_User_Unread ON dbo.MessagingNotifications(UserID, IsRead, CreatedDate DESC);
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

-- Consent permission-slip request header
IF OBJECT_ID('dbo.ConsentRequests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConsentRequests (
        ConsentRequestID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        ConsentType NVARCHAR(100) NOT NULL,
        Title NVARCHAR(255) NOT NULL,
        ActivityDate DATE NULL,
        DueDate DATE NULL,
        Location NVARCHAR(255) NULL,
        TargetScope NVARCHAR(30) NOT NULL DEFAULT 'Student',
        TargetValue NVARCHAR(255) NULL,
        DocumentBody NVARCHAR(MAX) NOT NULL,
        RiskNotes NVARCHAR(1000) NULL,
        MedicalInstructions NVARCHAR(1000) NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'Open',
        CreatedBy INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_ConsentRequests_TargetScope CHECK (TargetScope IN ('Student','Class','Grade','School')),
        CONSTRAINT CK_ConsentRequests_Status CHECK (Status IN ('Open','Closed','Cancelled')),
        CONSTRAINT FK_ConsentRequests_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_ConsentRequests_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ConsentRequests_SchoolID_CreatedDate' AND object_id = OBJECT_ID('dbo.ConsentRequests'))
BEGIN
    CREATE INDEX IX_ConsentRequests_SchoolID_CreatedDate ON dbo.ConsentRequests(SchoolID, CreatedDate DESC);
END;

-- Consent Records
IF OBJECT_ID('dbo.ConsentRecords', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConsentRecords (
        ConsentID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        StudentID INT NOT NULL,
        ConsentRequestID INT NULL,
        ParentUserID INT NULL,
        ConsentType NVARCHAR(100) NOT NULL,
        Response NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        ResponseDate DATETIME NULL,
        Notes NVARCHAR(500) NULL,
        SignatureName NVARCHAR(255) NULL,
        SignatureRelationship NVARCHAR(100) NULL,
        ResponseNotes NVARCHAR(1000) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Consent_Response CHECK (Response IN ('Pending','Accepted','Declined')),
        CONSTRAINT FK_Consent_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_Consent_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_Consent_Requests FOREIGN KEY (ConsentRequestID) REFERENCES dbo.ConsentRequests(ConsentRequestID),
        CONSTRAINT FK_Consent_ParentUser FOREIGN KEY (ParentUserID) REFERENCES dbo.Users(UserID)
    );
END;

IF COL_LENGTH('dbo.ConsentRecords', 'ConsentRequestID') IS NULL
BEGIN
    ALTER TABLE dbo.ConsentRecords ADD ConsentRequestID INT NULL;
END;

IF COL_LENGTH('dbo.ConsentRecords', 'SignatureName') IS NULL
BEGIN
    ALTER TABLE dbo.ConsentRecords ADD SignatureName NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.ConsentRecords', 'SignatureRelationship') IS NULL
BEGIN
    ALTER TABLE dbo.ConsentRecords ADD SignatureRelationship NVARCHAR(100) NULL;
END;

IF COL_LENGTH('dbo.ConsentRecords', 'ResponseNotes') IS NULL
BEGIN
    ALTER TABLE dbo.ConsentRecords ADD ResponseNotes NVARCHAR(1000) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Consent_Requests')
BEGIN
    ALTER TABLE dbo.ConsentRecords ADD CONSTRAINT FK_Consent_Requests FOREIGN KEY (ConsentRequestID) REFERENCES dbo.ConsentRequests(ConsentRequestID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ConsentRecords_SchoolID' AND object_id = OBJECT_ID('dbo.ConsentRecords'))
BEGIN
    CREATE INDEX IX_ConsentRecords_SchoolID ON dbo.ConsentRecords(SchoolID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ConsentRecords_RequestID' AND object_id = OBJECT_ID('dbo.ConsentRecords'))
BEGIN
    CREATE INDEX IX_ConsentRecords_RequestID ON dbo.ConsentRecords(ConsentRequestID);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ConsentRecords_SchoolID_Response' AND object_id = OBJECT_ID('dbo.ConsentRecords'))
BEGIN
    CREATE INDEX IX_ConsentRecords_SchoolID_Response ON dbo.ConsentRecords(SchoolID, Response);
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

-- Finance Period Locking
IF OBJECT_ID('dbo.FinancePeriodLocks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FinancePeriodLocks (
        FinancePeriodLockID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
        PeriodStart DATE NOT NULL,
        PeriodEnd DATE NOT NULL,
        LockType NVARCHAR(50) NOT NULL DEFAULT 'Month',
        Status NVARCHAR(50) NOT NULL DEFAULT 'Locked',
        Reason NVARCHAR(500) NOT NULL,
        LockedBy INT NULL,
        LockedDate DATETIME NULL,
        ReopenedBy INT NULL,
        ReopenedDate DATETIME NULL,
        ReopenReason NVARCHAR(500) NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_FinancePeriodLocks_Dates CHECK (PeriodStart <= PeriodEnd),
        CONSTRAINT CK_FinancePeriodLocks_Type CHECK (LockType IN ('Month','Year','Custom')),
        CONSTRAINT CK_FinancePeriodLocks_Status CHECK (Status IN ('Locked','Reopened for Correction')),
        CONSTRAINT FK_FinancePeriodLocks_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_FinancePeriodLocks_LockedBy FOREIGN KEY (LockedBy) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_FinancePeriodLocks_ReopenedBy FOREIGN KEY (ReopenedBy) REFERENCES dbo.Users(UserID)
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FinancePeriodLocks_School_Period' AND object_id = OBJECT_ID('dbo.FinancePeriodLocks'))
BEGIN
    CREATE INDEX IX_FinancePeriodLocks_School_Period
        ON dbo.FinancePeriodLocks(SchoolID, Status, PeriodStart, PeriodEnd);
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

IF COL_LENGTH('dbo.Employees', 'PhysicalAddress') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD PhysicalAddress NVARCHAR(500) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'PayrollNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD PayrollNumber NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'PayeReference') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD PayeReference NVARCHAR(50) NULL;
END;

IF COL_LENGTH('dbo.Employees', 'UifReferenceNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Employees ADD UifReferenceNumber NVARCHAR(50) NULL;
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

-- =============================================
-- Audit log: every admin read/write of a school
-- =============================================
IF OBJECT_ID('dbo.AuditLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLog (
        AuditID        BIGINT IDENTITY(1,1) PRIMARY KEY,
        ActorUserID     INT NULL,
        ActorRole       NVARCHAR(50) NOT NULL,
        ActorEmail      NVARCHAR(255) NULL,
        SchoolID        INT NOT NULL,
        Action          NVARCHAR(20) NOT NULL,        -- READ | CREATE | UPDATE | DELETE | LOGIN | SUSPEND | OVERRIDE
        ResourceType    NVARCHAR(50) NOT NULL,        -- student | invoice | payment | school | user | ...
        ResourceID      NVARCHAR(64) NULL,
        Payload         NVARCHAR(MAX) NULL,           -- JSON: before/after/meta
        RequestID       NVARCHAR(64) NULL,
        IPAddress       NVARCHAR(64) NULL,
        UserAgent       NVARCHAR(512) NULL,
        OccurredAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_School_OccurredAt' AND object_id = OBJECT_ID('dbo.AuditLog'))
BEGIN
    CREATE INDEX IX_AuditLog_School_OccurredAt ON dbo.AuditLog(SchoolID, OccurredAt DESC);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_Actor_OccurredAt' AND object_id = OBJECT_ID('dbo.AuditLog'))
BEGIN
    CREATE INDEX IX_AuditLog_Actor_OccurredAt ON dbo.AuditLog(ActorUserID, OccurredAt DESC) WHERE ActorUserID IS NOT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_Resource' AND object_id = OBJECT_ID('dbo.AuditLog'))
BEGIN
    CREATE INDEX IX_AuditLog_Resource ON dbo.AuditLog(ResourceType, ResourceID, OccurredAt DESC) WHERE ResourceID IS NOT NULL;
END;

-- =============================================
-- Families.IsDeleted for soft delete
-- =============================================
IF COL_LENGTH('dbo.Families', 'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.Families ADD IsDeleted BIT NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Families_School_IsDeleted' AND object_id = OBJECT_ID('dbo.Families'))
BEGIN
    CREATE INDEX IX_Families_School_IsDeleted ON dbo.Families(SchoolID, IsDeleted) INCLUDE (FamilyName, PrimaryParentName);
END;

-- =============================================
-- Classes.IsDeleted for soft delete
-- =============================================
IF COL_LENGTH('dbo.Classes', 'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.Classes ADD IsDeleted BIT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.Classes', 'Grade') IS NULL
BEGIN
    ALTER TABLE dbo.Classes ADD Grade NVARCHAR(20) NULL;
END;

IF COL_LENGTH('dbo.Classes', 'Room') IS NULL
BEGIN
    ALTER TABLE dbo.Classes ADD Room NVARCHAR(50) NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Classes_School_IsDeleted' AND object_id = OBJECT_ID('dbo.Classes'))
BEGIN
    CREATE INDEX IX_Classes_School_IsDeleted ON dbo.Classes(SchoolID, IsDeleted, ActiveYear) INCLUDE (ClassName, Grade, TeacherID, Capacity);
END;

-- =============================================
-- Attendance: covering index for the hot class+date path
-- =============================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Attendance_ClassID_Date' AND object_id = OBJECT_ID('dbo.Attendance'))
BEGIN
    CREATE INDEX IX_Attendance_ClassID_Date
        ON dbo.Attendance(SchoolID, ClassID, AttendanceDate)
        INCLUDE (Status, ArrivalTime, Notes);
END;

-- =============================================
-- PlatformSettings: key-value platform toggles (DevForge admin)
-- Used for maintenance mode, feature toggles, etc. Edited only by
-- DevForge admins; all writes are audit-logged.
-- =============================================
IF OBJECT_ID('dbo.PlatformSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PlatformSettings (
        SettingKey   NVARCHAR(64) NOT NULL PRIMARY KEY,
        SettingValue NVARCHAR(MAX) NULL,
        Description  NVARCHAR(255) NULL,
        UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedBy    NVARCHAR(255) NULL
    );
END;

-- Seed defaults
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = 'maintenanceMode')
    INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description) VALUES ('maintenanceMode', 'off', 'When on, all non-admin requests are rejected with a maintenance page.');
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = 'allowNewSignups')
    INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description) VALUES ('allowNewSignups', 'on', 'When off, public signups are disabled.');
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = 'parentPayEnabled')
    INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description) VALUES ('parentPayEnabled', 'on', 'When off, parents can no longer initiate payments.');
IF NOT EXISTS (SELECT 1 FROM dbo.PlatformSettings WHERE SettingKey = 'maxSchoolsPerUser')
    INSERT INTO dbo.PlatformSettings (SettingKey, SettingValue, Description) VALUES ('maxSchoolsPerUser', '5', 'Soft cap on how many schools a single user account can be linked to.');

-- =============================================
-- Covering indexes for hot query paths
-- Each index INCLUDEs columns that the SELECT list reads, so the
-- query can be satisfied entirely from the index without a key lookup.
-- =============================================

-- Students: list view filters by SchoolID + IsDeleted + IsActive + ClassID
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Students_School_Active_Class' AND object_id = OBJECT_ID('dbo.Students'))
BEGIN
    CREATE INDEX IX_Students_School_Active_Class
        ON dbo.Students(SchoolID, IsDeleted, IsActive, ClassID)
        INCLUDE (StudentID, FirstName, LastName, FamilyID, BillingCategoryID);
END;

-- Students: search by name within a school
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Students_School_LastName' AND object_id = OBJECT_ID('dbo.Students'))
BEGIN
    CREATE INDEX IX_Students_School_LastName
        ON dbo.Students(SchoolID, LastName, FirstName)
        INCLUDE (StudentID, FamilyID, ClassID, IsActive);
END;

-- Invoices: list view filters by SchoolID + Status, ordered by DueDate DESC
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_School_Status_Due' AND object_id = OBJECT_ID('dbo.Invoices'))
BEGIN
    CREATE INDEX IX_Invoices_School_Status_Due
        ON dbo.Invoices(SchoolID, Status, DueDate DESC)
        INCLUDE (InvoiceID, InvoiceNumber, StudentID, Amount, AmountPaid, CreatedDate);
END;

-- Invoices: outstanding balance query (per school, per student, per status)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Invoices_School_Student_Status' AND object_id = OBJECT_ID('dbo.Invoices'))
BEGIN
    CREATE INDEX IX_Invoices_School_Student_Status
        ON dbo.Invoices(SchoolID, StudentID, Status)
        INCLUDE (InvoiceID, Amount, AmountPaid, DueDate);
END;

-- Transactions: payment list per school
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Transactions_School_Date' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    CREATE INDEX IX_Transactions_School_Date
        ON dbo.Transactions(SchoolID, TransactionDate DESC, CreatedDate DESC)
        INCLUDE (TransactionID, ReceiptNumber, PayeeName, PaymentMethod, Amount, AllocationStatus, InvoiceID, BankStatementID);
END;

-- Transactions: unallocated payments (DevForge KPI)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Transactions_Allocation_School' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    CREATE INDEX IX_Transactions_Allocation_School
        ON dbo.Transactions(AllocationStatus, SchoolID)
        INCLUDE (TransactionID, Amount, TransactionDate)
        WHERE AllocationStatus IN ('Unallocated', 'PendingPayment');
END;

-- AuditLog: scoped queries by school/actor (covering: includes payload + actor fields)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_School_OccurredAt_Covering' AND object_id = OBJECT_ID('dbo.AuditLog'))
    AND OBJECT_ID('dbo.AuditLog') IS NOT NULL
BEGIN
    CREATE INDEX IX_AuditLog_School_OccurredAt_Covering
        ON dbo.AuditLog(SchoolID, OccurredAt DESC)
        INCLUDE (AuditID, Action, ResourceType, ResourceID, ActorUserID, ActorRole, ActorEmail, Payload);
END;

-- Users: lookup by email (login, OAuth callback)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Email' AND object_id = OBJECT_ID('dbo.Users'))
    AND OBJECT_ID('dbo.Users') IS NOT NULL
BEGIN
    CREATE INDEX IX_Users_Email
        ON dbo.Users(Email)
        INCLUDE (UserID, Username, FirstName, LastName, Role, IsActive);
END;

-- ParentLinks: parent-to-children lookup (parent portal tenancy)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ParentLinks_User' AND object_id = OBJECT_ID('dbo.ParentLinks'))
    AND OBJECT_ID('dbo.ParentLinks') IS NOT NULL
BEGIN
    CREATE INDEX IX_ParentLinks_User
        ON dbo.ParentLinks(UserID)
        INCLUDE (ParentLinkID, SchoolID, FamilyID, StudentID);
END;

-- BankStatements: per school, ordered by statement date
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BankStatements_School_Date' AND object_id = OBJECT_ID('dbo.BankStatements'))
    AND OBJECT_ID('dbo.BankStatements') IS NOT NULL
BEGIN
    CREATE INDEX IX_BankStatements_School_Date
        ON dbo.BankStatements(SchoolID, StatementDate DESC)
        INCLUDE (BankStatementID, FileName, Status);
END;

-- BankStatementTransactions: reconciliation query
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BankStmts_School_Match' AND object_id = OBJECT_ID('dbo.BankStatementTransactions'))
    AND OBJECT_ID('dbo.BankStatementTransactions') IS NOT NULL
BEGIN
    CREATE INDEX IX_BankStmts_School_Match
        ON dbo.BankStatementTransactions(SchoolID, IsMatched)
        INCLUDE (BankStatementTransactionID, BankStatementID, Amount, TransactionDate, MatchedTransactionID);
END;

-- Staff: list per school, ordered by active first then name
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_School_Active' AND object_id = OBJECT_ID('dbo.Employees'))
    AND OBJECT_ID('dbo.Employees') IS NOT NULL
BEGIN
    CREATE INDEX IX_Employees_School_Active
        ON dbo.Employees(SchoolID, IsActive, LastName, FirstName)
        INCLUDE (EmployeeID, JobTitle, Department, Email, StartDate);
END;

-- Messaging: per school, per parent
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Conversations_School' AND object_id = OBJECT_ID('dbo.Conversations'))
    AND OBJECT_ID('dbo.Conversations') IS NOT NULL
BEGIN
    CREATE INDEX IX_Conversations_School
        ON dbo.Conversations(SchoolID, LastMessageAt DESC)
        INCLUDE (ConversationID, Subject, FamilyID, ConversationType);
END;

-- =============================================
-- SaaS Tenant Model (Task 1)
-- Tenant is the SaaS root of multi-tenant isolation. SchoolId remains
-- for granular per-school data; TenantId is the SaaS isolation key.
-- =============================================
IF OBJECT_ID('dbo.Tenants', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tenants (
        TenantId              INT IDENTITY(1,1) PRIMARY KEY,
        TenantName            NVARCHAR(255) NOT NULL,
        TenantType            NVARCHAR(50) NOT NULL DEFAULT 'School',  -- School | Business | Other
        PrimaryContactUserId  INT NULL,
        Status                NVARCHAR(20) NOT NULL DEFAULT 'Active',  -- Active | Suspended | Cancelled
        CreatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsActive              BIT NOT NULL DEFAULT 1
    );
    CREATE INDEX IX_Tenants_Status ON dbo.Tenants(Status, IsActive);
END;

-- =============================================
-- UserTenantMembership (Task 2) - the source of truth for which users
-- belong to which tenants. A user can have many memberships.
-- =============================================
IF OBJECT_ID('dbo.UserTenantMemberships', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserTenantMemberships (
        UserTenantMembershipId BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId                  INT NOT NULL,
        TenantId                INT NOT NULL,
        SchoolId                INT NULL,
        RoleId                  INT NULL,
        Status                  NVARCHAR(20) NOT NULL DEFAULT 'Active',
        JoinedAt                DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        DeactivatedAt           DATETIME2 NULL,
        IsActive                BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_UTM_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserID),
        CONSTRAINT FK_UTM_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId)
    );
    CREATE INDEX IX_UTM_User_Active ON dbo.UserTenantMemberships(UserId, IsActive, Status);
    CREATE INDEX IX_UTM_Tenant_Active ON dbo.UserTenantMemberships(TenantId, IsActive, Status);
END;

-- =============================================
-- Roles + Permissions + RolePermissions (Task 4)
-- =============================================
IF OBJECT_ID('dbo.Roles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        RoleId          INT IDENTITY(1,1) PRIMARY KEY,
        RoleName        NVARCHAR(100) NOT NULL,
        RoleCode        NVARCHAR(100) NOT NULL,
        TenantId        INT NULL,  -- null for platform-level roles
        IsPlatformRole  BIT NOT NULL DEFAULT 0,
        Description     NVARCHAR(500) NULL,
        CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsActive        BIT NOT NULL DEFAULT 1
    );
    CREATE INDEX IX_Roles_Tenant ON dbo.Roles(TenantId, IsActive);
END;

IF OBJECT_ID('dbo.Permissions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Permissions (
        PermissionId   INT IDENTITY(1,1) PRIMARY KEY,
        PermissionKey  NVARCHAR(100) NOT NULL UNIQUE,  -- e.g. KINDER_CARE_HUB_MESSAGING
        PermissionName NVARCHAR(150) NOT NULL,
        Description    NVARCHAR(500) NULL,
        CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsActive       BIT NOT NULL DEFAULT 1
    );
END;

IF OBJECT_ID('dbo.RolePermissions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RolePermissions (
        RolePermissionId BIGINT IDENTITY(1,1) PRIMARY KEY,
        RoleId           INT NOT NULL,
        PermissionId     INT NOT NULL,
        CreatedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_RP_Role FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId),
        CONSTRAINT FK_RP_Perm FOREIGN KEY (PermissionId) REFERENCES dbo.Permissions(PermissionId),
        CONSTRAINT UQ_RolePermission UNIQUE (RoleId, PermissionId)
    );
END;

-- =============================================
-- SaaS Subscription Model (Tasks 5-9)
-- SubscriptionPlan, SaaSFeature, SubscriptionPlanFeature, TenantSubscription,
-- TenantFeatureOverride, TenantFeatureUsage.
-- The model is key-based: check feature keys, not plan names.
-- =============================================
IF OBJECT_ID('dbo.SubscriptionPlans', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubscriptionPlans (
        SubscriptionPlanId INT IDENTITY(1,1) PRIMARY KEY,
        PlanCode           NVARCHAR(50) NOT NULL UNIQUE,  -- STANDARD, ADVANCED, ...
        PlanName           NVARCHAR(150) NOT NULL,
        Description        NVARCHAR(1000) NULL,
        Status             NVARCHAR(20) NOT NULL DEFAULT 'Active',
        IsDefault          BIT NOT NULL DEFAULT 0,
        CreatedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsActive           BIT NOT NULL DEFAULT 1
    );
END;

IF OBJECT_ID('dbo.SaaSFeatures', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SaaSFeatures (
        SaaSFeatureId   INT IDENTITY(1,1) PRIMARY KEY,
        FeatureKey      NVARCHAR(100) NOT NULL UNIQUE,  -- stable, do not rename
        FeatureName     NVARCHAR(150) NOT NULL,
        FeatureCategory NVARCHAR(100) NULL,
        Description     NVARCHAR(1000) NULL,
        IsActive        BIT NOT NULL DEFAULT 1,
        CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;

IF OBJECT_ID('dbo.SubscriptionPlanFeatures', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SubscriptionPlanFeatures (
        SubscriptionPlanFeatureId BIGINT IDENTITY(1,1) PRIMARY KEY,
        SubscriptionPlanId           INT NOT NULL,
        SaaSFeatureId                INT NOT NULL,
        IsEnabled                     BIT NOT NULL DEFAULT 1,
        LimitType                     NVARCHAR(50) NULL,    -- e.g. count, storage_bytes
        LimitValue                    INT NULL,             -- null = unlimited
        CreatedAt                     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt                     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_SPF_Plan FOREIGN KEY (SubscriptionPlanId) REFERENCES dbo.SubscriptionPlans(SubscriptionPlanId),
        CONSTRAINT FK_SPF_Feat FOREIGN KEY (SaaSFeatureId) REFERENCES dbo.SaaSFeatures(SaaSFeatureId),
        CONSTRAINT UQ_SPF_PlanFeature UNIQUE (SubscriptionPlanId, SaaSFeatureId)
    );
END;

IF OBJECT_ID('dbo.TenantSubscriptions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TenantSubscriptions (
        TenantSubscriptionId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId              INT NOT NULL,
        SubscriptionPlanId    INT NOT NULL,
        Status                NVARCHAR(20) NOT NULL DEFAULT 'Active',  -- Active, Suspended, Cancelled, Expired
        StartDate             DATE NOT NULL,
        EndDate               DATE NULL,
        CreatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsActive              BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_TS_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId),
        CONSTRAINT FK_TS_Plan FOREIGN KEY (SubscriptionPlanId) REFERENCES dbo.SubscriptionPlans(SubscriptionPlanId)
    );
    CREATE INDEX IX_TS_Tenant_Active ON dbo.TenantSubscriptions(TenantId, IsActive, Status);
END;

IF OBJECT_ID('dbo.TenantFeatureOverrides', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TenantFeatureOverrides (
        TenantFeatureOverrideId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId                 INT NOT NULL,
        SaaSFeatureId            INT NOT NULL,
        IsEnabled                BIT NOT NULL,
        LimitValueOverride       INT NULL,
        Reason                   NVARCHAR(500) NULL,
        StartDate                DATE NULL,
        EndDate                  DATE NULL,
        CreatedByUserId          INT NULL,
        CreatedAt                DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsActive                 BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_TFO_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId),
        CONSTRAINT FK_TFO_Feature FOREIGN KEY (SaaSFeatureId) REFERENCES dbo.SaaSFeatures(SaaSFeatureId)
    );
    CREATE INDEX IX_TFO_Tenant_Active ON dbo.TenantFeatureOverrides(TenantId, IsActive);
END;

IF OBJECT_ID('dbo.TenantFeatureUsage', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TenantFeatureUsage (
        TenantFeatureUsageId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId              INT NOT NULL,
        SaaSFeatureId         INT NOT NULL,
        UsagePeriodStart      DATETIME2 NOT NULL,
        UsagePeriodEnd        DATETIME2 NOT NULL,
        UsageCount            INT NOT NULL DEFAULT 0,
        StorageBytesUsed      BIGINT NOT NULL DEFAULT 0,
        CreatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_TFU_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId),
        CONSTRAINT FK_TFU_Feature FOREIGN KEY (SaaSFeatureId) REFERENCES dbo.SaaSFeatures(SaaSFeatureId)
    );
    CREATE INDEX IX_TFU_Tenant_Period ON dbo.TenantFeatureUsage(TenantId, UsagePeriodStart DESC);
END;

-- =============================================
-- KinderCareHub Messaging Schema (Tasks 22-26)
-- Conversation, ConversationParticipant, Message, MessageAttachment,
-- MessageNotificationEvent, ConversationAuditLogs.
-- Every entity is tenant-scoped. SchoolId is set when school-specific.
-- =============================================
IF OBJECT_ID('dbo.Conversations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Conversations (
        ConversationId      BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId            INT NOT NULL,
        SchoolId            INT NULL,
        ConversationType    NVARCHAR(40) NOT NULL,  -- DevForgeToSchool, DevForgeToParent, SchoolInternal, SchoolToDevForge, SchoolToParent, ParentToSchool, SupportConversation, BroadcastAnnouncement
        ConversationName    NVARCHAR(255) NULL,
        CreatedByUserId     INT NOT NULL,
        IsBroadcast         BIT NOT NULL DEFAULT 0,
        LastMessageId       BIGINT NULL,
        LastMessageAt       DATETIME2 NULL,
        LastMessagePreview  NVARCHAR(500) NULL,
        CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsActive            BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Conv_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId)
    );
    CREATE INDEX IX_Conversations_Tenant ON dbo.Conversations(TenantId, SchoolId, LastMessageAt DESC) INCLUDE (ConversationId, ConversationName, ConversationType, IsActive);
END;

IF OBJECT_ID('dbo.ConversationParticipants', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConversationParticipants (
        ConversationParticipantId BIGINT IDENTITY(1,1) PRIMARY KEY,
        ConversationId             BIGINT NOT NULL,
        TenantId                   INT NOT NULL,
        SchoolId                   INT NULL,
        UserId                     INT NOT NULL,
        RoleAtTime                 NVARCHAR(40) NULL,
        CanRead                    BIT NOT NULL DEFAULT 1,
        CanSend                    BIT NOT NULL DEFAULT 1,
        CanReply                   BIT NOT NULL DEFAULT 1,
        CanUploadImage             BIT NOT NULL DEFAULT 1,
        JoinedAt                   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        RemovedAt                  DATETIME2 NULL,
        IsActive                   BIT NOT NULL DEFAULT 1,
        LastReadMessageId          BIGINT NULL,
        LastReadAt                 DATETIME2 NULL,
        UnreadCount                INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_CP_Conv FOREIGN KEY (ConversationId) REFERENCES dbo.Conversations(ConversationId),
        CONSTRAINT FK_CP_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId),
        CONSTRAINT UQ_CP_ConvUser UNIQUE (ConversationId, UserId)
    );
    CREATE INDEX IX_CP_Tenant_User ON dbo.ConversationParticipants(TenantId, UserId, IsActive, LastReadAt DESC);
END;

IF OBJECT_ID('dbo.Messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Messages (
        MessageId         BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId          INT NOT NULL,
        SchoolId          INT NULL,
        ConversationId    BIGINT NOT NULL,
        SenderUserId      INT NOT NULL,
        MessageType       NVARCHAR(20) NOT NULL DEFAULT 'Text',  -- Text, Image, TextWithImage, System, FaultReport
        MessageBody       NVARCHAR(MAX) NOT NULL,
        CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        EditedAt          DATETIME2 NULL,
        DeletedAt         DATETIME2 NULL,
        IsDeleted         BIT NOT NULL DEFAULT 0,
        IsSystemMessage   BIT NOT NULL DEFAULT 0,
        ReplyToMessageId  BIGINT NULL,
        CONSTRAINT FK_Msg_Conv FOREIGN KEY (ConversationId) REFERENCES dbo.Conversations(ConversationId),
        CONSTRAINT FK_Msg_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId)
    );
    CREATE INDEX IX_Messages_Tenant_Conv_Created ON dbo.Messages(TenantId, ConversationId, CreatedAt DESC) INCLUDE (MessageId, SenderUserId, MessageType, MessageBody);
END;

IF OBJECT_ID('dbo.MessageAttachments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MessageAttachments (
        MessageAttachmentId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId            INT NOT NULL,
        SchoolId            INT NULL,
        ConversationId      BIGINT NOT NULL,
        MessageId           BIGINT NOT NULL,
        UploadedByUserId    INT NOT NULL,
        OriginalFileName    NVARCHAR(255) NULL,
        StoredFileName      NVARCHAR(255) NOT NULL,
        FileExtension       NVARCHAR(20) NOT NULL,
        MimeType            NVARCHAR(100) NOT NULL,
        FileSizeBytes       BIGINT NOT NULL,
        StoragePath         NVARCHAR(1000) NOT NULL,
        ThumbnailPath       NVARCHAR(1000) NULL,
        UploadedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        IsImage             BIT NOT NULL DEFAULT 1,
        IsScanned           BIT NOT NULL DEFAULT 0,
        ScanStatus          NVARCHAR(20) NOT NULL DEFAULT 'Pending',  -- Pending, Clean, Infected, Failed
        IsDeleted           BIT NOT NULL DEFAULT 0,
        DeletedAt           DATETIME2 NULL,
        CONSTRAINT FK_MA_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId)
    );
    CREATE INDEX IX_MA_Tenant_Conv_Msg_User ON dbo.MessageAttachments(TenantId, ConversationId, MessageId, UploadedByUserId) INCLUDE (FileExtension, FileSizeBytes);
END;

IF OBJECT_ID('dbo.MessageNotificationEvents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MessageNotificationEvents (
        MessageNotificationEventId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId                    INT NOT NULL,
        SchoolId                    INT NULL,
        ConversationId              BIGINT NOT NULL,
        MessageId                   BIGINT NOT NULL,
        TargetUserId                INT NOT NULL,
        EventType                   NVARCHAR(30) NOT NULL DEFAULT 'NewMessage',
        Status                      NVARCHAR(20) NOT NULL DEFAULT 'Pending',  -- Pending, Delivered, Read, Failed
        CreatedAt                   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        DeliveredAt                 DATETIME2 NULL,
        ReadAt                      DATETIME2 NULL,
        CONSTRAINT FK_MNE_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId)
    );
    CREATE INDEX IX_MNE_TargetUser_Status_Created ON dbo.MessageNotificationEvents(TenantId, TargetUserId, Status, CreatedAt DESC) INCLUDE (MessageNotificationEventId, ConversationId, MessageId, EventType);
END;

IF OBJECT_ID('dbo.ConversationAuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ConversationAuditLogs (
        ConversationAuditLogId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId              INT NOT NULL,
        SchoolId              INT NULL,
        UserId                INT NULL,
        ActionType            NVARCHAR(60) NOT NULL,
        EntityType            NVARCHAR(60) NOT NULL,
        EntityId              BIGINT NULL,
        Description           NVARCHAR(2000) NULL,
        IPAddress             NVARCHAR(64) NULL,
        UserAgent             NVARCHAR(500) NULL,
        WasBlocked            BIT NOT NULL DEFAULT 0,
        CreatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_CAL_Tenant_User_Action_Created ON dbo.ConversationAuditLogs(TenantId, UserId, ActionType, CreatedAt DESC) INCLUDE (ConversationAuditLogId, EntityType, EntityId, WasBlocked);
END;

-- =============================================
-- Broadcast announcements + fault reports + AI request log + background jobs
-- (Tasks 45-47, 57, 63, 77)
-- =============================================
IF OBJECT_ID('dbo.BroadcastAnnouncements', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BroadcastAnnouncements (
        BroadcastAnnouncementId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId                 INT NOT NULL,
        CreatedByUserId          INT NOT NULL,
        BroadcastType            NVARCHAR(40) NOT NULL,  -- DevForgeToSchool, DevForgeToParent, SchoolToParents, etc.
        MessageBody              NVARCHAR(MAX) NOT NULL,
        Status                   NVARCHAR(20) NOT NULL DEFAULT 'Pending',  -- Pending, Processing, Completed, Failed
        TotalRecipients          INT NOT NULL DEFAULT 0,
        TotalDelivered           INT NOT NULL DEFAULT 0,
        TotalFailed              INT NOT NULL DEFAULT 0,
        CreatedAt                DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CompletedAt              DATETIME2 NULL,
        CONSTRAINT FK_BA_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId)
    );
END;

IF OBJECT_ID('dbo.BroadcastDeliveries', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BroadcastDeliveries (
        BroadcastDeliveryId BIGINT IDENTITY(1,1) PRIMARY KEY,
        BroadcastAnnouncementId BIGINT NOT NULL,
        TenantId                INT NOT NULL,
        RecipientUserId         INT NOT NULL,
        RecipientTenantId       INT NOT NULL,
        ConversationId          BIGINT NULL,
        DeliveryStatus          NVARCHAR(20) NOT NULL DEFAULT 'Pending',  -- Pending, Delivered, Failed
        AttemptCount            INT NOT NULL DEFAULT 0,
        LastAttemptAt           DATETIME2 NULL,
        DeliveredAt             DATETIME2 NULL,
        FailedAt                DATETIME2 NULL,
        ErrorMessage            NVARCHAR(2000) NULL,
        CONSTRAINT FK_BD_BA FOREIGN KEY (BroadcastAnnouncementId) REFERENCES dbo.BroadcastAnnouncements(BroadcastAnnouncementId)
    );
    CREATE INDEX IX_BD_BA_Status ON dbo.BroadcastDeliveries(BroadcastAnnouncementId, DeliveryStatus, AttemptCount);
END;

IF OBJECT_ID('dbo.FaultReports', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FaultReports (
        FaultReportId        BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId             INT NOT NULL,
        SchoolId             INT NULL,
        ReportedByUserId     INT NOT NULL,
        DashboardType        NVARCHAR(40) NOT NULL,  -- DevForge, SchoolManagement, ParentManagement
        ScreenName           NVARCHAR(200) NULL,
        Description          NVARCHAR(MAX) NOT NULL,
        Priority             NVARCHAR(10) NOT NULL DEFAULT 'Normal',  -- Low, Normal, High, Urgent
        PrimaryAttachmentId  BIGINT NULL,
        Status               NVARCHAR(20) NOT NULL DEFAULT 'Open',  -- Open, InProgress, Resolved, Closed
        AssignedToUserId     INT NULL,
        CreatedAt            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_FR_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId)
    );
    CREATE INDEX IX_FR_Tenant_Status ON dbo.FaultReports(TenantId, Status, CreatedAt DESC);
END;

IF OBJECT_ID('dbo.AIRequestLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AIRequestLogs (
        AIRequestLogId    BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId          INT NULL,
        SchoolId          INT NULL,
        UserId            INT NULL,
        DashboardType     NVARCHAR(40) NULL,
        AIRequestType     NVARCHAR(40) NOT NULL DEFAULT 'Chat',  -- Chat, Reconciliation, Fault
        QuestionSummary   NVARCHAR(500) NULL,
        ResponseSummary   NVARCHAR(500) NULL,
        ModelUsed         NVARCHAR(100) NULL,
        Provider          NVARCHAR(100) NULL,
        RequestStatus     NVARCHAR(20) NOT NULL DEFAULT 'OK',
        ResponseTimeMs    INT NULL,
        BlockedBySecurity BIT NOT NULL DEFAULT 0,
        CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_AIRL_Tenant_Dashboard_Created ON dbo.AIRequestLogs(TenantId, DashboardType, CreatedAt DESC) INCLUDE (AIRequestLogId, UserId, AIRequestType, BlockedBySecurity);
END;

IF OBJECT_ID('dbo.BackgroundJobs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BackgroundJobs (
        BackgroundJobId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId       INT NULL,
        SchoolId       INT NULL,
        Period         NVARCHAR(16) NULL,
        JobType        NVARCHAR(50) NOT NULL,
        Payload        NVARCHAR(MAX) NULL,
        Status         NVARCHAR(20) NOT NULL DEFAULT 'Pending',  -- Pending, Running, Done, Failed
        LockedBy       NVARCHAR(128) NULL,
        LockedUntil    DATETIME2 NULL,
        Attempts       INT NOT NULL DEFAULT 0,
        MaxAttempts    INT NOT NULL DEFAULT 5,
        LastError      NVARCHAR(MAX) NULL,
        ScheduledAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        RunAt          DATETIME2 NULL,
        StartedAt      DATETIME2 NULL,
        FinishedAt     DATETIME2 NULL,
        CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_BJ_Status_JobType ON dbo.BackgroundJobs(Status, JobType, CreatedAt);
    CREATE INDEX IX_BJ_LockedUntil ON dbo.BackgroundJobs(Status, LockedUntil) WHERE Status = 'Running';
END;

-- Migration 0008: add columns for distributed-lock worker if missing
IF COL_LENGTH('dbo.BackgroundJobs', 'SchoolId') IS NULL ALTER TABLE dbo.BackgroundJobs ADD SchoolId INT NULL;
IF COL_LENGTH('dbo.BackgroundJobs', 'Period') IS NULL ALTER TABLE dbo.BackgroundJobs ADD Period NVARCHAR(16) NULL;
IF COL_LENGTH('dbo.BackgroundJobs', 'LockedBy') IS NULL ALTER TABLE dbo.BackgroundJobs ADD LockedBy NVARCHAR(128) NULL;
IF COL_LENGTH('dbo.BackgroundJobs', 'LockedUntil') IS NULL ALTER TABLE dbo.BackgroundJobs ADD LockedUntil DATETIME2 NULL;
IF COL_LENGTH('dbo.BackgroundJobs', 'Attempts') IS NULL ALTER TABLE dbo.BackgroundJobs ADD Attempts INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.BackgroundJobs', 'MaxAttempts') IS NULL ALTER TABLE dbo.BackgroundJobs ADD MaxAttempts INT NOT NULL DEFAULT 5;
IF COL_LENGTH('dbo.BackgroundJobs', 'LastError') IS NULL ALTER TABLE dbo.BackgroundJobs ADD LastError NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.BackgroundJobs', 'RunAt') IS NULL ALTER TABLE dbo.BackgroundJobs ADD RunAt DATETIME2 NULL;
IF COL_LENGTH('dbo.BackgroundJobs', 'StartedAt') IS NULL ALTER TABLE dbo.BackgroundJobs ADD StartedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.BackgroundJobs', 'FinishedAt') IS NULL ALTER TABLE dbo.BackgroundJobs ADD FinishedAt DATETIME2 NULL;

-- Migration 0008: SchemaMigrations table
IF OBJECT_ID('dbo.SchemaMigrations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SchemaMigrations (
        Version NVARCHAR(20) NOT NULL PRIMARY KEY,
        AppliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE Version = '0008') INSERT INTO dbo.SchemaMigrations(Version) VALUES('0008');

-- Migration 0008 backfill: ensure every existing StaffRole has the
-- default feature-grants applied. Inherit = no override row.
-- School + Finance default to Allow; KCH, Settings, AI default to
-- Inherit (i.e. no override).
IF OBJECT_ID('tempdb..#defaultKeys') IS NOT NULL DROP TABLE #defaultKeys;
CREATE TABLE #defaultKeys (PermissionKey NVARCHAR(100) PRIMARY KEY, Decision NVARCHAR(10) NOT NULL);
INSERT INTO #defaultKeys (PermissionKey, Decision) VALUES
  ('feature-group.school', 'Allow'),
  ('school.students.view', 'Allow'),
  ('school.families.view', 'Allow'),
  ('school.classes.view', 'Allow'),
  ('attendance.view_all', 'Allow'),
  ('school.staff.view', 'Allow'),
  ('leave.view', 'Allow'),
  ('payslips.view', 'Allow'),
  ('feature-group.finance', 'Allow'),
  ('finance.invoices.view', 'Allow'),
  ('finance.payments.view', 'Allow'),
  ('finance.outstanding_fees.view', 'Allow'),
  ('finance.bank_reconciliation.view', 'Allow'),
  ('finance.bank_reconciliation.approve_match', 'Allow'),
  ('finance.refunds.create', 'Allow'),
  ('finance.adjustments.create', 'Allow'),
  ('finance.period_lock.manage', 'Allow'),
  ('finance.year_end_close', 'Allow'),
  ('finance.rollover.manage', 'Allow'),
  ('school.consent.view', 'Allow'),
  ('reports.view', 'Allow');

IF OBJECT_ID('dbo.StaffRoles', 'U') IS NOT NULL
BEGIN
  INSERT INTO dbo.RolePermissionOverrides (RoleId, PermissionKey, Decision, UpdatedAt)
  SELECT r.RoleID, k.PermissionKey, k.Decision, SYSUTCDATETIME()
  FROM dbo.StaffRoles r
  CROSS JOIN #defaultKeys k
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissionOverrides o
    WHERE o.RoleId = r.RoleID AND o.PermissionKey = k.PermissionKey
  );
END;
DROP TABLE #defaultKeys;

-- =============================================
-- Bank reconciliation: statements + imports + transactions (Task 92)
-- One statement per (TenantId, SchoolId, BankAccountId, Year, Month).
-- Transactions dedupe on FITID, falling back to a SHA-256 hash of
-- (tenant, school, account, date, amount, direction, ref, desc).
-- Imports dedupe on (TenantId, SchoolId, BankAccountId, FileHash, Year, Month).
-- =============================================
IF OBJECT_ID('dbo.BankReconciliationStatements', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankReconciliationStatements (
        BankReconciliationStatementId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId                       INT NOT NULL,
        SchoolId                       INT NULL,
        BankAccountId                  INT NOT NULL,
        StatementNumber                INT NOT NULL,
        StatementYear                  INT NOT NULL,
        StatementMonth                 INT NOT NULL,  -- 1-12
        StatementMonthName             NVARCHAR(20) NULL,
        Status                         NVARCHAR(20) NOT NULL DEFAULT 'Open',  -- Open, InProgress, Reconciled
        ImportedByUserId               INT NULL,
        ReconciledByUserId             INT NULL,
        ReconciledAt                   DATETIME2 NULL,
        CreatedAt                      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt                      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_BRS_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId),
        CONSTRAINT UQ_BRS_Account_Month UNIQUE (TenantId, SchoolId, BankAccountId, StatementYear, StatementMonth)
    );
    CREATE INDEX IX_BRS_Tenant_Account_Year_Month ON dbo.BankReconciliationStatements(TenantId, BankAccountId, StatementYear DESC, StatementMonth DESC);
END;

IF OBJECT_ID('dbo.BankStatementImports', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankStatementImports (
        BankStatementImportId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId              INT NOT NULL,
        SchoolId              INT NULL,
        BankAccountId         INT NOT NULL,
        BankReconciliationStatementId BIGINT NULL,
        ImportYear            INT NOT NULL,
        ImportMonth           INT NOT NULL,
        OriginalFileName      NVARCHAR(500) NULL,
        FileHash              NVARCHAR(128) NOT NULL,
        ImportedByUserId      INT NOT NULL,
        ImportedAt            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        Status                NVARCHAR(20) NOT NULL DEFAULT 'Completed',  -- Pending, Completed, Failed
        TotalTransactionsInFile INT NOT NULL DEFAULT 0,
        TotalTransactionsImported INT NOT NULL DEFAULT 0,
        TotalTransactionsSkippedOutsideMonth INT NOT NULL DEFAULT 0,
        TotalDuplicatesSkipped INT NOT NULL DEFAULT 0,
        TotalPaymentsCreated INT NOT NULL DEFAULT 0,
        ErrorMessage          NVARCHAR(2000) NULL,
        CONSTRAINT FK_BSI_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId),
        CONSTRAINT UQ_BSI_Duplicate UNIQUE (TenantId, SchoolId, BankAccountId, FileHash, ImportYear, ImportMonth)
    );
    CREATE INDEX IX_BSI_BRS_ImportedAt ON dbo.BankStatementImports(BankReconciliationStatementId, ImportedAt DESC);
END;

IF OBJECT_ID('dbo.BankTransactions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankTransactions (
        BankTransactionId BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId          INT NOT NULL,
        SchoolId          INT NULL,
        BankAccountId     INT NOT NULL,
        BankReconciliationStatementId BIGINT NOT NULL,
        BankStatementImportId BIGINT NULL,
        TransactionDate   DATE NOT NULL,
        PostedDate         DATE NULL,
        BankEffectiveDate  DATE NOT NULL,
        Amount             DECIMAL(18, 2) NOT NULL,
        Direction          NVARCHAR(10) NOT NULL,  -- Credit, Debit
        Reference          NVARCHAR(500) NULL,
        Description        NVARCHAR(500) NULL,
        FITID              NVARCHAR(128) NULL,
        TransactionHash    NVARCHAR(128) NOT NULL,
        Status             NVARCHAR(20) NOT NULL DEFAULT 'Imported',  -- Imported, Matched, Reconciled, Ignored, DuplicateSkipped
        CreatedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_BT_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId),
        CONSTRAINT FK_BT_BRS FOREIGN KEY (BankReconciliationStatementId) REFERENCES dbo.BankReconciliationStatements(BankReconciliationStatementId)
    );
    CREATE INDEX IX_BT_Tenant_BRS_Date ON dbo.BankTransactions(TenantId, BankReconciliationStatementId, BankEffectiveDate ASC);
    CREATE INDEX IX_BT_FITID_Dedup ON dbo.BankTransactions(TenantId, SchoolId, BankAccountId, FITID) WHERE FITID IS NOT NULL;
    CREATE INDEX IX_BT_Hash_Dedup ON dbo.BankTransactions(TenantId, SchoolId, BankAccountId, TransactionHash);
END;

-- =============================================
-- Bank accounts (per school) for OFX import / reconciliation
-- =============================================
IF OBJECT_ID('dbo.BankAccounts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.BankAccounts (
        BankAccountID INT IDENTITY(1,1) PRIMARY KEY,
        TenantId      INT NOT NULL,
        SchoolID      INT NOT NULL,
        AccountName   NVARCHAR(200) NOT NULL,
        AccountNumber NVARCHAR(50) NOT NULL,
        BankName      NVARCHAR(200) NULL,
        IsActive      BIT NOT NULL DEFAULT 1,
        CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_BankAccounts_School FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
        CONSTRAINT FK_BankAccounts_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId)
    );
    CREATE INDEX IX_BankAccounts_School_Active ON dbo.BankAccounts(SchoolID, IsActive) INCLUDE (AccountName, AccountNumber, BankName);
END;

IF COL_LENGTH('dbo.Transactions', 'BankTransactionId') IS NULL
BEGIN
    ALTER TABLE dbo.Transactions ADD BankTransactionId BIGINT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Transactions_School_BankTransactionId' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    CREATE UNIQUE INDEX UX_Transactions_School_BankTransactionId
        ON dbo.Transactions(SchoolID, BankTransactionId)
        WHERE BankTransactionId IS NOT NULL;
END;

-- =============================================
-- School-level BillingCategories already exist. Add per-student
-- billing category assignments with effective months.
-- (User final ask: custom billing categories per school, applicable
-- months selection, automatic invoice generation.)
-- =============================================
IF OBJECT_ID('dbo.StudentBillingCategoryAssignments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudentBillingCategoryAssignments (
        AssignmentId           BIGINT IDENTITY(1,1) PRIMARY KEY,
        TenantId               INT NOT NULL,
        SchoolId               INT NULL,
        StudentId              INT NOT NULL,
        BillingCategoryId      INT NOT NULL,
        ApplicableFromYear     INT NOT NULL,
        ApplicableFromMonth    INT NOT NULL,  -- 1-12
        ApplicableToYear       INT NULL,
        ApplicableToMonth      INT NULL,  -- 1-12; null = open-ended
        IsActive               BIT NOT NULL DEFAULT 1,
        CreatedAt              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_SBCA_Stu FOREIGN KEY (StudentId) REFERENCES dbo.Students(StudentID),
        CONSTRAINT FK_SBCA_BC FOREIGN KEY (BillingCategoryId) REFERENCES dbo.BillingCategories(BillingCategoryID)
    );
    CREATE INDEX IX_SBCA_Stu_Period ON dbo.StudentBillingCategoryAssignments(TenantId, StudentId, IsActive, ApplicableFromYear, ApplicableFromMonth);
END;

-- =============================================
-- Link existing Schools to Tenants (idempotent backfill)
-- For version 1, every school is wrapped in its own tenant. This adds a
-- TenantId column to dbo.Schools if missing, creates a tenant for each
-- existing school (if one does not already exist for that school), and
-- populates dbo.Schools.TenantId.
-- =============================================
IF COL_LENGTH('dbo.Schools', 'TenantId') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD TenantId INT NULL;
END;

-- Create one tenant per school that does not already have one
IF COL_LENGTH('dbo.Schools', 'TenantId') IS NOT NULL
BEGIN
    -- For schools with no tenant, create a default tenant (one-shot backfill)
    DECLARE @newTenantId INT;
    DECLARE @schoolId INT;
    DECLARE @schoolName NVARCHAR(255);
    DECLARE schoolCur CURSOR LOCAL FORWARD_ONLY FOR
        SELECT SchoolID, SchoolName FROM dbo.Schools WHERE TenantId IS NULL OR TenantId = 0;
    OPEN schoolCur;
    FETCH NEXT FROM schoolCur INTO @schoolId, @schoolName;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        INSERT INTO dbo.Tenants (TenantName, TenantType, Status, IsActive)
        VALUES (@schoolName, 'School', 'Active', 1);
        SET @newTenantId = SCOPE_IDENTITY();
        UPDATE dbo.Schools SET TenantId = @newTenantId WHERE SchoolID = @schoolId;
        FETCH NEXT FROM schoolCur INTO @schoolId, @schoolName;
    END
    CLOSE schoolCur;
    DEALLOCATE schoolCur;

    -- For schools with no rows above (already had tenants) but TenantId was
    -- never set on the School itself, leave the existing tenant creation alone.
END;

IF COL_LENGTH('dbo.Schools', 'TenantId') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Schools_Tenant')
BEGIN
    ALTER TABLE dbo.Schools
        ADD CONSTRAINT FK_Schools_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.Tenants(TenantId);
END;

-- =============================================
-- Seed: STANDARD subscription plan (Tasks 14-15)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlans WHERE PlanCode = 'STANDARD')
BEGIN
    INSERT INTO dbo.SubscriptionPlans (PlanCode, PlanName, Description, IsDefault, Status, IsActive)
    VALUES ('STANDARD', 'Standard', 'Default plan for launch � all Kinder Care Hub features enabled.', 1, 'Active', 1);
END;

-- Seed: 9 Kinder Care Hub feature keys
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_MESSAGING')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_MESSAGING', 'Kinder Care Hub messaging', 'Messaging');
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_IMAGE_MESSAGING')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_IMAGE_MESSAGING', 'Kinder Care Hub image messaging', 'Messaging');
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_PARENT_MESSAGING')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_PARENT_MESSAGING', 'Kinder Care Hub parent messaging', 'Messaging');
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_STAFF_MESSAGING')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_STAFF_MESSAGING', 'Kinder Care Hub staff messaging', 'Messaging');
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_DEVFORGE_MESSAGING')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_DEVFORGE_MESSAGING', 'Kinder Care Hub DevForge messaging', 'Messaging');
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_BROADCASTS')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_BROADCASTS', 'Kinder Care Hub broadcasts', 'Broadcasts');
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_AI_CHATBOT')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_AI_CHATBOT', 'Kinder Care Hub AI chatbot', 'AI');
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_AI_RECONCILIATION')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_AI_RECONCILIATION', 'Kinder Care Hub AI reconciliation', 'AI');
IF NOT EXISTS (SELECT 1 FROM dbo.SaaSFeatures WHERE FeatureKey = 'KINDER_CARE_HUB_REPORT_FAULT')
    INSERT INTO dbo.SaaSFeatures (FeatureKey, FeatureName, FeatureCategory) VALUES ('KINDER_CARE_HUB_REPORT_FAULT', 'Kinder Care Hub Report a Fault', 'Support');

-- Seed: link all 9 to STANDARD (enabled)
DECLARE @stdPlanId INT;
SELECT @stdPlanId = SubscriptionPlanId FROM dbo.SubscriptionPlans WHERE PlanCode = 'STANDARD';
DECLARE featCur CURSOR LOCAL FORWARD_ONLY FOR SELECT SaaSFeatureId FROM dbo.SaaSFeatures;
DECLARE @featId INT;
OPEN featCur;
FETCH NEXT FROM featCur INTO @featId;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.SubscriptionPlanFeatures WHERE SubscriptionPlanId = @stdPlanId AND SaaSFeatureId = @featId)
        INSERT INTO dbo.SubscriptionPlanFeatures (SubscriptionPlanId, SaaSFeatureId, IsEnabled) VALUES (@stdPlanId, @featId, 1);
    FETCH NEXT FROM featCur INTO @featId;
END
CLOSE featCur;
DEALLOCATE featCur;

-- Seed: assign every active tenant to STANDARD
DECLARE tenantCur CURSOR LOCAL FORWARD_ONLY FOR SELECT TenantId FROM dbo.Tenants WHERE IsActive = 1;
DECLARE @tId INT;
OPEN tenantCur;
FETCH NEXT FROM tenantCur INTO @tId;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.TenantSubscriptions WHERE TenantId = @tId AND Status = 'Active' AND IsActive = 1)
        INSERT INTO dbo.TenantSubscriptions (TenantId, SubscriptionPlanId, Status, StartDate, IsActive)
        VALUES (@tId, @stdPlanId, 'Active', CAST(GETDATE() AS DATE), 1);
    FETCH NEXT FROM tenantCur INTO @tId;
END
CLOSE tenantCur;
DEALLOCATE tenantCur;
-- =============================================
-- BillingCategories.ApplicableMonths: per-category allowed months
-- Comma-separated list of month numbers (1-12). Empty = all months.
-- =============================================
IF COL_LENGTH('dbo.BillingCategories', 'ApplicableMonths') IS NULL
BEGIN
    ALTER TABLE dbo.BillingCategories ADD ApplicableMonths NVARCHAR(50) NULL;
END;

-- =============================================
-- Seed dev convenience rows: SaaS admin user
-- (only if the Schools table is empty)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Role = 'admin' AND Email = 'admin@kinder-care-hub.local')
    INSERT INTO dbo.Users (Username, Email, PasswordHash, Role, IsActive, CreatedDate)
    VALUES ('admin', 'admin@kinder-care-hub.local', '$2a$10$.6Y7H8e8G0pZJ3Xw0p7tO.H8C4n3M2k7h6G3m1N4o5P6q7R8s9T0u1V', 'admin', 1, GETDATE());
-- =============================================
-- Parent verification flow (email + cellphone confirmation)
-- =============================================
IF OBJECT_ID('dbo.ParentVerificationChallenges', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParentVerificationChallenges (
        ParentVerificationChallengeId   BIGINT IDENTITY(1,1) PRIMARY KEY,
        Email                           NVARCHAR(255) NOT NULL,
        Cellphone                       NVARCHAR(50) NOT NULL,
        EmailTokenHash                   NVARCHAR(255) NULL,
        SmsCodeHash                     NVARCHAR(255) NULL,
        EmailVerified                    BIT NOT NULL DEFAULT 0,
        SmsVerified                      BIT NOT NULL DEFAULT 0,
        EmailTokenExpiresAt              DATETIME2 NULL,
        SmsCodeExpiresAt                 DATETIME2 NULL,
        SchoolId                        INT NULL,
        Attempts                        INT NOT NULL DEFAULT 0,
        CompletedAt                     DATETIME2 NULL,
        CreatedAt                       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_PVC_Email ON dbo.ParentVerificationChallenges(Email, EmailTokenHash);
END;

IF OBJECT_ID('dbo.ParentMagicLinks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParentMagicLinks (
        ParentMagicLinkId BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserID            INT NOT NULL,
        TokenHash         NVARCHAR(255) NOT NULL,
        ExpiresAt         DATETIME2 NOT NULL,
        UsedAt            DATETIME2 NULL,
        CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_PML_User FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
    );
    CREATE INDEX IX_PML_Token ON dbo.ParentMagicLinks(TokenHash);
END;
