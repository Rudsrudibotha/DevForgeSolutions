# DevForge Solutions

School Finance and Management System built with Node.js, Express, and Azure SQL Database.

The project follows a clear layered structure so each folder has a single responsibility:

- `src/application`: API routes and HTTP request/response handling.
- `src/business`: business rules, validation, workflows, and authorization decisions.
- `src/data`: database connection and repository classes.
- `src/middleware`: reusable Express middleware such as authentication and role checks.
- `db`: database schema and future migration files.
- `docs`: technical design and project documentation.

## System Design

The completed technical design is available in [docs/TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md).

This design is Azure-focused and covers:

- Azure App Service or Azure Container Apps hosting.
- Azure SQL Database as the primary data store.
- Azure Key Vault for secrets.
- Application Insights and Azure Monitor for observability.
- Layered API architecture.
- Multi-tenant school data model.
- Authentication, role-based access, audit logging, and change management.

### Azure SaaS Multi-Tenant Requirement

Important Note:
- This application is an Azure SaaS application.
- The system must be designed as a multi-tenant SaaS platform where each school is treated as a separate tenant.
- DevForge Solutions manages the platform centrally.
- Each school must only access its own data.
- Parents, teachers, finance users, HR users, and school admins must only access records linked to their own school, role, and permission level.
- Data separation must be enforced by the backend and database layer, not only by the dashboard UI.

Azure SaaS Architecture:
- The application should run as a shared SaaS platform unless a dedicated tenant model is required later.
- The backend should be hosted on Azure App Service or Azure Container Apps.
- Azure SQL Database should be used as the main relational database.
- Azure Blob Storage should be used for uploaded documents such as student documents, staff documents, admission documents, ID copies, passport copies, contracts, and reports.
- Azure Key Vault must be used for secrets, connection strings, API keys, encryption keys, and provider credentials.
- Azure Monitor and Application Insights must be used for logging, performance monitoring, errors, and diagnostics.
- Production secrets must never be hard-coded in source files.

Tenant Model:
- Each school must have a unique SchoolID.
- SchoolID acts as the tenant identifier for school-level data.
- Every school-scoped table must include SchoolID where applicable.
- Every school-scoped API route must derive SchoolID from the authenticated user/session/token.
- The backend must not trust SchoolID values submitted from the browser for school-level users.
- DevForge users may access platform-level data only through DevForge permissions.
- Parent users must be scoped to their own family and linked students.
- Teacher users must be scoped to assigned classes unless given view-all or edit-all permission.

Database Tenant Isolation:
- Every school-scoped query must filter by SchoolID.
- Every school-scoped insert must automatically save the logged-in SchoolID.
- Every school-scoped update or delete must first verify that the record belongs to the logged-in SchoolID.
- Cross-school access attempts must be denied.
- Cross-school access attempts involving sensitive or financial data must be audit logged.
- SchoolID must be indexed on school-scoped tables for performance.
- Unique constraints must consider SaaS rules where applicable.

School Registration Rule:
- The system must not allow duplicate school names.
- School name uniqueness must be enforced with backend validation and a database unique index.
- School name comparison must be case-insensitive and ignore leading/trailing spaces.
- The system should use a normalized school name column such as NormalizedSchoolName.
- Example: "ABC School", "abc school", and " ABC School " must be treated as the same school name.
- Duplicate registration attempts must return a clear message: "A school with this name already exists."
- Duplicate registration attempts must be audit logged.

Document Storage Rule:
- Uploaded documents must be stored in a tenant-safe Azure Blob Storage structure.
- Blob paths or document identifiers must not allow users to guess or access another school's documents.
- Documents must be linked to SchoolID and the relevant entity such as StudentID, EmployeeID, AdmissionID, or FamilyID.
- Users must never be able to access documents from another school.
- Sensitive document access must require permission.
- Sensitive document views, downloads, uploads, replacements, and deletions must be audit logged.

Azure SaaS Security Rules:
- Use HTTPS only.
- Use secure authentication tokens or sessions.
- Tokens must include the user identity, role/permissions, and SchoolID where applicable.
- Do not expose internal tenant identifiers unnecessarily.
- Rate limiting must apply to login and API routes.
- Failed login attempts and failed sensitive access attempts must be audit logged.
- Suspended schools must block all linked school users from login and authenticated API use.
- Deactivated users must immediately lose access.

Environment Rules:
- The SaaS platform must support separate environments:
  - Development
  - Testing / Staging
  - Production
- Production data must not be used directly in development.
- Environment-specific configuration must be managed through Azure App Settings and Azure Key Vault.
- Database migrations must be controlled and repeatable.

SaaS Operational Requirements:
- DevForge must be able to onboard a new school as a new tenant.
- DevForge must be able to suspend or activate a school.
- DevForge must be able to view platform-level usage reports.
- DevForge must be able to monitor system health.
- DevForge must be able to audit key platform actions.
- Each school must be configurable without affecting other schools.

SaaS Testing Requirement:
- Add tests to confirm School A users cannot view, update, delete, export, or report on School B data.
- Add tests to confirm SchoolID cannot be spoofed from the frontend.
- Add tests to confirm uploaded documents cannot be accessed across schools.
- Add tests to confirm parents cannot access another family's children, account, documents, attendance, or statements.
- Add tests to confirm teachers cannot access unassigned classes unless they have the correct permission.
- Add tests to confirm suspended schools are blocked from login and API use.
- Add tests to confirm duplicate school names are blocked.
- Add tests to confirm deactivated users immediately lose access.
- Add tests to confirm failed cross-school access attempts are denied and audit logged.
- Add tests to confirm sensitive exports require explicit export permission.

## Core Application Layout Requirement

This section defines the required login, dashboard, visual layout, and data separation rules.

The system must use a 3-level layout:

Level 1: Dashboard main navigation.
Level 2: Module landing page with feature icons.
Level 3: Dedicated feature page that shows only that feature's information.

Correct flow:

```text
User logs in
        |
        v
Dashboard home / side menu opens
        |
        v
User clicks a main module such as School, Finance, or Reporting
        |
        v
System opens that module landing page
        |
        v
Landing page shows feature icons for that module
        |
        v
User clicks a feature icon
        |
        v
System opens a dedicated page for that feature only
```

Main module opens a module landing page. Module landing page shows feature icons. Feature icon opens a dedicated page. Dedicated feature page shows only that feature's forms, filters, tables, summaries, and actions.

### 1. Separate Login Links

There must not be one shared system entry page where users select which dashboard they want.

Each dashboard must have its own separate login link for security:

```text
/devforge-login
/school-login
/parent-login
```

DevForge Solutions staff use `/devforge-login` with Email and Password.

School staff/client users use `/school-login` with School ID, Email, and Password.

Parents use `/parent-login` with Email/Cell Number and Password.

Users must not land on one page where all three login options are visible.

### 2. DevForge Solutions Management Dashboard

This dashboard is accessible for DevForge Solutions staff only.

The DevForge dashboard must show these icons only:

```text
[ Schools Icon ] [ Users Icon ] [ Audit Icon ]
```

#### Schools Icon

The Schools icon opens the Schools page.

The Schools page must:

- Show active schools.
- Suspend a school.
- Activate a school.
- If a school is suspended, none of the users associated with that school should be able to use the system.
- Users from other schools must still be able to use the system.
- Add school profile view.
- Show read-only summary of student count, active invoices, outstanding balance, active users, and last login activity.
- Add school onboarding checklist.
- Checklist should include billing categories added, first admin user created, first class added, first student added, and first invoice generated.
- Only DevForge users with the correct permission may suspend or activate schools.

##### School Name Uniqueness Rule

- The system must not allow a new school to be registered if the school name already exists in the database.
- School name checking must be case-insensitive.
- School name checking must ignore leading and trailing spaces.
- The system must treat names such as "ABC School", "abc school", and " ABC School " as the same school name.
- The system stores a normalized school name value (NormalizedSchoolName) as UPPER(LTRIM(RTRIM(SchoolName))) PERSISTED for comparison.
- If a duplicate school name is found, the system must reject the registration and return HTTP 409 with message: "A school with this name already exists."
- The duplicate check must happen before creating the school.
- The database enforces uniqueness via a unique index on NormalizedSchoolName to prevent duplicate schools being created by two requests at the same time.
- Duplicate school registration attempts must be audit logged.
- Only authorised DevForge users may create schools.
- School creation must remain separate from school activation and suspension.

#### Users Icon

The Users icon opens the Users page.

The Users page must:

- Allow DevForge Admin to add users to the DevForge Solutions Management Dashboard.
- Manage DevForge internal users only.
- Make users inactive instead of deleting them where history must be kept.
- Add session / device management for DevForge users.
- Show active sessions per DevForge user.
- Allow authorised DevForge admin users to force logout a DevForge user.
- Track forced logout in audit history.

#### Audit Icon

The Audit icon opens the Audit page.

The Audit page must:

- Show recent system activities for the entire application.
- Show new logins.
- Show schools added.
- Show school suspensions.
- Show school activations.
- Show users added.
- Show student updates.
- Show payment allocations.
- Show invoices sent.
- Show other important activity.
- Allow filtering by login, school added, school suspended, school activated, user added, student updated, invoice sent, payment allocated, date range, and school.
- Add scheduled audit export.
- Export audit logs as CSV by date range and school.
- Add system health summary.
- Show failed login attempts, suspended school count, API error summaries, and recent system issues where available.
- Keep detailed monitoring in Azure Monitor/Application Insights, but surface a simple summary in the DevForge dashboard.

#### School Template / Setup Defaults

The School Template / Setup Defaults feature must:

- Allow DevForge to define default setup templates for new schools.
- Templates can include default billing terms, default roles, default dashboard settings, default notification settings, and default report settings.
- Applying a template must not overwrite existing school-specific settings without confirmation.

#### Platform Usage Report

The Platform Usage Report must:

- Show number of active schools.
- Show number of suspended schools.
- Show number of active users.
- Show total students across the platform.
- Show total invoices generated.
- Show system usage trends.
- This report must only be visible to authorised DevForge users.

### 3. School Management Dashboard

This dashboard is for client schools.

The School Management Dashboard side menu must include:

- Home
- School
- Finance
- Reporting
- Account
- Settings

Do not show Staff, Learners, Parents, Classes, Bank Reconciliation, Outstanding Fees, Payslips, or Leave as Level 1 side menu items or Dashboard Home main icons.

Lower-level items such as Staff, Learners, Parents, Classes, Bank Reconciliation, Outstanding Fees, Payslips, and Leave must appear only as Level 2 feature icons inside the correct module landing page, and each feature icon must open its own Level 3 dedicated feature page.

When the user clicks School, the system opens the School landing page showing School feature icons. When the user clicks Finance, the system opens the Finance landing page showing Finance feature icons. When the user clicks Reporting, the system opens the Reporting landing page showing Reporting feature icons. Each feature icon opens its own dedicated page.

#### School Icon

The School icon opens the School landing page.

The School landing page must show these feature icons:

- Classes
- Staff
- Students
- Parents
- Attendance
- Admissions / Enrolment
- Re-Enrolment / Year Rollover
- School Settings
- Consent and Permissions
- Register Learner

Each icon opens a dedicated page for that feature only.

##### Register Learner Section

The Register Learner section must:

- Provide a dedicated registration form for new learners.
- Require family selection, billing category, first name, last name, date of birth, class, billing date, enrolled date.
- Allow optional home phone and medical notes.
- Only register learners for the logged-in School ID.
- Show a success message after registration.

##### Classes Section

The Classes section must:

- Show all classes.
- Assign teachers to a class.
- Only show classes linked to the logged-in School ID.
- Add timetable / schedule management.
- Allow the school to create a weekly timetable per class.
- Allow teachers to be assigned to class periods or subjects where applicable.
- Add class capacity limits.
- Warn the user when trying to assign a student to a class that has reached capacity.
- Only show timetable and class capacity data for the logged-in School ID.

###### Teacher Assigned Class List

- Teachers must be able to view their assigned class or classes.
- Teachers must only see the class list for classes assigned to them.
- Teachers must not see other classes unless they have admin or attendance view-all permission.
- The assigned class list must show student name, surname, student number, class, status, and attendance status for the selected date.
- The class list must only show students linked to the logged-in School ID.
- Students from another school must never appear in a teacher's class list.
- If a teacher is removed from a class, they must no longer be able to view that class list.
- Class assignment changes must be audit logged.

##### Staff Section

The Staff section must:

- Manage staff.
- Add staff.
- Remove staff.
- Move removed staff to inactive and not delete them.
- Keep staff records available for historical records such as payslips, leave, classes, and audit activity.
- Only show staff from the logged-in School ID.
- Store staff emergency contact details.
- Store staff documents such as employment contracts, ID copies, qualification documents, and certificates.
- Restrict staff document access to users with the correct permission.
- Add staff role and permission management.
- Allow roles such as Teacher, Finance, HR, and Admin to be assigned to staff users.
- Staff permissions must control which sections the staff member can access.
- Only show staff permissions, documents, and emergency contacts for the logged-in School ID.

###### Staff Roles and Permissions

- The system must support role-based permissions for staff users.
- Staff roles must be linked to the logged-in School ID.
- Roles from one school must never be visible or usable by another school.
- The school must be able to assign roles such as Staff, Teacher, HR, Finance, School Admin, and Principal / Manager.
- The system must use permissions behind the roles, not only role names.
- A staff member may have more than one role if required.
- Staff permissions must control which sections the staff member can access.
- Users must only see data they are allowed to access.
- Staff from another school must never be visible.

Default Staff Role Permissions:
- Staff / Employee can apply for leave and view their own leave history.
- Teacher can apply for leave, view their own leave history, view their assigned class list, and submit attendance for their assigned class.
- HR can view all staff leave, approve leave, decline leave, manage leave types, manage leave balances, view leave reports, and access HR / Payroll records.
- School Admin can manage staff users and assign roles or permissions.
- Principal / Manager can approve leave if the school enables manager approval.
- Finance can access finance-related functions but must not approve leave unless HR or leave approval permission is also assigned.

Suggested Permissions:
- leave.apply
- leave.view_own
- leave.cancel_own_pending
- leave.view_all
- leave.approve
- leave.decline
- leave.manage_types
- leave.manage_balances
- leave.adjust_balances
- leave.view_reports
- hr.view_payslips
- hr.manage_payslips
- payroll.generate
- payroll.review
- payroll.approve
- payroll.finalize
- payroll.view_previous
- classes.view_assigned
- attendance.submit_assigned
- attendance.view_assigned
- attendance.edit_assigned
- attendance.view_all
- attendance.edit_all

##### Students Section

The Students section must:

- Add students.
- Mark students as left.
- Show all students.
- Allow search by student name.
- Allow search by student surname.
- Allow search by parent name.
- Allow search by parent surname.
- Allow search by family code.
- Mark students as left or inactive instead of deleting them.
- Only show students from the logged-in School ID.
- Add student date of birth.
- Add student birthday report data support.
- Store student medical information such as allergies, chronic conditions, medical notes, doctor details, and emergency medical contacts.
- Restrict student medical information to authorised users only.
- Store student documents such as birth certificates, ID copies, passport copies, clinic cards, and vaccination records.
- Restrict student document access to authorised users only.
- Add bulk student import by CSV.
- Bulk import must support student details, class, family code, enrolment date, and billing category assignment.
- Add behaviour / incident log per student.
- Behaviour records must include date, description, category, action taken, and staff member who captured the record.
- Add student academic notes per term.
- Academic notes should be lightweight notes and not a full report card system unless added later.
- Only show student medical information, documents, behaviour records, and academic notes for the logged-in School ID.

###### Student Demographics Data Rule

- The system may store demographic information such as ethnicity only if the school has a lawful reason and permission to process that information.
- Ethnicity must be treated as sensitive information under POPIA (Section 26).
- Ethnicity must not be visible to normal users by default.
- Ethnicity must only be visible to authorised users with reporting or admin permission.
- Ethnicity must not be visible in the Parent Dashboard.
- Ethnicity access and exports must be audit logged.
- Ethnicity reports should be aggregated by default and should not expose individual student details unless the user has explicit permission.
- All demographic data must remain linked to the logged-in School ID and must never be mixed between schools.

##### Parents Section

The Parents section must:

- Show all parent users.
- Allow search by parent name.
- Allow search by parent surname.
- Allow search by student name.
- Allow search by student surname.
- Allow search by family code.
- Allow search by ID number.
- Allow search by passport number.
- Archive the family if a student is marked as inactive and there is no other active student for that family.
- Retrieve archived family information by ID number or passport number if the family brings a new student later.
- Only show parents linked to the logged-in School ID.
- Add parent communication log.
- Record calls, emails, meetings, and fee follow-up notes linked to a parent or family.
- Add parent detail update approval workflow.
- When a parent updates details in the Parent Dashboard, the change must appear for school approval before becoming final if approval is enabled.
- Show pending parent detail changes.
- Allow school staff to approve or reject parent detail changes.
- Keep history of approved and rejected parent detail changes.
- Only show parent communication logs and approval records for the logged-in School ID.

##### Attendance Section

The Attendance section must:

- Capture daily attendance.
- Mark student attendance as present, absent, late, or excused.
- Filter attendance by class.
- Filter attendance by date.
- Allow teachers or school admins to update attendance.
- Show attendance history per student.
- Parent attendance view must use this attendance data.
- Attendance records must remain linked to the student and logged-in School ID.
- Attendance from another school must never be visible.

###### Teacher Attendance Submission

- Teachers must be able to submit attendance for their assigned class.
- Teachers must only submit attendance for classes assigned to them.
- Teachers must not submit attendance for another teacher's class unless they have attendance edit-all permission.
- Attendance statuses must include Present, Absent, Late, and Excused.
- The attendance page must allow the teacher to select the date and class assigned to them.
- The system must show the teacher the learner list for the selected class.
- The teacher must be able to mark each student's attendance status.
- The teacher must be able to add attendance notes where needed.
- The system must prevent duplicate attendance records for the same student, same class, and same date.
- If attendance already exists for a date, the system should allow authorised users to update it instead of creating duplicates.
- Attendance submissions must be linked to the teacher who submitted them.
- Attendance records must remain linked to the student, class, date, teacher, and logged-in School ID.
- Attendance from another school must never be visible or editable.
- Attendance submissions and changes must be audit logged.

###### Attendance Approval / Review

- School admins or authorised staff must be able to review submitted attendance.
- The system should show whether attendance for a class/date has been submitted.
- The system should show missing attendance submissions for classes where attendance has not yet been captured.
- Authorised users must be able to correct attendance where needed.
- Corrections must require a reason.
- Attendance corrections must be audit logged.

###### Parent Attendance View

- Parent attendance view must use the attendance data submitted by teachers or school staff.
- Parents must only see attendance for their own child or children.
- Parents must never see attendance records for another family.
- Parents must not be able to edit attendance.

##### Admissions / Enrolment Section

The Admissions / Enrolment section must:

- Capture new applicant details before they become active students.
- Track application status such as New, In Review, Accepted, Waitlisted, Refused, or Enrolled.
- Convert accepted applicants into students.
- When an applicant becomes a student, require class assignment, family link, billing category, and enrolment date.
- Billing must only start from the official enrolment date.
- Only show admissions and enrolment records for the logged-in School ID.

###### Online Enrolment Form

- The system must allow each school to create and share its own online enrolment form.
- The online enrolment form must only work for the school that generated or shared the form.
- The enrolment form link must be school-specific.
- A parent using the enrolment form must not be able to submit an application to another school through the same link.
- The online enrolment form must remain linked to the correct School ID.
- Submitted applications must only appear in the Admissions / Enrolment Section of the school that owns the form.

Online Enrolment Form Link Rules:
- Each school must be able to generate or copy its own enrolment form link.
- The link must include a secure school-specific identifier or token.
- The system must validate the school-specific link before allowing the form to be completed.
- If the school is suspended, the enrolment form should not accept new applications.
- The form must not expose internal school data or any other school's information.

Terms and Conditions:
- The school must be able to add its own terms and conditions.
- The terms and conditions must display on the online enrolment form.
- The parent or guardian must accept the terms and conditions before submitting the form.
- The system must store the accepted terms and conditions version with the application.
- The system must store the date and time when the terms and conditions were accepted.
- The system must store the name of the parent or guardian who accepted the terms and conditions.
- If the school updates the terms and conditions later, previous applications must still keep the version that was accepted at the time of submission.

Online Enrolment Form Required Information:
- The form must collect student information.
- The form must collect at least one parent or guardian's information.
- The form must allow information for both parents or guardians where applicable.
- The form must collect the person responsible for paying the school account.
- The person responsible for payment can be Parent 1, Parent 2, Guardian, or another responsible payer.
- The form must collect contact details for the responsible payer.
- The form must collect relationship to the student.
- The form must collect ID number or passport number where required.
- The form must collect email address and cell number.
- The form must collect home address.
- The form must collect emergency contact details.
- The form must collect medical information where required by the school.
- The form must allow document upload if document upload is enabled by the school.
- Documents can include birth certificate, ID copy, passport copy, clinic card, vaccination record, proof of residence, or other required documents.

Application Submission Flow:
- Parent opens the school-specific online enrolment form link.
- Parent completes student details.
- Parent completes at least one parent or guardian section.
- Parent completes payment responsible person details.
- Parent accepts the school's terms and conditions.
- Parent submits the application.
- The application is saved as a new admission record linked to the School ID.
- The school receives the application in the Admissions / Enrolment Section.
- The school can review the application.

Admission Decision Flow:
- School staff with the correct permission must be able to review submitted applications.
- The school must be able to set the application decision to:
  - Accepted
  - Waitlisted
  - Refused
- The school must be able to add internal notes to the application.
- The school must be able to record the reason for waitlisting or refusing admission.
- The school must be able to notify the parent of the decision if email or SMS notifications are configured.
- All admission decisions must be audit logged.

Accepted Application Rule:
- If the application is accepted, the school must be able to convert the applicant into an active student.
- Before converting the applicant into a student, the system must require:
  - Class assignment
  - Family link
  - Billing category
  - Enrolment date
- Billing must only start from the official enrolment date.
- The accepted applicant must become linked to the correct School ID.
- The system must prevent duplicate student records where the same student already exists.

Waitlisted Application Rule:
- If the application is waitlisted, the application must remain in the Admissions / Enrolment Section.
- Waitlisted applications must be filterable.
- The school must be able to later change the status from Waitlisted to Accepted or Refused.
- Waitlisted applications must not become active students until accepted.

Refused Application Rule:
- If the application is refused, the application must remain saved as a historical admission record.
- Refused applications must not become active students.
- The school must be able to view refused applications later if the user has the correct permission.

Permissions and Security:
- Only authorised school users must be able to view submitted enrolment applications.
- Only authorised school users must be able to accept, waitlist, or refuse applications.
- Parent-submitted information must only be visible to the school linked to the enrolment form.
- Applications from one school must never be visible to another school.
- Uploaded documents must be permission-controlled.
- Sensitive information such as medical details, ID documents, passport documents, and demographic data must require the correct permission.
- All application viewing, document viewing, decision updates, and student conversion actions must be audit logged.

Reporting:
- Admissions reports must include online enrolment applications.
- The school must be able to filter applications by status:
  - New
  - In Review
  - Accepted
  - Waitlisted
  - Refused
  - Enrolled
- Reports must only show applications for the logged-in School ID.

##### Re-Enrolment / Year Rollover Section

The Re-Enrolment / Year Rollover section must:

- Process re-enrolment for the next academic year.
- Promote students to the next grade or class.
- Mark students as left if they are not returning.
- Carry forward outstanding balances and advance credits where applicable.
- Keep previous year student, class, invoice, payment, attendance, and report history.
- Only process re-enrolment records for the logged-in School ID.

###### Year-End Student Rollover

- Allow the school to start a year-end rollover process for the next academic year.
- Allow students to be promoted to the next class or grade.
- Allow students to be marked as left if they are not returning.
- Allow students to be retained in the same class where needed.
- Allow bulk student movement to new classes.
- Allow age-based class movement using date of birth, birth year, and configured month ranges.
- Show a preview before applying the rollover.
- The preview must show student name, current class, suggested new class, status, and action to be applied.
- The user must be able to manually override the suggested class before confirming.
- The rollover must keep previous year student, class, attendance, invoice, payment, and report history.
- Only process students linked to the logged-in School ID.
- All year-end student rollover actions must be audit logged.

###### Age-Based Class Movement During Re-Enrolment

- During re-enrolment or year rollover, the system must allow students to be moved to a class based on their age.
- The system must use the student's date of birth to calculate the correct age group.
- The system must support age grouping by birth year and birth month range.
- The school must be able to define age/class placement rules.
- Age/class placement rules can be based on birth year and month ranges.
- Example:
  - Students born in 2024 from January to April can be grouped into one class level.
  - Students born in 2024 from May to August can be grouped into another class level.
  - Students born in 2024 from September to December can be grouped into another class level.
- The system must support 4-month grouping terms such as:
  - January to April
  - May to August
  - September to December
- The system must allow the school to configure these month ranges because different schools may group ages differently.
- During re-enrolment, the system should suggest the correct class based on the student's date of birth and the configured age/class rules.
- The user must be able to review the suggested class before applying the move.
- The user must be able to manually override the suggested class where needed.
- The system must support bulk movement of students into the correct classes based on age/class rules.
- The system must show a preview before applying bulk class movement.
- The preview must show:
  - Student name
  - Student surname
  - Date of birth
  - Current class
  - Suggested new class
  - Rule used for placement
- Once confirmed, the system must update the student's class for the new academic year.
- The class movement must be linked to the logged-in School ID.
- Age-based class movement must never move or display students from another school.
- All bulk class movements must be audit logged.
- The audit log must show who performed the movement, when it was performed, the previous class, and the new class.

##### School Settings Section

The School Settings section must:

- Manage school logo, contact details, banking details, academic year, invoice settings, statement settings, attendance settings, notification settings, and parent portal visibility settings.
- School settings must only apply to the logged-in School ID.
- Settings from one school must never affect another school.

##### Consent and Permissions Section

The Consent and Permissions section must:

- Store parent consent records where needed.
- Consent records can include photo consent, trip consent, medical consent, communication consent, and data-processing consent.
- Consent must be linked to the student, parent, school, date, and consent type.
- Consent records must be auditable.
- Only show consent records for the logged-in School ID.

#### Finance Icon

The Finance icon opens the Finance landing page.

The Finance landing page must show only Finance feature icons / tiles. Do not show Bank Reconciliation, Outstanding Fees, Bank Transactions, Bank Statements, and Suggested Matches all on the same page.

Finance landing page icons:

- Bank Reconciliation
- Outstanding Fees
- Bank Transactions
- Bank Statements
- Suggested Matches
- Invoices
- Billing Categories
- HR / Payroll
- Financial Adjustments
- Refunds
- Registration / Deposit Fees
- Year-End Financial Closing

Each icon opens a dedicated page for that feature only.

Finance routes:

- /school/finance
- /school/finance/bank-reconciliation
- /school/finance/outstanding-fees
- /school/finance/bank-transactions
- /school/finance/bank-statements
- /school/finance/suggested-matches
- /school/finance/invoices
- /school/finance/billing-categories
- /school/finance/hr-payroll
- /school/finance/financial-adjustments
- /school/finance/refunds
- /school/finance/registration-deposit-fees
- /school/finance/year-end-financial-closing

Each route must only show that feature's own information.

##### Bank Reconciliation Section

The Bank Reconciliation icon on the Finance landing page opens the Bank Reconciliation dedicated page.

The Bank Reconciliation dedicated page must:

- Look and behave like a bank statement view.
- Show imported bank transactions in a statement-style table.
- Allow users to allocate payments to invoices.
- Allow users to allocate funds paid in advance.
- Allow payment to be allocated as advance credit.
- Store advance payments as credit.
- Use advance credit against future invoices.
- Only show bank reconciliation records for the logged-in School ID.
- Show reconciliation status summary.
- Show count of matched, unmatched, pending, and advance credit transactions.
- Show reconciliation totals for selected date range.
- Only show reconciliation summary for the logged-in School ID.

The Bank Reconciliation dedicated page must include:
- Upload bank statement area.
- Bank statement import summary.
- Statement-style bank transaction table.
- Suggested matches area.
- Manual allocation action per transaction row.
- Allocation status per transaction.
- Audit-safe transaction details that are never altered after import.

Bank Reconciliation Page Layout:
- The Bank Reconciliation page must look and behave like a bank statement view.
- Each row must represent one bank transaction.
- The user must be able to allocate a payment directly from the transaction row.
- The page must only show bank transactions for the logged-in SchoolID.

Bank Statement Table Columns:
- Payment Date
- Exact Bank Reference Used
- Description if available
- Debit Amount
- Credit Amount
- Transaction Amount
- Allocation Status
- Allocated To
- Action

Required Bank Transaction Details:
- Payment date must show the exact transaction/payment date from the bank statement.
- Bank reference must show the exact reference used on the bank statement.
- Amount must show the exact amount from the bank statement.
- The system must not alter or overwrite the original bank reference.
- The original imported transaction data must remain stored for audit purposes.

Payment Allocation Search Field:
- Each unallocated payment row must have one search field used to find the correct student/family account.
- The search field must allow searching by:
  - Family code
  - Student name
  - Student surname
  - Parent name
  - Parent surname
  - Parent cell number
- The search field must return only matching records from the logged-in SchoolID.
- The search results must not show students or families from another school.
- The user must be able to select the correct student or family from the search results.
- After selecting the student or family, the user must be able to allocate the payment.

Allocation Behaviour:
- If the selected student/family has outstanding invoices, the system must allow the user to allocate the payment to one or more invoices.
- If the payment is more than the outstanding amount, the remaining amount must be stored as advance credit.
- If the payment is less than the outstanding amount, the invoice must be marked as partially paid where applicable.
- If there is no outstanding invoice, the payment may be allocated as advance credit.
- The user must confirm the allocation before it is saved.
- The allocation must update the transaction status from Unallocated to Allocated or Partially Allocated where applicable.
- The allocation must remain linked to the bank transaction, student/family account, invoice if applicable, user, and logged-in SchoolID.

Statement-Style Behaviour:
- Imported bank transactions must display in date order.
- The user must be able to filter by date range.
- The user must be able to filter by allocation status.
- The user must be able to search by bank reference.
- The user must be able to search by amount.
- The user must be able to search by student/family after allocation.
- The original payment date, reference, and amount must always remain visible.

Bank Reconciliation Audit Rules:
- Bank statement upload must be audit logged.
- Payment allocation must be audit logged.
- Allocation correction must be audit logged.
- Unallocation must be audit logged.
- The audit log must record:
  - User who allocated the payment
  - Date and time of allocation
  - Bank transaction ID
  - Original bank reference
  - Original payment date
  - Original amount
  - Student/family selected
  - Invoice selected if applicable
  - Amount allocated
  - Remaining advance credit if applicable
  - Logged-in SchoolID

Bank Reconciliation Permissions:
- Viewing the Bank Reconciliation page requires finance.bank_reconciliation.view.
- Allocating a payment requires finance.payments.allocate.
- Correcting or unallocating a payment requires finance.bank_reconciliation.correct.
- All permission checks must be enforced in the backend.

Suggested Matches Placement:
- Suggested matches must appear inside the Bank Reconciliation workflow after a bank statement is uploaded.
- Suggested Matches may also have a separate Finance icon, but suggestions must still appear inside Bank Reconciliation because that is where reconciliation happens.
- Correct flow:
  - User uploads bank statement.
  - System imports valid cleared transactions up to previous day.
  - System detects possible invoice or account matches.
  - Suggested matches appear on the Bank Reconciliation page.
  - User approves, rejects, or manually allocates.

Bank Transaction Statuses:
- Imported
- Unallocated
- Suggested Match
- Allocated
- Partially Allocated
- Cleared
- Duplicate
- Ignored
- Reversed

Bank Statement Import Rules:
- The import must only process cleared / posted payments.
- Pending payments must not be treated as cleared payments.
- Current-day transactions must be ignored or staged as pending.
- The system must use a unique bank transaction key to prevent duplicates.
- Re-uploading the same bank statement must not create duplicate transactions.
- The import must show total rows, rows imported, rows skipped as duplicates, rows skipped as pending, and rows requiring review.
- Import results must be audit logged.

Example:

```text
Parent pays R5 000.
Student only owes R2 000.
The system allocates R2 000 to the invoice.
The system keeps R3 000 as advance credit.
```

##### Outstanding Fees Section

The Outstanding Fees section must:

- Show all outstanding students.
- Show the table like a year calendar.
- Show the outstanding amount under the month where the student is outstanding.
- Show Student Name.
- Show Student Surname.
- Show Class.
- Show cell number for both parents.
- Show outstanding amount for each month.
- Show total outstanding amount.
- Only show outstanding fees for the logged-in School ID.
- Add fee reminder and escalation rules.
- Allow the school to configure reminder rules such as 7 days overdue, 14 days overdue, and 30 days overdue.
- Allow reminder messages to be sent by email or SMS when notification providers are configured.
- Add promise-to-pay recording.
- Allow finance staff to record promised payment date, amount, note, and responsible parent.
- Show promise-to-pay status in the outstanding fees view.
- Only show reminder rules and promise-to-pay records for the logged-in School ID.

Outstanding Fees Export Requirements:
- The Outstanding Fees page must allow authorised finance users to export the outstanding fees table.
- Export must only include records for the logged-in SchoolID.
- Export must respect the filters selected on the screen.
- Export must include:
  - School name
  - Export date
  - Student name
  - Student surname
  - Class
  - Family code
  - Parent 1 cell number
  - Parent 2 cell number
  - Responsible payer where available
  - January outstanding amount
  - February outstanding amount
  - March outstanding amount
  - April outstanding amount
  - May outstanding amount
  - June outstanding amount
  - July outstanding amount
  - August outstanding amount
  - September outstanding amount
  - October outstanding amount
  - November outstanding amount
  - December outstanding amount
  - Total outstanding amount
  - Promise-to-pay status if available
  - Promised payment date if available
- CSV export must be supported as the minimum required format.
- Excel export can be added if already supported.
- PDF export can remain a future option if not currently implemented.
- Export must require the correct export permission.
- Export action must be audit logged.
- If export fails, the system must show a clear error message.
- The system must not download an empty or broken file.

Outstanding Fees Export Permission:
- Viewing Outstanding Fees requires finance.outstanding_fees.view.
- Exporting Outstanding Fees requires reports.finance.export or finance.outstanding_fees.export.

Example:

```text
A student is R2 000 outstanding.
R200 is outstanding for an invoice in March.
R1 800 is outstanding for an invoice in April.
The March column must show R200.
The April column must show R1 800.
The Total column must show R2 000.
```

##### Invoices Section

The Invoices section must:

- Create invoices manually when needed.
- View invoices.
- Filter invoices by student.
- Filter invoices by class.
- Filter invoices by month.
- Filter invoices by year.
- Filter invoices by status.
- Show invoice status such as Pending, Partial, Paid, or Overdue.
- Allow partial payment recording.
- Allow invoice deletion only as soft delete where history must be kept.
- Only show invoices for the logged-in School ID.
- Require each student to be assigned to a billing category.
- Use the student's billing category to control the billing amount and billing structure.
- Drive monthly billing mainly from the student's assigned billing category.
- Automatically bill active students every month according to their assigned billing category.
- Require each student to have an enrolment date.
- Start automatic billing from the student's enrolment date.
- Stop automatic billing after a student is marked as left or inactive.
- Prevent duplicate monthly invoices for the same student and billing month.
- Only apply billing to students linked to the logged-in School ID.
- Add credit note issuing.
- Allow a credit note to be created against an existing invoice when a billing correction is needed.
- Credit notes must remain linked to the original invoice.
- Credit notes must be audit logged.
- Add invoice templates.
- Allow the school to configure invoice logo, header, footer, contact details, banking details, and notes.
- Invoice templates must only apply to the logged-in School ID.

##### Billing Categories Section

The Billing Categories section must:

- Allow users to add billing categories.
- Allow users to edit billing categories.
- Allow users to deactivate billing categories instead of deleting them where history must be kept.
- Support different billing terms.
- Support billing terms such as 3 months, 6 months, 10 months, 12 months, or any other school-defined term.
- Store the billing amount.
- Store the billing frequency or term.
- Be assignable to students.
- Be used when automatic monthly invoices are generated.
- Only apply to the logged-in School ID.
- Never show or allow use of billing categories from another school.
- Add discount and bursary management.
- Allow fixed amount discounts.
- Allow percentage discounts.
- Allow sibling discounts.
- Allow bursaries or special fee arrangements.
- Discounts must be linked to a student and billing category.
- Discounts must be used when automatic monthly invoices are generated.
- Add pro-rata billing rule.
- If a student enrols during the month, the school must be able to choose whether to bill the full month or calculate pro-rata billing.
- Pro-rata billing must be configurable per school.
- Only show discounts, bursaries, and pro-rata rules for the logged-in School ID.

##### Automatic Billing Rule

The automatic billing rule must:

- Automatically generate monthly invoices for active students.
- Use the invoice amount from the student's assigned billing category.
- Start billing from the student's enrolment date.
- Only start billing from the enrolment month if the student enrols after the start of the year.
- Never bill students for months before their enrolment date.
- Stop automatic billing when the student is marked as left or inactive.
- Never create duplicate invoices for the same student, same billing category, and same month.
- Scope all automatic billing to the logged-in School ID.

##### HR / Payroll Section

The HR / Payroll section must:

- HR / Payroll is for payslips, payroll processing, and leave.
- HR / Payroll must only show staff linked to the current school.
- HR / Payroll must not show staff from other schools.
- All HR / Payroll records must only be visible for the logged-in School ID.
- Only users with the correct HR / Payroll permissions may access payroll records.
- Payroll records from another school must never be visible.

###### Payroll Logic

- The system must allow manual payslip generation.
- The user must be able to select the staff member before generating a payslip.
- The user must be able to select the pay period before generating a payslip.
- The user must be able to select the payment date.
- The payslip must first be created as a draft before it is finalized.
- The payslip generation form must contain editable fields before final saving.
- Editable payslip fields must include:
  - Basic salary
  - Allowances
  - Overtime
  - Bonus
  - Deductions
  - Leave deduction
  - Tax / PAYE if configured
  - UIF or statutory deductions if configured
  - Other deductions
  - Notes
  - Payment date

###### Payroll Calculation

- The system must calculate gross pay.
- Gross pay must be calculated from basic salary, allowances, overtime, and bonus.
- The system must calculate total deductions.
- Total deductions must include leave deductions, statutory deductions if configured, tax if configured, and other deductions.
- The system must calculate net pay.
- Net Pay = Gross Pay - Total Deductions.

###### Payslip Review and Approval

- The user must be able to review the payslip before saving it.
- The user must be able to edit the payslip while it is still in draft status.
- The user must be able to approve or finalize the payslip.
- Once finalized, the payslip must remain linked to the staff member, pay period, and logged-in School ID.
- Finalized payslips must not be silently changed.
- If a finalized payslip needs to be corrected, the correction must be tracked through audit history.
- The system must keep a record of who created, edited, approved, finalized, viewed, downloaded, corrected, or resent the payslip.

Payslip Statuses:
- Draft
- Reviewed
- Approved
- Finalized
- Sent / Paid

###### Previous Payslips and HR Permission Rule

- Previous payslips must be saved and kept as historical records.
- Previous payslips must be visible in a Previous Payslips list or table.
- Previous payslips must be view-only once finalized.
- Previous payslips must only be visible to users with HR permission.
- Users without HR permission must not be able to view previous payslips.
- School admins can only view previous payslips if they have the correct HR permission.
- Staff should only be able to view their own payslips if this is explicitly allowed by the school.
- Previous payslips must remain linked to the staff member, pay period, and logged-in School ID.
- Payslips from another school must never be visible.
- Any attempt to view, download, correct, or resend a previous payslip must be recorded in the audit history.
- Add HR / Payroll summary report inside the HR / Payroll Section.
- The HR / Payroll summary must show total gross pay, total deductions, and total net pay per pay period.
- Only users with HR permission may view HR / Payroll summary reports.
- Add leave calendar view.
- Show approved leave visually by staff member and date.
- Add staff contract expiry alerts.
- If a contract end date is captured, alert HR users when the contract is expiring within 30 or 60 days.
- Only show payroll summaries, leave calendars, and contract alerts for the logged-in School ID.

###### Employee Payroll Details

- The system must store employee payroll details for future payslip generation.
- Employee payroll details must include:
  - Employee number
  - Employee name
  - Employee surname
  - ID number or passport number
  - Tax number
  - UIF number if applicable
  - Job title
  - Department
  - Employment start date
  - Payment method
  - Bank name
  - Bank account number
  - Branch code
  - Account type
  - Basic salary
  - Standard allowances
  - Standard deductions
  - Tax / PAYE settings if configured
  - UIF or statutory deduction settings if configured
  - SchoolID
- Sensitive employee payroll fields must require HR / Payroll permission.
- Sensitive employee payroll field access must be audit logged.

###### Payslip Generation from Previous Month

- When generating a new payslip, the system must use the previous month's finalized payslip figures as the starting point where available.
- The user selects employee.
- The user selects pay period.
- The system checks if the employee has a previous finalized payslip.
- If a previous finalized payslip exists, copy the previous month's figures into the new payslip draft.
- If no previous payslip exists, use the employee's saved payroll defaults.
- The new payslip must be created as Draft.
- The user must be able to edit all draft figures before finalizing.
- Editing the new payslip must not change the previous month's payslip.
- Previous payslips must remain historical and unchanged.

###### Printable Payslip Layout

- Payslips must be viewable and printable.
- Printable payslip must include:

School details:
  - School logo
  - School name
  - School address
  - School contact number
  - School email address
  - School registration number if available

Employee details:
  - Employee number
  - Employee name and surname
  - ID number or passport number
  - Tax number
  - UIF number if applicable
  - Job title
  - Department
  - Pay period
  - Payment date

Payslip financial details:
  - Basic salary
  - Allowances
  - Overtime
  - Bonus
  - Gross pay
  - Deductions
  - Leave deduction
  - Tax / PAYE if configured
  - UIF or statutory deductions if configured
  - Other deductions
  - Total deductions
  - Net pay
  - Notes

Payslip footer:
  - Generated date
  - Generated by
  - Approved by where applicable
  - Finalized date where applicable

- The payslip print layout must be clean and professional.
- The payslip must use the logged-in school's logo and address.
- Payslips from another school must never be visible or printable.

###### Leave Management

- Staff must be able to apply for leave.
- Staff must only be able to view their own leave requests unless they have HR or leave view-all permission.
- HR users must be able to view all leave requests for the logged-in School ID.
- HR users must be able to approve or decline leave requests.
- School admins may only approve or decline leave if they have the correct HR or leave approval permission.
- Principal / Manager users may approve leave only if the school enables manager approval.
- Leave records must remain linked to the staff member and logged-in School ID.
- Leave from another school must never be visible.

Leave Types:
- The school must be able to create and manage leave types.
- Leave types must be configurable per school.
- Leave types from one school must not be visible or usable by another school.
- Leave types must be made inactive instead of deleted where history must be kept.

Default leave types can include:
- Annual Leave
- Performance Leave
- Unpaid Leave
- Family Responsibility Leave
- Sick Leave
- Study Leave
- Maternity Leave
- Paternity Leave
- Special Leave

Leave Type Settings:
- Leave type name
- Paid or unpaid
- Annual allocation
- Requires approval
- Requires supporting document
- Carry forward allowed
- Affects payroll
- Active or inactive
- School ID

Leave Application Flow:
- Staff member selects leave type.
- Staff member selects start date and end date.
- Staff member adds reason.
- Staff member uploads a supporting document if required.
- System checks available leave balance.
- System checks for overlapping leave requests.
- System submits the leave request.
- HR user reviews the request.
- HR user approves or declines the request.
- System updates leave history and leave balance.

Leave Request Statuses:
- Draft
- Submitted
- Pending Approval
- Approved
- Declined
- Cancelled
- Taken

Leave Balance Rules:
- Each staff member must have leave balances per leave type and year.
- Annual leave must deduct from the staff member's annual leave balance when approved.
- Family responsibility leave must deduct from the relevant leave balance if configured.
- Performance leave must deduct from the relevant leave balance if configured.
- Sick leave must deduct from the relevant leave balance if configured.
- Unpaid leave may have no balance limit, depending on school settings.
- Leave balances must only apply to staff linked to the logged-in School ID.
- Leave balance adjustments must require a reason and must be audit logged.
- Leave types and balances must be school-specific.

Leave Calendar:
- Add leave calendar view.
- Show approved leave visually by staff member and date.
- Only authorised HR users may view the full leave calendar.
- Staff may only view their own leave calendar unless given additional permission.
- Leave calendars must only show leave records for the logged-in School ID.

Payroll Link:
- Paid leave must not reduce salary.
- Unpaid leave must be able to affect payroll calculation.
- Approved unpaid leave must be available when generating payslips.
- Leave deductions must appear on the payslip where applicable.
- Leave must remain linked to the staff member, pay period, and logged-in School ID.

Leave Audit Rules:
- All leave applications must be audit logged.
- All approvals and declines must be audit logged.
- All leave balance adjustments must be audit logged.
- All leave type changes must be audit logged.
- The audit log must record who performed the action, when it happened, and what changed.
- Leave from another school must never be visible or editable.

###### Staff Contract Expiry Alerts

- If a contract end date is captured, alert HR users when a staff contract is expiring within 30 or 60 days.
- Only users with HR permission may view staff contract expiry alerts.
- Contract alerts must only show staff linked to the logged-in School ID.

##### Separation of Duties Rule

- The system should support maker-checker approval for sensitive actions.
- The user who creates a refund should not be the same user who approves it, unless the school explicitly allows single-user approval.
- The user who creates a financial adjustment should not be the same user who approves it, unless the school explicitly allows single-user approval.
- The user who creates a payroll correction should not be the same user who finalizes it, unless the school explicitly allows single-user approval.
- The user who creates a credit note should not be the same user who approves or finalizes it, unless the school explicitly allows single-user approval.
- The user who reopens a closed financial year should not be the same user who originally closed it, unless the school explicitly allows single-user approval.
- Every approval must be audit logged.
- Every rejection must be audit logged.
- Approval rules must be scoped to the logged-in School ID.
- Maker-checker rules must never affect another school.

##### Financial Adjustments Section

The Financial Adjustments section must:

- Allow authorised finance users to process approved adjustments.
- Adjustments can include write-offs, reversals, credit corrections, debit corrections, and fee corrections.
- Every financial adjustment must require a reason.
- Every financial adjustment must be audit logged.
- Adjustments must remain linked to the student, family, invoice, user, and logged-in School ID.

##### Refunds Section

The Refunds section must:

- Record refunds where a family has overpaid or a student has left with credit.
- Refunds must require approval before being marked as completed.
- Refunds must reduce the available advance credit.
- Refunds must be audit logged.
- Only show refunds for the logged-in School ID.

##### Registration / Deposit Fee Section

The Registration / Deposit Fee section must:

- Allow the school to charge once-off registration fees, deposits, or admin fees.
- These fees must be separate from monthly billing categories.
- The school must be able to mark whether the fee is refundable or non-refundable.
- These fees must be linked to the student or family account.
- Only show these records for the logged-in School ID.

##### Year-End Financial Closing Section

The Year-End Financial Closing section must:

- Allow authorised finance users to close the financial year.
- Show all outstanding balances before closing the year.
- Show all advance credits before closing the year.
- Show all unpaid, partially paid, paid, overdue, and credited invoices before closing.
- Allow the school to carry forward outstanding balances into the new year.
- Allow the school to carry forward advance credits into the new year.
- Allow the school to confirm which balances must be brought forward.
- Prevent duplicate balance brought forward records.
- Lock or restrict editing of closed-year financial records.
- Allow corrections to closed-year records only through authorised financial adjustments.
- Require a reason for any year-end correction.
- Audit log all year-end closing, reopening, carry-forward, and correction actions.
- Only close financial records for the logged-in School ID.
- Never close or affect another school's records.

Year-End Closing Statuses:
- Open
- In Review
- Ready to Close
- Closed
- Reopened for Correction

Year-End Carry Forward Rules:
- Outstanding balances must carry forward as balance brought forward.
- Advance credits must carry forward as credit brought forward.
- Paid accounts must remain as historical paid records.
- Closed-year invoices and payments must remain viewable for reporting.
- Closed-year records must not be deleted.
- All carried-forward amounts must remain linked to the student, family, school, and financial year.

###### Year-End Permissions

- Only authorised school users may start year-end rollover.
- Only authorised finance users may close the financial year.
- Only authorised users may reopen a closed year for correction.
- Year-end closing and reopening must require confirmation.
- All year-end actions must be audit logged.
- Users from one school must never view, close, reopen, or change another school's year-end records.

The Reporting icon opens the Reporting landing page.

The Reporting landing page must show these feature icons:

- Student Reports
- School Report
- Send Invoices to Parents
- Export Reports
- Communication History
- Admissions Report
- Re-Enrolment Report
- Consent Report
- Year-End Report

Each icon opens a dedicated page for that feature only.

##### Student Reports Section

The Student Reports section must:

- Add birthday reports.
- Birthday reports must show students with birthdays in the selected day, week, month, or date range.
- Birthday reports must show student name, surname, class, date of birth, and age.
- Birthday reports must only show students from the logged-in School ID.
- Add student demographic reports.
- Demographic reports may include gender, age group, grade/class, enrolment status, and ethnicity where the school is allowed to process it.
- Ethnicity reporting must be permission-controlled.
- Ethnicity reporting must be aggregated by default.
- Ethnicity reporting exports must be audit logged.
- Ethnicity reports must not be visible to parents.
- Add enrolment report.
- Enrolment report must show active students, left students, inactive students, new enrolments, and enrolment counts by class.
- Add birthday export option as CSV.
- Add demographic report export option as CSV, restricted to authorised users.

##### School Report Section

The School Report section must:

- Show the school's finances in detail.
- Show total invoiced.
- Show total paid.
- Show outstanding fees.
- Show advance payments.
- Show monthly breakdown.
- Show class breakdown.
- Show student account detail.
- Only show financial information for the logged-in School ID.
- Add attendance report.
- Attendance report must show attendance per class, student, and date range.
- Attendance report must show present, absent, late, and excused counts.
- Add class financial breakdown report.
- Show invoiced, paid, outstanding, and advance credit totals per class.
- Add year-end rollover report.
- Show outstanding balances, advance credits, and paid accounts at year end.
- Allow the school to confirm balances carried forward into the new year.
- Add fee collection rate report.
- Show collection percentage per month, per class, and for the full school year.
- Only show reports for the logged-in School ID.

##### Send Invoices to Parents Section

The Send Invoices to Parents section must:

- Only send invoices and statements to students in the current school.
- Allow the user to select send only to outstanding.
- Allow the user to select send to all.
- Allow the user to select send selected class.
- Allow the user to select send selected students.
- Allow the user to select send selected families.
- Generate statements for the current year.
- Show any balance brought forward from the previous year.
- Show invoices.
- Show payments.
- Show outstanding balance.
- Show advance credit.
- Show balance brought forward.
- Only send invoices and statements for the logged-in School ID.
- Add invoice template selection before sending invoices or statements.
- Allow scheduled sending of invoices or statements for a future date and time.
- Add delivery status tracking.
- Show delivery status per parent such as sent, delivered, opened, or failed where the email/SMS provider supports it.
- Allow failed statements to be resent.
- Only show send history and delivery status for the logged-in School ID.

##### Export Reports Section

The Export Reports section must:

- Export students.
- Export parents.
- Export birthday reports.
- Export demographic reports.
- Export attendance reports.
- Export outstanding fees.
- Export invoices.
- Export payments.
- Export school finance report.
- Export as CSV.
- Add PDF export as a future option if not currently implemented.
- Only export data for the logged-in School ID.
- Sensitive exports such as ethnicity, medical, and HR/payroll information must require the correct permission and must be audit logged.

##### Communication History Section

The Communication History section must:

- Show when invoices or statements were sent.
- Show which parent received the statement.
- Show whether sending was successful or failed.
- Show failed sending attempts.
- Allow resend option.
- Show communication history for fee reminders and parent follow-ups.
- Only show communication records for the logged-in School ID.

##### Admissions Report Section

The Admissions Report section must:

- Show new applications by date range.
- Show accepted, waitlisted, refused, in review, and enrolled applicants.
- Show conversion from applicant to enrolled student.
- Only show admissions reports for the logged-in School ID.

##### Re-Enrolment Report Section

The Re-Enrolment Report section must:

- Show students promoted to the next year.
- Show students marked as left.
- Show students not yet processed for re-enrolment.
- Show balances carried forward.
- Only show re-enrolment reports for the logged-in School ID.

##### Consent Report Section

The Consent Report section must:

- Show consent records by student, parent, class, consent type, and date range.
- Show missing consent records.
- Export consent reports as CSV.
- Sensitive consent reports must require the correct permission.
- Only show consent reports for the logged-in School ID.

##### Year-End Report Section

The Year-End Report section must:

- Show year-end financial summary.
- Show total invoiced for the year.
- Show total paid for the year.
- Show total outstanding at year end.
- Show total advance credit at year end.
- Show balances carried forward.
- Show students promoted, retained, or marked as left.
- Show class movement summary.
- Show unresolved accounts before year-end closing.
- Allow export of year-end reports as CSV.
- Add PDF export as a future option if PDF generation is not implemented.
- Only show year-end reports for the logged-in School ID.

### 4. Parent Management Dashboard

The Parent Management Dashboard must have its own separate login link:

```text
/parent-login
```

The Parent Management Dashboard home page must show these main icons:

- My Child
- Account
- Notifications
- Admissions / Re-Enrolment
- Consent

Each Parent icon opens its own dedicated page:

- Parent -> My Child
- Parent -> Account
- Parent -> Notifications
- Parent -> Admissions / Re-Enrolment
- Parent -> Consent

Each dedicated Parent page must show only that feature's own information, actions, filters, tables, and audit-safe details.

#### My Child Section

The My Child section must:

- View linked child or children.
- Allow the parent to select a child if more than one child is linked.
- View student attendance.
- Allow attendance to be filtered by date or month.
- Show attendance statuses such as present, absent, late, or excused.
- Allow the parent to update details.
- Allow the parent to update cell number, email address, address, and emergency contact details.
- Allow the school to decide whether updates must be approved before becoming final.
- Show behaviour / incident log view only if the school enables parent visibility.
- Show academic notes view only if the school enables parent visibility.
- Add notification preferences.
- Allow parents to choose email, SMS, or both where providers are configured.
- Do not show sensitive demographic data such as ethnicity to parents.
- Do not show restricted medical documents unless the school explicitly allows it.

#### Account Section

The Account section must:

- View statement.
- View invoices.
- View payments.
- View balance brought forward.
- View outstanding balance.
- View advance credit if funds were paid in advance.
- Only show the parent's own account and statement.
- Add PDF statement download as a future option if PDF generation is not yet implemented.
- Allow parents to download their statement or selected invoice.
- Add payment history timeline.
- Show invoices, payments, credits, and outstanding balances in chronological order.
- Add online payment button as a future option once payment gateway integration is complete.
- Online payment button must link to the existing payment gateway placeholder when configured.

#### Notifications Section

The Notifications section must:

- Show invoice notifications.
- Show payment reminders.
- Show attendance notices.
- Show school messages.
- Show statement sent history.
- Only show notifications linked to the logged-in parent.

#### Admissions / Re-Enrolment View

The Admissions / Re-Enrolment view must:

- Allow parents to complete or update application details if the school enables online applications.
- Allow parents to confirm re-enrolment for the next year if enabled by the school.
- Allow parents to upload required documents if document upload is enabled.
- Parent-submitted information must go through school approval before becoming final where required.

#### Consent View

The Consent view must:

- Allow parents to view consent requests.
- Allow parents to accept or decline consent requests where enabled.
- Store the date, parent user, consent type, and response.
- Parents must only see consent requests linked to their own child or children.

### 5. Data Separation Rule

Each school's information must be kept separate and must not be mixed.

This application is an Azure SaaS multi-tenant platform. The full Azure SaaS Multi-Tenant Requirement is defined under System Design. The rules below apply to every school-scoped feature.

The School ID entered during login must be used only to validate that the user belongs to the correct school. After login, the backend must derive the allowed SchoolID from the authenticated user session or JWT. The frontend must not be trusted to decide which SchoolID data is returned.

This applies to:

- Classes
- Staff
- Students / Learners
- Parents
- Families
- Attendance
- Finance
- Bank reconciliation
- Outstanding fees
- HR
- Payslips
- Leave
- Reporting
- Invoices
- Statements
- Payments
- Audit records

Add this flow:

```text
School user logs in with School ID SCH001
        |
        v
System confirms user belongs to SCH001
        |
        v
System loads only SCH001 data
        |
        v
School B data is never shown
```

#### Sensitive Data and Reporting Permissions

- Sensitive student information must be permission-controlled.
- Ethnicity, medical information, identity documents, passport documents, and HR/payroll information must not be visible to normal users by default.
- Sensitive reports must be aggregated by default where possible.
- Sensitive report exports must require the correct permission.
- Sensitive data access and exports must be audit logged.
- Parents must never see ethnicity reports.
- Users must only see sensitive data for the logged-in School ID.
- Sensitive data from another school must never be visible.

#### Access Control and Permission Model

This section defines the system-wide role and permission model that applies across DevForge, School, and Parent dashboards.

##### Role and Permission Matrix

DevForge Super Admin:
- Can access DevForge Solutions Management Dashboard.
- Can manage schools.
- Can suspend and activate schools.
- Can manage DevForge users.
- Can view platform audit logs.
- Can view platform usage reports.
- Can manage school setup templates.

DevForge Support:
- Can access DevForge Solutions Management Dashboard.
- Can view schools.
- Can view school profile summaries.
- Can view audit logs if permission is granted.
- Cannot suspend or activate schools unless specifically granted permission.
- Cannot manage DevForge users unless specifically granted permission.

School Admin:
- Can access the School Management Dashboard for their own School ID.
- Can manage school settings.
- Can manage classes.
- Can manage staff.
- Can manage students.
- Can manage parents.
- Can assign staff roles and permissions.
- Can view reports for their own school.
- Cannot view HR/payroll records unless HR permission is granted.
- Cannot approve refunds, financial adjustments, or payroll unless the correct permission is granted.

Principal / Manager:
- Can view school records for their own School ID.
- Can view classes, students, parents, and attendance.
- Can review reports.
- Can approve leave if manager approval is enabled by the school.
- Cannot view payroll unless HR/payroll permission is granted.
- Cannot process financial adjustments unless finance approval permission is granted.

Teacher:
- Can view only assigned class or classes.
- Can view students in assigned classes only.
- Can submit attendance for assigned classes only.
- Can view attendance submitted for assigned classes.
- Can apply for leave.
- Can view own leave history.
- Cannot view finance records.
- Cannot view HR/payroll records.
- Cannot view sensitive student records unless specifically granted permission.
- Cannot view another teacher's class unless given attendance view-all permission.

HR User:
- Can view staff records for the logged-in School ID.
- Can manage leave types.
- Can view all leave requests for the logged-in School ID.
- Can approve or decline leave.
- Can manage leave balances.
- Can generate payslips.
- Can review, approve, finalize, and view previous payslips if permission is granted.
- Can view HR/payroll summaries.
- Cannot access finance functions such as invoices, refunds, or bank reconciliation unless finance permission is also granted.

Finance User:
- Can view and manage invoices.
- Can view and manage payments.
- Can manage billing categories.
- Can perform bank reconciliation.
- Can view outstanding fees.
- Can record promise-to-pay.
- Can send invoices or statements if permission is granted.
- Cannot approve leave.
- Cannot view payroll unless HR/payroll permission is also granted.
- Cannot view sensitive student medical or demographic information unless specifically granted permission.

Admissions User:
- Can view online enrolment applications.
- Can review submitted applications.
- Can mark applications as In Review, Accepted, Waitlisted, or Refused.
- Can convert accepted applications into students if permission is granted.
- Cannot access finance, payroll, or sensitive reports unless separately granted permission.

Reporting User:
- Can view school reports for the logged-in School ID.
- Can export reports if export permission is granted.
- Cannot export sensitive reports unless sensitive export permission is granted.
- Cannot view ethnicity, medical, payroll, or consent reports unless specifically granted permission.

Parent:
- Can access the Parent Management Dashboard only.
- Can view own child or children only.
- Can view own account and statement only.
- Can view attendance for own child or children only.
- Can update own contact details.
- Can respond to consent requests for own child or children.
- Can complete online enrolment or re-enrolment forms where enabled.
- Cannot view other families, other students, staff data, finance reports, HR/payroll records, or ethnicity reports.

##### System Permission Rules

- The system must deny access by default.
- Access must only be granted through assigned roles and permissions.
- Every school-level permission must be scoped to the logged-in School ID.
- DevForge platform permissions must be separated from school-level permissions.
- A user may have more than one role.
- If a user has multiple roles, the system may combine allowed permissions, but School ID boundaries must still apply.
- Sensitive permissions must be granted explicitly.
- Sensitive data access must be audit logged.
- Export permissions must be separate from view permissions.
- Users from one school must never receive access to another school's data through role assignment.
- Deactivated users must immediately lose access.
- Suspended schools must block all linked school users from using the system.
- Parent users must only be linked to their own family and child records.

###### Self-Granting Restriction

- School Admin users can assign roles and permissions, but they must not be able to grant themselves sensitive permissions unless this is allowed by DevForge or an existing authorised school owner.
- Sensitive permissions include HR/payroll, ethnicity, medical information, ID documents, passport documents, financial approval, refunds, year-end reopening, and sensitive exports.
- Any sensitive permission assignment must be audit logged.
- The audit log must record who granted the permission, who received the permission, when it was granted, and which permission was granted.

##### Permission Inheritance Rule

- Role permissions are inherited from assigned roles.
- Direct user permissions may be added as exceptions.
- Direct deny rules must override role permissions.
- Suspended school status overrides all school-level permissions.
- Deactivated user status overrides all permissions.
- Parent ownership restrictions override all other parent permissions.
- Teacher class assignment restrictions override general teacher permissions.
- Sensitive data permissions must always be granted explicitly.
- Export permissions must never be assumed from view permissions.

##### Suggested Permission Keys

DevForge permissions:
- devforge.schools.view
- devforge.schools.create
- devforge.schools.edit
- devforge.schools.suspend
- devforge.schools.activate
- devforge.users.view
- devforge.users.create
- devforge.users.edit
- devforge.users.deactivate
- devforge.audit.view
- devforge.audit.export
- devforge.platform_reports.view
- devforge.templates.manage

School general permissions:
- school.settings.view
- school.settings.edit
- school.classes.view
- school.classes.manage
- school.staff.view
- school.staff.manage
- school.staff.permissions.manage
- school.students.view
- school.students.manage
- school.parents.view
- school.parents.manage

Teacher and attendance permissions:
- classes.view_assigned
- attendance.submit_assigned
- attendance.view_assigned
- attendance.edit_assigned
- attendance.view_all
- attendance.edit_all
- attendance.correct

Admissions permissions:
- admissions.view
- admissions.review
- admissions.accept
- admissions.waitlist
- admissions.refuse
- admissions.convert_to_student
- admissions.documents.view
- admissions.documents.upload

Finance permissions:
- finance.invoices.view
- finance.invoices.create
- finance.invoices.edit
- finance.invoices.soft_delete
- finance.payments.view
- finance.payments.allocate
- finance.bank_reconciliation.view
- finance.bank_reconciliation.approve_match
- finance.bank_reconciliation.correct
- finance.outstanding_fees.view
- finance.billing_categories.manage
- finance.discounts.manage
- finance.credit_notes.create
- finance.refunds.create
- finance.refunds.approve
- finance.refunds.complete
- finance.adjustments.create
- finance.adjustments.approve
- finance.adjustments.reject
- finance.refunds.reject
- finance.credit_notes.approve
- finance.credit_notes.finalize
- finance.year_end_close
- finance.year_end_reopen
- finance.registration_fees.view
- finance.registration_fees.manage
- finance.registration_fees.mark_paid

HR / Payroll permissions:
- leave.apply
- leave.view_own
- leave.cancel_own_pending
- leave.view_all
- leave.approve
- leave.decline
- leave.manage_types
- leave.manage_balances
- leave.adjust_balances
- leave.view_reports
- hr.view_staff_documents
- hr.manage_staff_documents
- hr.view_payslips
- hr.manage_payslips
- payroll.generate
- payroll.review
- payroll.approve
- payroll.finalize
- payroll.view_previous
- payroll.correct

Reporting permissions:
- reports.view
- reports.export
- reports.finance.view
- reports.finance.export
- reports.attendance.view
- reports.attendance.export
- reports.demographics.view
- reports.demographics.export
- reports.ethnicity.view
- reports.ethnicity.export
- reports.consent.view
- reports.consent.export
- reports.year_end.view
- reports.year_end.export

Sensitive data permissions:
- sensitive.student_medical.view
- sensitive.student_documents.view
- sensitive.student_documents.upload
- sensitive.staff_documents.view
- sensitive.staff_documents.upload
- sensitive.ethnicity.view
- sensitive.ethnicity.export
- sensitive.id_documents.view
- sensitive.payroll.view
- sensitive.payroll.export

Parent permissions:
- parent.children.view
- parent.attendance.view
- parent.account.view
- parent.statement.download
- parent.details.update
- parent.consent.respond
- parent.enrolment.submit
- parent.notifications.view

Communication permissions:
- communication.history.view
- communication.history.resend
- communication.templates.manage
- communication.delivery_status.view

Statement and invoice sending permissions:
- statements.send
- statements.schedule
- statements.resend
- statements.delivery_status.view

Parent update permissions:
- school.parent_updates.view
- school.parent_updates.approve
- school.parent_updates.reject

Consent permissions:
- school.consent.manage
- school.consent.view
- school.consent.export

Online enrolment permissions:
- school.enrolment_form.manage
- school.terms_conditions.manage
- admissions.terms_conditions.view
- admissions.terms_conditions.acceptance_view

Year rollover permissions:
- school.year_rollover.start
- school.year_rollover.preview
- school.year_rollover.apply
- school.year_rollover.override_class
- school.year_rollover.age_rules_manage

Document permissions:
- documents.student.view
- documents.student.upload
- documents.student.delete
- documents.staff.view
- documents.staff.upload
- documents.staff.delete
- documents.admissions.view
- documents.admissions.upload

#### Permission Check Requirement

- Every API route must check authentication.
- Every school-level API route must check the logged-in School ID.
- Every sensitive API route must check the required permission.
- Every export route must check export permission separately from view permission.
- Every parent route must check that the requested student, account, attendance, consent, or document belongs to the logged-in parent.
- Every teacher attendance route must check that the class is assigned to the logged-in teacher unless the user has attendance view-all or edit-all permission.
- Every HR/payroll route must check HR or payroll permission.
- Every finance approval route must check finance approval permission.
- Every DevForge route must check DevForge platform permission.
- Failed permission checks should be denied and audit logged where the action involves sensitive data or security.

#### Permission Audit Rule

- All role changes must be audit logged.
- All permission changes must be audit logged.
- All failed access attempts to sensitive data must be audit logged.
- All sensitive exports must be audit logged.
- All parent ownership check failures must be audit logged.
- All teacher class assignment check failures must be audit logged.
- All DevForge platform permission failures must be audit logged.

### 6. Visual Layout Rule

Dashboard home pages must use a clean icon-based layout.

Use this style:

```text
Light grey page background

White section block
    Section heading
    Row of icons
    Icon labels
```

For the School Management Dashboard, the main visual should be:

```text
---------------------------------------------------------
| ABC School Management Dashboard                Logout |
---------------------------------------------------------

---------------------------------------------------------
| SCHOOL MANAGEMENT                                     |
|                                                       |
|   [ School Icon ]     [ Finance Icon ]     [ Reporting Icon ]
|   School              Finance              Reporting  |
|                                                       |
---------------------------------------------------------
```

When a user clicks School, Finance, or Reporting, the system opens that module's landing page showing feature icons. Each feature icon opens a dedicated page for that feature only.

#### Individual Icon Asset Requirement

- Each dashboard icon must be created and saved as a separate individual asset.
- Do not use one combined image for all dashboard icons.
- Do not crop a single combined image manually as the final implementation approach.
- Each icon must be its own separate file.
- Prefer SVG for production icons.
- PNG can be added as a fallback.
- Use transparent background for individual icons where possible.
- Use the same blue/navy icon style across all icons.
- Each icon file must be named clearly and consistently.
- Icon labels must be rendered by the application UI, not baked into the icon image.
- The icon image should contain only the icon graphic.
- The tile/card, label, hover effect, and spacing must be handled by CSS/UI components.

#### Icon Naming Convention

Icon files must be stored in `/public/assets/icons/` and follow this naming convention:

Main navigation: icon-nav-home.svg, icon-nav-school.svg, icon-nav-finance.svg, icon-nav-reporting.svg, icon-nav-account.svg, icon-nav-settings.svg

DevForge: icon-devforge-schools.svg, icon-devforge-users.svg, icon-devforge-audit.svg

School module: icon-school-classes.svg, icon-school-staff.svg, icon-school-students.svg, icon-school-parents.svg, icon-school-attendance.svg, icon-school-admissions-enrolment.svg, icon-school-re-enrolment-year-rollover.svg, icon-school-settings.svg, icon-school-consent-permissions.svg

Finance module: icon-finance-bank-reconciliation.svg, icon-finance-outstanding-fees.svg, icon-finance-bank-transactions.svg, icon-finance-bank-statements.svg, icon-finance-suggested-matches.svg, icon-finance-invoices.svg, icon-finance-billing-categories.svg, icon-finance-hr-payroll.svg, icon-finance-financial-adjustments.svg, icon-finance-refunds.svg, icon-finance-registration-deposit-fees.svg, icon-finance-year-end-financial-closing.svg

Reporting module: icon-reporting-student-reports.svg, icon-reporting-school-report.svg, icon-reporting-send-invoices-to-parents.svg, icon-reporting-export-reports.svg, icon-reporting-communication-history.svg, icon-reporting-admissions-report.svg, icon-reporting-re-enrolment-report.svg, icon-reporting-consent-report.svg, icon-reporting-year-end-report.svg

Parent dashboard: icon-parent-my-child.svg, icon-parent-account.svg, icon-parent-notifications.svg, icon-parent-admissions-re-enrolment.svg, icon-parent-consent.svg

#### Icon UI Implementation Rule

- The application must use reusable icon tile components.
- Each icon tile must contain: icon image, title label, optional short description, permission check, and route target.
- Icons must be hidden or disabled if the user does not have permission.

### 7. Final Navigation Behaviour

Use this flow:

```text
Separate login link
        |
        v
User logs in
        |
        v
System validates access
        |
        v
Dashboard home / side menu opens
        |
        v
User clicks a main module (School, Finance, Reporting)
        |
        v
Module landing page opens with feature icons
        |
        v
User clicks a feature icon
        |
        v
Dedicated feature page opens
        |
        v
Page shows only that feature's forms, filters, tables, summaries, and actions
```

### 8. README Update Requirement

The README must clearly reflect the 3-level layout structure.

The README must not say that Staff, Learners, Parents, Classes, Bank Reconciliation, Outstanding Fees, Payslips, or Leave are main dashboard icons or side menu items.

Main module opens a module landing page. Module landing page shows feature icons. Feature icon opens a dedicated page. Dedicated feature page shows only that feature's forms, filters, tables, summaries, and actions.

The layout must not change the existing security model:

- Azure SaaS multi-tenant structure stays in place.
- SchoolID isolation stays in place.
- Backend must enforce SchoolID separation.
- Parent users must only access their own child or children.
- Teachers must only access assigned classes unless given extra permission.
- Finance and HR permissions must stay separate.
- Sensitive data must require explicit permission.
- Export permissions must be separate from view permissions.
- All sensitive actions must be audit logged.

## Local Development

Install dependencies:

```bash
npm install
```

Start the API:

```bash
npm run dev
```

Run the database setup script:

```bash
npm run setup-db
```

Run this again after schema changes so new tables and columns such as reconciliation matches and user activation flags are applied.

Once the server starts, open the local app in your browser.

- Default URL: `http://localhost:3000`
- If port `3000` is already in use, the server now automatically falls back to `http://localhost:3001`
- Confirm the backend is live at `/health` on whichever port the server starts on.
- The login page no longer includes hard-coded demo credentials. Use the correct role-specific login link and sign in with an existing user from the connected database.

## Change History

- **HR / Payroll payslip view, edit, and PDF print flow:** Finance / HR / Payroll now opens payslips in a detail popup, shows required school and employee payroll details, allows draft payslip editing for HR-permitted users, finalizes payslips as read-only history, and provides a clean print layout that can be saved as PDF from the browser print dialog. Employee payroll defaults, school registration number, payment date, and itemised financial fields are stored in the database and used when generating payslips.
- **Staff popup CRUD and Outstanding Fees data fix:** School / Staff now opens Add Staff in a popup, supports row-level Edit before the status column, and persists staff start-date edits. Finance / Outstanding Fees now routes correctly to the outstanding-fees data endpoint so the year-calendar table loads real invoice balances.
- **Learner enrolment and edit persistence:** School / Register Learner now captures learner, parent/family, billing, and medical details in a tabbed CRUD form. School / Students now edits learners in a popup and saves learner fields to `Students`, parent/family fields to `Families`, and multiple billing-category assignments to `StudentBillingCategories`.
- **Three-level dashboard layout:** Updated the README and school/parent dashboard wiring to use Level 1 side navigation, Level 2 module landing pages with feature icons, and Level 3 dedicated feature pages. School, Finance, Reporting, DevForge, and Parent navigation now match the final layout rules.
- **Port fallback:** Updated `src/app.js` to automatically try the next port if `3000` is already in use.
- **Static route fix:** Disabled Express static index file serving so `/` now correctly serves `public/login.html` instead of `public/index.html`.
- **Login card square:** Made the login card square with `aspect-ratio: 1` in `public/styles.css`.
- **Admin password fix:** Updated the seeded admin user password hash in `db/schema.sql` to match the `admin123` password used in the test login.
- **Login flow cleanup:** Removed stale auth/register-only logic from `public/app.js` so the main SPA stays separate from the dedicated login page.
- **Dedicated login route:** Kept `/` serving `public/login.html` and `/sms` serving `public/index.html`.
- **Removed stale demo login:** Removed the hard-coded Test Login button and demo credential hint because the database setup script does not seed that account.
- **Runtime port note:** Use the port printed in the terminal. The app uses `3000` by default and falls back to `3001` when `3000` is occupied.
- **CSRF / CORS hardening:** Replaced the open `cors()` call with a restricted origin list read from `ALLOWED_ORIGINS` env var. Set `credentials: false` and explicit allowed methods/headers. Since auth uses JWT via the `Authorization` header and not cookies, this eliminates the CSRF attack surface flagged by the code review.
- **Database pool reuse:** Added `getPool()` helper in `src/data/db.js`. All repositories now reuse the global connection pool instead of calling `sql.connect()` on every query.
- **SQL aggregate summary:** Replaced in-memory transaction/invoice summary calculation in `transactionService` with SQL `SUM` and `CASE` aggregates. This eliminates loading all rows into Node.js memory.
- **Sargable invoice date filter:** Changed `invoiceExistsForStudentMonth` from `CONVERT(VARCHAR(7), IssueDate, 120)` to a date range filter using `IssueDate >= @start AND IssueDate < @end` so the query can use indexes.
- **Batch invoice generation:** Added `getStudentsWithInvoiceForMonth` to check all existing invoices in one query instead of one query per student.
- **Billing category-aware invoicing:** Monthly invoice generation now uses the billing category assigned to each student, including amount and frequency, instead of only the school default fee.
- **Billing category API:** Added `/api/billing-categories` routes with CRUD to expose the existing billing category service.
- **HR module — Employees:** Added `Employees` table, `employeeRepository`, `employeeService`, and `/api/employees` routes. Employees are linked to a school and optionally to a user account.
- **HR module — Leave requests:** Added `LeaveRequests` table, `leaveRepository`, `leaveService`, and `/api/leaves` routes. Employees can submit leave and school admins can approve or reject leave. Leave balance is deducted on approval.
- **HR module — Payslips:** Added `Payslips` table, `payslipRepository`, `payslipService`, and `/api/payslips` routes. School admins create payslips per employee per pay period. Employees can view their own payslips.
- **Schema indexes:** Added composite index `IX_Invoices_StudentID_IssueDate` for monthly generation performance. Added HR table indexes.
- **Removed stale sql dependency:** `UserService`, auth middleware, and user routes no longer pass or require the `sql` object because repositories handle their own connections via `getPool()`.
- **Audit logging:** Added `auditLogRepository` and `audit` middleware. State-changing invoice routes now auto-log to the `AuditLogs` table with user, entity, action, and IP.
- **Rate limiting:** Added `express-rate-limit`. Login/register endpoints allow 20 requests per 15 minutes. All other API endpoints allow 300 per 15 minutes.
- **Soft delete:** Invoices now use `IsDeleted` flag instead of hard delete. All queries filter out deleted records.
- **Partial payments:** Added `AmountPaid` column to Invoices and `POST /api/invoices/:id/payment` endpoint. Invoices transition through Pending, Partial, and Paid as payments are recorded.
- **Invoice payment wiring:** Added a working Record payment action in the SPA and fixed Mark paid so it records only the remaining balance after partial payments.
- **Student and family UI wiring:** Connected the Parents tile, family creation form, student creation form, student status filters, and student departure workflow to the existing API routes.
- **School user management:** Added school-scoped user creation so a school account can add additional staff users for the same school from the Account page.
- **School user activation controls:** School accounts can activate or deactivate staff users. Deactivated users cannot sign in.
- **Audit log viewer:** Added `/api/audit` and an Account-page audit activity table so schools can review recent account and finance changes.
- **Reconciliation refresh:** Bank statement uploads now refresh the visible reconciliation, transaction, and bank statement data after a successful upload.
- **Manual bank match approval:** Reconciliation now shows suggested bank transaction to invoice matches, but nothing is applied automatically. A user must confirm and approve each suggested match before the invoice and transaction are linked.
- **Button busy states:** Standalone action buttons such as Generate Monthly Invoices now correctly show disabled/loading state while requests are running.
- **Overdue invoice flagging:** Added `POST /api/invoices/flag-overdue` endpoint and an automatic hourly scheduler that marks past-due Pending invoices as Overdue.
- **Pagination and search:** Invoice and transaction list endpoints now support `?page=`, `?limit=`, `?search=`, `?status=`, `?fromDate=`, and `?toDate=` query parameters.
- **Parent portal:** Added `parent` user role, `ParentLinks` table, `parentRepository`, `parentService`, and `/api/parent` routes. Parents can view their children, invoices, and balance summary.
- **Payment gateway placeholder:** Added `paymentGatewayService` and `/api/payments` routes. Set `PAYMENT_PROVIDER` env var when integration details are provided.
- **Notification service placeholder:** Added `notificationService` with email trigger methods. Set `SMTP_HOST` or `EMAIL_PROVIDER` env var to enable.
- **CSV data export:** Added `exportService` and `/api/export` routes for downloading invoices, transactions, students, and employees as CSV.
- **Role-based dashboard:** Added `dashboardService` and `/api/dashboard` route. Returns school-specific or platform-wide metrics depending on user role.
- **Separate login links:** Added `/devforge-login`, `/school-login`, and `/parent-login` so each user type has its own entry point. The root URL redirects to `/school-login`.
- **Role-specific login validation:** DevForge staff sign in with email and password, school staff sign in with School ID, email, and password, and parents sign in with email or cell number and password.
- **Suspended school blocking:** School users linked to suspended schools are blocked at login and during authenticated API use. Other schools continue to work normally.
- **Icon-based dashboard homes:** Reworked DevForge, School, and Parent dashboard homes so they show grouped icon sections only. Operational tables, filters, forms, and summaries now live behind the selected icon page.
- **DevForge management dashboard:** Moved platform management into `/devforge`, with separate Schools, Users, Audit, and Account pages. DevForge Users manages internal DevForge staff only.
- **Expanded audit logging:** Successful logins, school additions, school suspensions, school activations, and DevForge user creation now write audit activity.
- **School HR UI wiring:** Connected the school Staff, Leave, and Payslips pages to the existing `/api/employees`, `/api/leaves`, and `/api/payslips` modules.
- **Parent dashboard grouping:** Reworked `/parent` into My Child and Account sections. Attendance and detail updates live inside My Child so the parent dashboard is not over-split.
- **README wiring verification:** Confirmed the separate DevForge, School, and Parent login/dashboard flows. Wired school Classes and Attendance sections into the School page, scoped class capacity and parent attendance access checks, made HR payslip denial non-fatal for school dashboard loading, and added idempotent schema repair for school payment settings columns.
- **HR payslip permissions:** Added `HasHrPermission` flag on Users, `AllowStaffPayslipView` toggle on Schools, and `IsFinalized`/`FinalizedDate` on Payslips. Payslip list, view, create, and finalize endpoints now enforce HR permission. Staff can only view their own payslips if the school explicitly allows it. All payslip access is audit-logged. Finalized payslips are read-only historical records.
- **Billing category term calculation fix:** Fixed `calculateInvoiceAmount` so it divides `BaseAmount` by the term months instead of returning the full amount. Supports named frequencies (Monthly, Quarterly, Annually) and numeric terms (3, 6, 10, 12). For example a R3 600 Quarterly category now correctly generates R1 200 monthly invoices.
- **Attendance module:** Added `Attendance` table, `attendanceRepository`, `attendanceService`, and `/api/attendance` routes. Supports daily capture, bulk recording, student history, and class summary with present/absent/late/excused counts.
- **Classes and timetable module:** Added `Classes` and `Timetable` tables, `classRepository`, `classService`, and `/api/classes` routes. Supports class CRUD, teacher assignment, capacity limits with warnings, and weekly timetable per class.
- **Student documents:** Added `StudentDocuments` table and `/api/features/student-documents` routes. Upload and list documents per student with audit logging on access.
- **Staff documents:** Added `StaffDocuments` table and `/api/features/staff-documents` routes. Upload and list documents per employee with audit logging on access.
- **Employee emergency contacts and contract end date:** Added `EmergencyContactName`, `EmergencyContactPhone`, and `ContractEndDate` columns to Employees.
- **Behaviour / incident log:** Added `BehaviourLogs` table and `/api/features/behaviour` routes. Records date, category, description, action taken, and staff member per student.
- **Academic notes:** Added `AcademicNotes` table and `/api/features/academic-notes` routes. Lightweight per-term notes per student.
- **Student demographics:** Added `Gender` and `Ethnicity` columns to Students. Ethnicity is treated as sensitive POPIA data and access is audit logged.
- **Parent communication log:** Added `ParentCommunicationLogs` table and `/api/features/parent-communication` routes. Records calls, emails, meetings, and fee follow-up notes per family.
- **Parent detail change approval:** Added `ParentDetailChanges` table and `/api/features/parent-detail-changes` routes. Parents submit changes, school staff approve or reject.
- **Credit notes:** Added `CreditNotes` table and `/api/features/credit-notes` routes. Credit notes are linked to the original invoice and audit logged.
- **Discounts and bursaries:** Added `Discounts` table and `/api/features/discounts` routes. Supports fixed, percentage, sibling, and bursary discount types linked to students and billing categories.
- **Promise-to-pay:** Added `PromiseToPay` table and `/api/features/promise-to-pay` routes. Finance staff record promised payment date, amount, and notes per family.
- **Invoice templates:** Added `InvoiceTemplates` table and `/api/features/invoice-templates` routes. Schools configure logo, header, footer, contact details, banking details, and notes.
- **Communication history:** Added `CommunicationHistory` table and `/api/features/communication-history` route. Tracks sent invoices, statements, reminders with delivery status.
- **School visibility toggles:** Added `ShowBehaviourToParents`, `ShowAcademicNotesToParents`, `RequireParentUpdateApproval`, and `EnableProRataBilling` columns to Schools.
- **Parent notification preferences:** Added `ParentNotificationPrefs` table for email/SMS preference per parent user.
- **Admissions / enrolment module:** Added `Admissions` table and `/api/school-features/admissions` routes. Supports applicant creation, status tracking (New, In Review, Accepted, Refused, Enrolled), and conversion to student.
- **Consent management module:** Added `ConsentRecords` table and `/api/school-features/consent` routes. Schools create consent requests per student; parents respond via `/api/school-features/consent/:id/respond`. Missing consent report available at `/api/school-features/consent/missing`.
- **Financial adjustments module:** Added `FinancialAdjustments` table and `/api/school-features/adjustments` routes. Supports write-offs, reversals, credit/debit/fee corrections with mandatory reason and audit logging.
- **Refunds module:** Added `Refunds` table and `/api/school-features/refunds` routes. Supports refund creation, approval workflow, and completion. All actions audit logged.
- **Registration / deposit fees module:** Added `RegistrationFees` table and `/api/school-features/registration-fees` routes. Supports once-off fees with refundable/non-refundable flag and payment marking.
- **Re-enrolment / year rollover module:** Added `ReEnrolment` table and `/api/platform/re-enrolment` routes. Supports single and bulk student processing with Promoted, Left, Retained, and Pending actions. Promoted students get their class updated automatically. Left students are marked inactive. Outstanding balances and advance credits are carried forward.
- **School setup templates module:** Added `SchoolTemplates` table and `/api/platform/templates` routes. DevForge admins can create, update, and apply default setup templates to schools. Templates store default billing terms, roles, dashboard settings, notification settings, and report settings as JSON. Applying a template marks the school but does not overwrite existing settings without confirmation.
- **Platform usage report:** Added `/api/platform/platform-usage` and `/api/platform/platform-usage/trends` routes. DevForge-only endpoints showing active/suspended schools, active users, total students, total invoices, invoiced/paid amounts, and 12-month trends for school registrations and invoice volumes.
- **Staff roles and permissions module:** Added `StaffRoles` and `UserRoleAssignments` tables and `/api/hr/roles` routes. Schools can create roles with JSON permission arrays, assign roles to users, and remove role assignments. All role changes are audit logged.
- **Leave types module:** Added `LeaveTypes` table and `/api/hr/leave-types` routes. Schools can create and manage configurable leave types with settings for paid/unpaid, annual allocation, approval required, document required, carry forward, and payroll impact.
- **Leave balances module:** Added `LeaveBalances` table and `/api/hr/leave-balances` routes. Per-employee, per-leave-type, per-year balance tracking with initialize, deduct, and adjust operations. Balance adjustments require a reason and are audit logged.
- **Year-end financial closing module:** Added `YearEndClosing` and `BalanceBroughtForward` tables and `/api/hr/year-end` routes. Supports year-end record creation, status workflow (Open, In Review, Ready to Close, Closed, Reopened for Correction), balance carry-forward per student, and reopen with mandatory reason. All actions audit logged.
- **School name uniqueness enforcement:** Added `NormalizedSchoolName` computed persisted column and `UX_Schools_NormalizedSchoolName` unique index to the schema. School creation and update now use case-insensitive, trim-aware normalized name checks. Duplicate attempts return HTTP 409 with "A school with this name already exists." SQL unique constraint violations are caught and returned as user-friendly errors. Duplicate registration and name update attempts are audit logged.
- **School manager leave approval toggle:** Added `EnableManagerLeaveApproval` column to Schools.
- **Student search fix:** Wired the student search inputs on the Students page. Search by student name, student surname, parent name, or family code now filters the learner table in real time.
- **Outstanding Fees export fix:** The Export button on the Outstanding Fees page now downloads a CSV file via fetch with the auth token. Includes monthly Jan-Dec columns, parent details, promise-to-pay, school name, and export date. Shows error message on failure instead of downloading empty file.
- **Register Learner icon:** Added Register Learner as a new icon on the School landing page with its own dedicated registration form page. The form includes family, billing category, name, DOB, class, billing date, enrolled date, and medical notes.
- **Permission-based icon hiding:** Added data-permission attributes to icon tiles. Icons are hidden based on user permissions (e.g. HR/Payroll icon hidden if user lacks HasHrPermission). The applyIconPermissions function runs after login.
- **Leave request type linking:** Added `LeaveTypeID` column to LeaveRequests for linking to configurable leave types.

## API Modules

- Users and authentication: `/api/users`
- Schools: `/api/schools`
- Invoices: `/api/invoices`
- Families: `/api/families`
- Students: `/api/students`
- Billing categories: `/api/billing-categories`
- Transactions: `/api/transactions`
- Bank statements: `/api/bank-statements`
- Audit logs: `/api/audit`
- Employees HR: `/api/employees`
- Leave requests HR: `/api/leaves`
- Payslips HR: `/api/payslips`
- Parent portal: `/api/parent`
- Payment gateway: `/api/payments`
- Data export CSV: `/api/export`
- Dashboard: `/api/dashboard`
- Attendance: `/api/attendance`
- Classes and timetable: `/api/classes`
- Features (behaviour, academic notes, documents, credit notes, discounts, promise-to-pay, invoice templates, communication): `/api/features`
- Admissions and enrolment: `/api/school-features/admissions`
- Consent management: `/api/school-features/consent`
- Financial adjustments: `/api/school-features/adjustments`
- Refunds: `/api/school-features/refunds`
- Registration / deposit fees: `/api/school-features/registration-fees`
- Re-enrolment / year rollover: `/api/platform/re-enrolment`
- School setup templates (DevForge): `/api/platform/templates`
- Platform usage report (DevForge): `/api/platform/platform-usage`
- Staff roles and permissions: `/api/hr/roles`
- Leave types: `/api/hr/leave-types`
- Leave balances: `/api/hr/leave-balances`
- Year-end financial closing: `/api/hr/year-end`
- Health check: `/health`

## Application UI

The Express server also serves the browser application from `public/`.

Once the API is running, open:

```text
http://localhost:3000
```

If `3000` is occupied, use the fallback port shown in the terminal, usually:

```text
http://localhost:3001
```

The application must use separate login links:

- DevForge Solutions staff: `/devforge-login`
- School staff: `/school-login`
- Parents: `/parent-login`

After successful login, role-specific dashboards are separated as follows:

- School staff: `/sms`
- Parents: `/parent`
- DevForge Solutions staff: `/devforge`

The current vertical slice includes:

- Separate login access for DevForge Solutions staff, school staff, and parents.
- School Management login with School ID, email, and password.
- DevForge staff login with email and password.
- Parent login with email or cell number and password.
- School account admins can add additional staff users for their school.
- School account admins can activate and deactivate staff user access.
- DevForge dashboard metrics.
- School tenant listing, registration, account editing, activation, and suspension.
- DevForge internal user creation and activation/deactivation.
- DevForge audit page for recent system activity.
- Family and student management, including student status filters and departure/inactive workflow.
- Icon-based dashboard navigation grouped into clear sections.
- School dashboard side menu for Home, School, Finance, Reporting, Account, and Settings.
- School module landing pages for School, Finance, and Reporting, with lower-level functions presented as Level 2 feature icons.
- Dedicated Level 3 feature pages for each School, Finance, and Reporting feature so one module page does not contain all feature content.
- Learner-style pages with actions, search, filters, summary charts, pagination, and data tables.
- Invoice creation, listing, partial payment recording, payment marking, and deletion.
- Billing category management per school.
- Monthly invoice auto-generation based on billing categories.
- Bank statement upload, reconciliation refresh, and confirmed manual approval of suggested bank-to-invoice matches.
- Advance payment allocation where overpaid funds can be stored as credit and used against future invoices.
- Outstanding Fees year-calendar view showing outstanding amounts under the correct month.
- Audit activity review for recent account and finance changes.
- Employee management, leave requests, and payslips HR.
- Parent portal with child information, update details, invoice, statement, and balance views.
- Partial payments and overdue invoice flagging.
- CSV export for invoices, transactions, students, and employees.
- Role-based dashboard metrics.
- School-user views scoped to the signed-in school.
- Suspended-school access blocking for school staff.

## Pending Integrations

- **Payment gateway:** The `/api/payments` routes and `paymentGatewayService` are scaffolded. Set `PAYMENT_PROVIDER` and provider-specific env vars once integration details are provided.
- **Email notifications:** The `notificationService` logs to console when email is not configured. Set `SMTP_HOST` or `EMAIL_PROVIDER` to enable real delivery.
- **SMS provider integration:** SMS delivery is not yet configured. Set `SMS_PROVIDER` env var when provider details are available.
- **PDF export support:** PDF generation for invoices, statements, and reports is listed as a future option.
- **Delivery status tracking:** Email/SMS delivery status tracking depends on provider webhook support.
- **Birthday and demographic reporting endpoints:** Report generation endpoints are defined but not yet implemented as dedicated routes.
- **Ethnicity reporting with aggregation:** Ethnicity data storage is in place but aggregated reporting endpoints are not yet built.
- **Fee reminder automation:** Reminder rules are defined but automated sending depends on the notification service being configured.
- **Scheduled statement sending:** Defined in requirements but depends on a job scheduler and notification service.
- **Age-based class movement:** Age-based class movement during re-enrolment using birth year and month range rules is defined but not yet implemented.
- **Online enrolment form:** School-specific online enrolment form with terms and conditions acceptance is defined but not yet implemented.
- **Online enrolment decisions:** Online enrolment application review with Accepted, Waitlisted, and Refused decisions is defined but not yet implemented.
- **Online enrolment document upload:** Document upload during online enrolment is defined but not yet implemented.
- **Admission-to-student conversion:** Admission-to-student conversion workflow with class, family, billing category, and enrolment date requirements is defined but not yet implemented.
- **Teacher assigned class list view:** Teacher-specific class list view is defined but not yet implemented.
- **Teacher attendance submission:** Teacher attendance submission for assigned classes is defined but not yet implemented.
- **Attendance review and correction workflow:** Attendance approval, missing submission tracking, and correction with reason are defined but not yet implemented.
- **Leave balance management:** Per-staff leave balances by leave type and year are defined but not yet implemented.
- **Leave approval workflow:** Full leave application, approval, decline, and cancellation flow is defined but not yet implemented.
- **Leave-to-payroll deduction integration:** Unpaid leave deduction on payslips is defined but not yet implemented.
- **Payroll correction workflow:** Maker-checker corrections for already finalized payslips are defined but not yet implemented.
- **Staff contract expiry alerts:** Contract expiry alerting for HR users is defined but not yet implemented.
- **Full role and permission matrix enforcement:** Role-based permission matrix with per-role access rules is defined but not yet enforced at the route level.
- **Permission key mapping per role:** Granular permission keys are defined but not yet stored or checked per user/role.
- **School-scoped permission checks on every route:** School ID boundary checks exist on most routes but granular permission key checks are not yet implemented.
- **Sensitive data permission enforcement:** Sensitive data access (ethnicity, medical, documents, payroll) is defined but granular permission checks are not yet enforced on every route.
- **Export-specific permission enforcement:** Export routes exist but do not yet check export-specific permissions separately from view permissions.
- **Maker-checker approval workflow:** Separation of duties for refunds, financial adjustments, credit notes, payroll corrections, and year-end reopening is defined but not yet enforced.
- **Teacher class assignment permission checks:** Teacher-specific class and attendance permission checks are defined but not yet enforced at the route level.
- **Parent ownership checks for all parent portal data:** Parent routes check family links but do not yet verify ownership for every sub-resource (documents, consent, attendance).
- **Audit logging for failed sensitive permission checks:** Failed permission attempts on sensitive data are not yet audit logged.
- **System-wide Access Control and Permission Model enforcement:** The full role and permission model is defined but not yet enforced at every route level.
- **Permission inheritance and direct deny rules:** Permission inheritance and deny override logic is defined but not yet implemented.
- **Self-granting restriction for sensitive permissions:** Self-granting prevention for sensitive permissions is defined but not yet enforced.
- **Missing permission keys mapped to backend checks:** All suggested permission keys are defined but not yet stored or checked per user/role in the database.
- **Admission status wording standardised to Refused:** Admission status wording has been standardised to Refused throughout the README. The database schema constraint should be verified to match.
- **Permission audit logging for failed sensitive access attempts:** Audit logging for denied sensitive data access is defined but not yet implemented.
- **Export permission enforcement separate from view permission:** Export routes exist but do not yet enforce export-specific permission checks separately from view.

## Azure Deployment

Azure App Service deployment instructions are in [docs/AZURE_DEPLOYMENT.md](docs/AZURE_DEPLOYMENT.md).

If Azure shows the default "Your web app is running and waiting for your content" page, the App Service exists but this repository has not been deployed to the web app content folder yet, or the startup command/runtime settings are missing.

## Engineering Notes

- Keep route files thin and place business decisions in `src/business`.
- Keep SQL access inside `src/data`.
- Add clear comments where logic may be difficult to maintain later.
- Do not hard-code production secrets in source files. Azure deployments should use Azure Key Vault and managed identity.
