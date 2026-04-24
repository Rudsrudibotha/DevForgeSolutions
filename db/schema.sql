-- Database schema for School Finance and Management System on Azure SQL Database.
-- Keep this script idempotent for local/dev setup. Production should use migrations.

IF OBJECT_ID('dbo.Schools', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Schools (
        SchoolID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolName NVARCHAR(255) NOT NULL,
        Address NVARCHAR(500) NULL,
        ContactEmail NVARCHAR(255) NULL,
        ContactPhone NVARCHAR(50) NULL,
        SubscriptionStatus NVARCHAR(50) NOT NULL DEFAULT 'Active',
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT CK_Schools_SubscriptionStatus CHECK (SubscriptionStatus IN ('Active', 'Suspended', 'Cancelled'))
    );
END;

IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(50) NOT NULL,
        SchoolID INT NULL,
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'school')),
        CONSTRAINT FK_Users_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
END;

IF OBJECT_ID('dbo.Invoices', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Invoices (
        InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
        SchoolID INT NOT NULL,
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
        CONSTRAINT CK_Invoices_Status CHECK (Status IN ('Pending', 'Paid', 'Cancelled', 'Overdue')),
        CONSTRAINT FK_Invoices_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID)
    );
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
