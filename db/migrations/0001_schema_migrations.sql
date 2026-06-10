-- 0001: SchemaMigrations bookkeeping table
--
-- The migrations table that records which versions have been applied.
-- This is the very first migration; the runner script depends on it.

IF OBJECT_ID('dbo.SchemaMigrations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SchemaMigrations (
        Version    NVARCHAR(20) NOT NULL PRIMARY KEY,
        AppliedAt  DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
