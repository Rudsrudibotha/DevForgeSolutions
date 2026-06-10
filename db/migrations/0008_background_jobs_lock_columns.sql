-- 0008: BackgroundJobs distributed-lock columns + helper index
--
-- Extends dbo.BackgroundJobs (created in db/schema.sql section 9) with
-- the columns used by src/data/backgroundJobRepository.js. Idempotent:
-- safe to re-run; each ALTER is gated on COL_LENGTH.

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

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.BackgroundJobs') AND name = 'IX_BJ_LockedUntil_Running'
) BEGIN
  CREATE INDEX IX_BJ_LockedUntil_Running
    ON dbo.BackgroundJobs(Status, LockedUntil)
    WHERE Status = 'Running';
END;
