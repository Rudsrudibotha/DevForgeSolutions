-- Seed test data: 1 school, 3 portal logins, 5 staff, 10 families, 20 students, 1 year of invoices/attendance/leave/payslips
-- Run after clean-db and setup-db

-- =============================================
-- SCHOOL
-- =============================================
SET IDENTITY_INSERT dbo.Schools ON;
INSERT INTO dbo.Schools (SchoolID, SchoolName, Address, ContactPerson, ContactEmail, ContactPhone, CurrencyCode, CurrencySymbol, DefaultMonthlyFee, SubscriptionStatus)
VALUES (7, 'Sunshine Academy', '123 Main Road, Cape Town, 8001', 'Sarah Johnson', 'info@sunshineacademy.co.za', '021-555-0100', 'ZAR', 'R', 2500.00, 'Active');
SET IDENTITY_INSERT dbo.Schools OFF;

-- =============================================
-- USERS (school admin + parent)
-- =============================================
-- School admin user linked to SchoolID 7
INSERT INTO dbo.Users (Email, Username, PasswordHash, Role, SchoolID, IsActive, HasHrPermission)
VALUES ('schooltest@devforge.local', 'schooltest', '$2a$10$p0/5qWhiGHOTYPYJq3rK4ulWcZwYEjKGtk9eiWS5EW5W8kdUD8qCa', 'school', 7, 1, 1);

-- Parent user
INSERT INTO dbo.Users (Email, Username, PasswordHash, Role, SchoolID, IsActive)
VALUES ('parenttest@devforge.local', 'parenttest', '$2a$10$uYEOUMFLEs7ZxXOrEqaGZuGUwRV1jzfozvMJ0QcthNYQ1ELHsTu/S', 'parent', NULL, 1);

-- =============================================
-- BILLING CATEGORIES
-- =============================================
INSERT INTO dbo.BillingCategories (SchoolID, CategoryName, Description, BaseAmount, Frequency) VALUES
(7, 'Standard Tuition', 'Monthly tuition fee', 2500.00, 'Monthly'),
(7, 'After Care', 'After school care program', 800.00, 'Monthly'),
(7, 'Annual Registration', 'Once-off registration fee', 1500.00, 'One-time');

-- =============================================
-- FAMILIES (10 families)
-- =============================================
INSERT INTO dbo.Families (SchoolID, FamilyName, PrimaryParentName, PrimaryParentPhone, PrimaryParentEmail, PrimaryParentIdNumber, SecondaryParentName, SecondaryParentPhone, HomeAddress, EmergencyContactName, EmergencyContactPhone) VALUES
(7, 'Van der Merwe', 'Anna van der Merwe', '082-555-0001', 'parenttest@devforge.local', '8501015800081', 'Johan van der Merwe', '082-555-0002', '10 Oak Street, Cape Town', 'Marie Botha', '082-555-0099'),
(7, 'Naidoo', 'Priya Naidoo', '083-555-0003', 'priya.naidoo@email.co.za', '8703025800082', 'Raj Naidoo', '083-555-0004', '22 Palm Avenue, Cape Town', 'Sita Naidoo', '083-555-0098'),
(7, 'Mokoena', 'Thandi Mokoena', '084-555-0005', 'thandi.m@email.co.za', '8905035800083', 'Sipho Mokoena', '084-555-0006', '5 River Road, Cape Town', 'Grace Mokoena', '084-555-0097'),
(7, 'Smith', 'Claire Smith', '085-555-0007', 'claire.smith@email.co.za', '9001045800084', NULL, NULL, '18 Beach Road, Cape Town', 'Tom Smith', '085-555-0096'),
(7, 'Patel', 'Fatima Patel', '086-555-0009', 'fatima.p@email.co.za', '8802055800085', 'Ahmed Patel', '086-555-0010', '7 Hill Street, Cape Town', 'Zara Patel', '086-555-0095'),
(7, 'Botha', 'Elise Botha', '087-555-0011', 'elise.b@email.co.za', '9104065800086', 'Pieter Botha', '087-555-0012', '33 Garden Lane, Cape Town', 'Jan Botha', '087-555-0094'),
(7, 'Dlamini', 'Nomsa Dlamini', '071-555-0013', 'nomsa.d@email.co.za', '8606075800087', 'Bongani Dlamini', '071-555-0014', '12 Station Road, Cape Town', 'Lindiwe Dlamini', '071-555-0093'),
(7, 'Williams', 'Sarah Williams', '072-555-0015', 'sarah.w@email.co.za', '9208085800088', NULL, NULL, '45 Long Street, Cape Town', 'David Williams', '072-555-0092'),
(7, 'Govender', 'Anita Govender', '073-555-0017', 'anita.g@email.co.za', '8810095800089', 'Suren Govender', '073-555-0018', '8 Church Street, Cape Town', 'Kamla Govender', '073-555-0091'),
(7, 'Jacobs', 'Michelle Jacobs', '074-555-0019', 'michelle.j@email.co.za', '9012105800090', 'Ryan Jacobs', '074-555-0020', '27 Kloof Street, Cape Town', 'Linda Jacobs', '074-555-0090');

-- =============================================
-- CLASSES
-- =============================================
INSERT INTO dbo.Classes (SchoolID, ClassName, Capacity, IsActive) VALUES
(7, 'Grade R', 25, 1),
(7, 'Grade 1', 25, 1),
(7, 'Grade 2', 25, 1),
(7, 'Grade 3', 25, 1);

-- =============================================
-- EMPLOYEES (5 staff)
-- =============================================
INSERT INTO dbo.Employees (SchoolID, FirstName, LastName, Email, Phone, JobTitle, Department, StartDate, Salary, LeaveBalance, IsActive) VALUES
(7, 'Lisa', 'Fourie', 'lisa.fourie@sunshineacademy.co.za', '082-600-0001', 'Principal', 'Management', '2020-01-15', 45000.00, 21, 1),
(7, 'David', 'Mthembu', 'david.m@sunshineacademy.co.za', '082-600-0002', 'Teacher - Grade R', 'Teaching', '2021-03-01', 28000.00, 18, 1),
(7, 'Karen', 'Pretorius', 'karen.p@sunshineacademy.co.za', '082-600-0003', 'Teacher - Grade 1', 'Teaching', '2022-01-10', 27000.00, 21, 1),
(7, 'James', 'Ndlovu', 'james.n@sunshineacademy.co.za', '082-600-0004', 'Teacher - Grade 2/3', 'Teaching', '2023-01-08', 26000.00, 21, 1),
(7, 'Zanele', 'Khumalo', 'zanele.k@sunshineacademy.co.za', '082-600-0005', 'Admin & Finance', 'Administration', '2021-06-01', 22000.00, 15, 1);

-- =============================================
-- STUDENTS (20 students across 4 classes, 2 per family)
-- =============================================
DECLARE @f1 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Van der Merwe');
DECLARE @f2 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Naidoo');
DECLARE @f3 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Mokoena');
DECLARE @f4 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Smith');
DECLARE @f5 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Patel');
DECLARE @f6 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Botha');
DECLARE @f7 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Dlamini');
DECLARE @f8 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Williams');
DECLARE @f9 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Govender');
DECLARE @f10 INT = (SELECT TOP 1 FamilyID FROM Families WHERE FamilyName='Jacobs');
DECLARE @bc1 INT = (SELECT TOP 1 BillingCategoryID FROM BillingCategories WHERE CategoryName='Standard Tuition');

INSERT INTO dbo.Students (SchoolID, FamilyID, FirstName, LastName, DateOfBirth, ClassName, BillingDate, EnrolledDate, BillingCategoryID, IsActive) VALUES
(7, @f1, 'Liam', 'Van der Merwe', '2018-03-15', 'Grade R', '2024-01-01', '2024-01-15', @bc1, 1),
(7, @f1, 'Emma', 'Van der Merwe', '2016-07-22', 'Grade 2', '2024-01-01', '2022-01-10', @bc1, 1),
(7, @f2, 'Arjun', 'Naidoo', '2018-11-05', 'Grade R', '2024-01-01', '2024-01-15', @bc1, 1),
(7, @f2, 'Prisha', 'Naidoo', '2017-02-18', 'Grade 1', '2024-01-01', '2023-01-09', @bc1, 1),
(7, @f3, 'Lethabo', 'Mokoena', '2017-06-30', 'Grade 1', '2024-01-01', '2023-01-09', @bc1, 1),
(7, @f3, 'Naledi', 'Mokoena', '2015-12-10', 'Grade 3', '2024-01-01', '2021-01-11', @bc1, 1),
(7, @f4, 'Jack', 'Smith', '2018-01-25', 'Grade R', '2024-01-01', '2024-01-15', @bc1, 1),
(7, @f4, 'Olivia', 'Smith', '2016-09-08', 'Grade 2', '2024-01-01', '2022-01-10', @bc1, 1),
(7, @f5, 'Zahra', 'Patel', '2017-04-12', 'Grade 1', '2024-01-01', '2023-01-09', @bc1, 1),
(7, @f5, 'Yusuf', 'Patel', '2015-08-20', 'Grade 3', '2024-01-01', '2021-01-11', @bc1, 1),
(7, @f6, 'Mia', 'Botha', '2018-05-03', 'Grade R', '2024-01-01', '2024-01-15', @bc1, 1),
(7, @f6, 'Ethan', 'Botha', '2016-10-17', 'Grade 2', '2024-01-01', '2022-01-10', @bc1, 1),
(7, @f7, 'Siyanda', 'Dlamini', '2017-09-28', 'Grade 1', '2024-01-01', '2023-01-09', @bc1, 1),
(7, @f7, 'Amahle', 'Dlamini', '2015-11-14', 'Grade 3', '2024-01-01', '2021-01-11', @bc1, 1),
(7, @f8, 'Noah', 'Williams', '2018-08-07', 'Grade R', '2024-01-01', '2024-01-15', @bc1, 1),
(7, @f8, 'Chloe', 'Williams', '2017-01-30', 'Grade 1', '2024-01-01', '2023-01-09', @bc1, 1),
(7, @f9, 'Kavish', 'Govender', '2016-06-19', 'Grade 2', '2024-01-01', '2022-01-10', @bc1, 1),
(7, @f9, 'Anaya', 'Govender', '2018-12-01', 'Grade R', '2024-01-01', '2024-01-15', @bc1, 1),
(7, @f10, 'Tyler', 'Jacobs', '2015-04-25', 'Grade 3', '2024-01-01', '2021-01-11', @bc1, 1),
(7, @f10, 'Megan', 'Jacobs', '2017-07-11', 'Grade 1', '2024-01-01', '2023-01-09', @bc1, 1);

-- =============================================
-- PARENT LINK (link parenttest user to Van der Merwe family)
-- =============================================
DECLARE @parentUserId INT = (SELECT TOP 1 UserID FROM Users WHERE Email='parenttest@devforge.local');
INSERT INTO dbo.ParentLinks (UserID, FamilyID, SchoolID) VALUES (@parentUserId, @f1, 7);

-- =============================================
-- INVOICES (Jan 2024 - Dec 2024, R2500/month per student = 20 students x 12 months = 240 invoices)
-- =============================================
DECLARE @m INT = 1;
WHILE @m <= 12
BEGIN
    INSERT INTO dbo.Invoices (SchoolID, StudentID, BillingCategoryID, InvoiceNumber, Amount, AmountPaid, Description, Status, IssueDate, DueDate, PaidDate)
    SELECT
        7,
        s.StudentID,
        @bc1,
        CONCAT('INV-2024-', FORMAT(@m, '00'), '-', s.StudentID),
        2500.00,
        CASE WHEN @m <= 10 THEN 2500.00 WHEN @m = 11 THEN 1500.00 ELSE 0.00 END,
        CONCAT(s.FirstName, ' ', s.LastName, ' tuition for ', DATENAME(MONTH, DATEFROMPARTS(2024, @m, 1)), ' 2024'),
        CASE WHEN @m <= 10 THEN 'Paid' WHEN @m = 11 THEN 'Partial' ELSE 'Pending' END,
        DATEFROMPARTS(2024, @m, 1),
        DATEFROMPARTS(2024, @m, 7),
        CASE WHEN @m <= 10 THEN DATEFROMPARTS(2024, @m, 5) ELSE NULL END
    FROM dbo.Students s WHERE s.SchoolID = 7 AND s.IsActive = 1;
    SET @m = @m + 1;
END;

-- =============================================
-- TRANSACTIONS (payments for paid invoices)
-- =============================================
INSERT INTO dbo.Transactions (SchoolID, InvoiceID, PaymentMethod, Reference, Description, TransactionType, Amount, TransactionDate)
SELECT
    7, i.InvoiceID, 'Bank Transfer',
    CONCAT('PAY-', i.InvoiceNumber),
    CONCAT('Payment for ', i.Description),
    'Credit', i.AmountPaid, ISNULL(i.PaidDate, i.IssueDate)
FROM dbo.Invoices i WHERE i.SchoolID = 7 AND i.AmountPaid > 0;

-- =============================================
-- ATTENDANCE (school days Jan-Nov 2024, weekdays only, random statuses)
-- =============================================
DECLARE @d DATE = '2024-01-15';
WHILE @d <= '2024-11-29'
BEGIN
    IF DATEPART(WEEKDAY, @d) NOT IN (1, 7) -- skip weekends
    BEGIN
        INSERT INTO dbo.Attendance (SchoolID, StudentID, AttendanceDate, Status, Notes)
        SELECT 7, s.StudentID, @d,
            CASE ABS(CHECKSUM(NEWID())) % 20
                WHEN 0 THEN 'Absent'
                WHEN 1 THEN 'Late'
                WHEN 2 THEN 'Excused'
                ELSE 'Present'
            END,
            NULL
        FROM dbo.Students s WHERE s.SchoolID = 7 AND s.IsActive = 1;
    END;
    SET @d = DATEADD(DAY, 1, @d);
END;

-- =============================================
-- LEAVE REQUESTS (staff leave throughout 2024)
-- =============================================
DECLARE @e1 INT = (SELECT TOP 1 EmployeeID FROM Employees WHERE LastName='Fourie');
DECLARE @e2 INT = (SELECT TOP 1 EmployeeID FROM Employees WHERE LastName='Mthembu');
DECLARE @e3 INT = (SELECT TOP 1 EmployeeID FROM Employees WHERE LastName='Pretorius');
DECLARE @e4 INT = (SELECT TOP 1 EmployeeID FROM Employees WHERE LastName='Ndlovu');
DECLARE @e5 INT = (SELECT TOP 1 EmployeeID FROM Employees WHERE LastName='Khumalo');

INSERT INTO dbo.LeaveRequests (EmployeeID, LeaveType, StartDate, EndDate, Days, Reason, Status, ReviewedDate) VALUES
(@e1, 'Annual', '2024-03-25', '2024-03-29', 5, 'Family holiday', 'Approved', '2024-03-10'),
(@e1, 'Sick', '2024-07-15', '2024-07-16', 2, 'Flu', 'Approved', '2024-07-15'),
(@e2, 'Annual', '2024-06-17', '2024-06-21', 5, 'Personal leave', 'Approved', '2024-06-01'),
(@e2, 'Family', '2024-09-02', '2024-09-03', 2, 'Family responsibility', 'Approved', '2024-08-28'),
(@e3, 'Annual', '2024-04-08', '2024-04-12', 5, 'Holiday', 'Approved', '2024-03-20'),
(@e3, 'Sick', '2024-08-19', '2024-08-20', 2, 'Doctor appointment', 'Approved', '2024-08-19'),
(@e3, 'Annual', '2024-12-09', '2024-12-13', 5, 'Year-end break', 'Approved', '2024-11-25'),
(@e4, 'Annual', '2024-05-13', '2024-05-17', 5, 'Travel', 'Approved', '2024-04-30'),
(@e4, 'Sick', '2024-10-07', '2024-10-08', 2, 'Unwell', 'Approved', '2024-10-07'),
(@e5, 'Annual', '2024-07-01', '2024-07-05', 5, 'Mid-year break', 'Approved', '2024-06-15'),
(@e5, 'Sick', '2024-11-11', '2024-11-12', 2, 'Medical', 'Approved', '2024-11-11'),
(@e5, 'Annual', '2024-12-16', '2024-12-20', 5, 'December holiday', 'Pending', NULL);

-- =============================================
-- PAYSLIPS (Jan-Nov 2024 for all 5 staff)
-- =============================================
DECLARE @pm INT = 1;
WHILE @pm <= 11
BEGIN
    INSERT INTO dbo.Payslips (EmployeeID, PayPeriod, GrossAmount, Deductions, NetAmount, IsFinalized, FinalizedDate)
    SELECT e.EmployeeID,
        CONCAT('2024-', FORMAT(@pm, '00')),
        e.Salary,
        ROUND(e.Salary * 0.18, 2),
        ROUND(e.Salary * 0.82, 2),
        1,
        DATEFROMPARTS(2024, @pm, 25)
    FROM dbo.Employees e WHERE e.SchoolID = 7;
    SET @pm = @pm + 1;
END;

-- =============================================
-- AUDIT LOG ENTRIES
-- =============================================
INSERT INTO dbo.AuditLogs (UserID, SchoolID, EntityName, EntityID, Action, CreatedDate) VALUES
(NULL, NULL, 'School', '7', 'SchoolAdded', '2024-01-10'),
(NULL, 7, 'User', 'schooltest', 'Login', '2024-01-15'),
(NULL, 7, 'Invoice', 'Batch', 'MonthlyGeneration', '2024-02-01'),
(NULL, 7, 'Invoice', 'Batch', 'MonthlyGeneration', '2024-03-01'),
(NULL, 7, 'Payment', 'Batch', 'PaymentAllocated', '2024-03-05');

PRINT 'Test data seeded: 1 school, 3 logins, 5 staff, 10 families, 20 students, 240 invoices, attendance, leave, payslips.';
