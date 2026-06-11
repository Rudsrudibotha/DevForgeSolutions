'use strict';
// Demo fixtures for local preview without a database.
// Active only when DEMO_DATA=true (never in production, never in tests).
// Used as safeCall fallbacks so real data always wins when the DB is up.

const enabled = () =>
  process.env.DEMO_DATA === 'true' && process.env.NODE_ENV !== 'production';

// Returns the fixture when demo mode is on, otherwise the normal fallback.
function demoOr(key, fallback) {
  if (!enabled()) return fallback;
  const fixture = FIXTURES[key];
  return typeof fixture === 'function' ? fixture() : fixture;
}

const today = () => new Date();
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysAhead = (n) => new Date(Date.now() + n * 86400000);

const SUNSHINE_SCHOOL = 'Sunshine Academy';

const STUDENTS = [
  { StudentID: 1, FirstName: 'Lwazi',  LastName: 'Dlamini',  ClassName: 'Busy Bees',    Grade: 'RR', FamilyName: 'Dlamini',  DateOfBirth: '2021-03-14', EnrolledDate: '2025-01-15', IsActive: 1, OutstandingAmount: 0,    PrimaryParentEmail: 'sunshine.dlamini@devforgesolutions.com' },
  { StudentID: 2, FirstName: 'Anika',  LastName: 'Naidoo',   ClassName: 'Busy Bees',    Grade: 'RR', FamilyName: 'Naidoo',   DateOfBirth: '2021-07-02', EnrolledDate: '2025-01-15', IsActive: 1, OutstandingAmount: 1850, PrimaryParentEmail: 'sunshine.naidoo@devforgesolutions.com' },
  { StudentID: 3, FirstName: 'Pieter', LastName: 'van Wyk',  ClassName: 'Sunflowers',   Grade: 'R',  FamilyName: 'van Wyk',  DateOfBirth: '2020-11-21', EnrolledDate: '2024-01-10', IsActive: 1, OutstandingAmount: 0,    PrimaryParentEmail: 'sunshine.vanwyk@devforgesolutions.com' },
  { StudentID: 4, FirstName: 'Naledi', LastName: 'Mokoena',  ClassName: 'Sunflowers',   Grade: 'R',  FamilyName: 'Mokoena',  DateOfBirth: '2020-05-09', EnrolledDate: '2024-01-10', IsActive: 1, OutstandingAmount: 3700, PrimaryParentEmail: 'sunshine.mokoena@devforgesolutions.com' },
  { StudentID: 5, FirstName: 'Emma',   LastName: 'Botha',    ClassName: 'Little Lions', Grade: 'RRR',FamilyName: 'Botha',    DateOfBirth: '2022-01-30', EnrolledDate: '2025-06-01', IsActive: 1, OutstandingAmount: 1850, PrimaryParentEmail: 'sunshine.botha@devforgesolutions.com' },
  { StudentID: 6, FirstName: 'Sipho',  LastName: 'Khumalo',  ClassName: 'Little Lions', Grade: 'RRR',FamilyName: 'Khumalo',  DateOfBirth: '2022-04-17', EnrolledDate: '2025-06-01', IsActive: 1, OutstandingAmount: 0,    PrimaryParentEmail: 'sunshine.khumalo@devforgesolutions.com' }
];

const INVOICES = [
  { InvoiceID: 101, InvoiceNumber: 'SUN-2026-0101', StudentID: 2, StudentName: 'Anika Naidoo',   FamilyName: 'Naidoo',  SchoolName: SUNSHINE_SCHOOL, Amount: 1850, AmountPaid: 0,    Outstanding: 1850, PaymentCount: 0, Status: 'Pending', DueDate: daysAhead(6),  PrimaryParentEmail: 'sunshine.naidoo@devforgesolutions.com' },
  { InvoiceID: 102, InvoiceNumber: 'SUN-2026-0102', StudentID: 4, StudentName: 'Naledi Mokoena', FamilyName: 'Mokoena', SchoolName: SUNSHINE_SCHOOL, Amount: 1850, AmountPaid: 0,    Outstanding: 1850, PaymentCount: 0, Status: 'Overdue', DueDate: daysAgo(12), PrimaryParentEmail: 'sunshine.mokoena@devforgesolutions.com' },
  { InvoiceID: 103, InvoiceNumber: 'SUN-2026-0103', StudentID: 4, StudentName: 'Naledi Mokoena', FamilyName: 'Mokoena', SchoolName: SUNSHINE_SCHOOL, Amount: 1850, AmountPaid: 0,    Outstanding: 1850, PaymentCount: 0, Status: 'Overdue', DueDate: daysAgo(42), PrimaryParentEmail: 'sunshine.mokoena@devforgesolutions.com' },
  { InvoiceID: 104, InvoiceNumber: 'SUN-2026-0104', StudentID: 5, StudentName: 'Emma Botha',     FamilyName: 'Botha',   SchoolName: SUNSHINE_SCHOOL, Amount: 1850, AmountPaid: 0,    Outstanding: 1850, PaymentCount: 0, Status: 'Pending', DueDate: daysAhead(6),  PrimaryParentEmail: 'sunshine.botha@devforgesolutions.com' },
  { InvoiceID: 105, InvoiceNumber: 'SUN-2026-0105', StudentID: 1, StudentName: 'Lwazi Dlamini',  FamilyName: 'Dlamini', SchoolName: SUNSHINE_SCHOOL, Amount: 1850, AmountPaid: 1850, Outstanding: 0,    PaymentCount: 1, Status: 'Paid',    DueDate: daysAgo(24), PrimaryParentEmail: 'sunshine.dlamini@devforgesolutions.com' },
  { InvoiceID: 106, InvoiceNumber: 'SUN-2026-0106', StudentID: 3, StudentName: 'Pieter van Wyk', FamilyName: 'van Wyk', SchoolName: SUNSHINE_SCHOOL, Amount: 1850, AmountPaid: 1850, Outstanding: 0,    PaymentCount: 1, Status: 'Paid',    DueDate: daysAgo(24), PrimaryParentEmail: 'sunshine.vanwyk@devforgesolutions.com' }
];

const FIXTURES = {
  // /sms dashboard - shape of dashboardService.getSchoolDashboard()
  schoolDashboard: () => ({
    activeStudents: 64,
    familyCount: 51,
    employeeCount: 9,
    pendingInvoices: 14,
    overdueInvoices: 5,
    outstandingAmount: 23850,
    paidLast30Days: 96200,
    pendingLeaveRequests: 2,
    warnings: [
      { code: 'attendance-not-captured', title: 'Attendance not captured', count: 12, detail: "Capture today's attendance for current learners." },
      { code: 'overdue-invoices',        title: 'Overdue invoices',        count: 5,  detail: 'Follow up outstanding balances.' },
      { code: 'unallocated-bank',        title: 'Unallocated bank payments', count: 3, detail: 'Review bank reconciliation and allocate payments.' }
    ],
    overview: {
      capacity: [
        { className: 'Busy Bees',    capacity: 20, learnerCount: 18 },
        { className: 'Sunflowers',   capacity: 24, learnerCount: 24 },
        { className: 'Little Lions', capacity: 16, learnerCount: 12 },
        { className: 'Rainbow Room', capacity: 15, learnerCount: 10 }
      ],
      totalCapacity: 75,
      totalLearners: 64,
      attendanceToday: [
        { status: 'Present', count: 52 },
        { status: 'Absent',  count: 6 },
        { status: 'Late',    count: 2 }
      ]
    }
  }),

  // /sms/students list - shape of studentService.list()
  smsStudents: () => ({
    rows: STUDENTS, total: STUDENTS.length, page: 1, pageSize: 25, hasMore: false,
    filters: { search: '', classId: '', status: 'active' }
  }),
  smsClasses: () => ([
    { ClassID: 1, ClassName: 'Busy Bees' }, { ClassID: 2, ClassName: 'Sunflowers' },
    { ClassID: 3, ClassName: 'Little Lions' }, { ClassID: 4, ClassName: 'Rainbow Room' }
  ]),

  // /sms/invoices list - shape of invoiceService.list()
  smsInvoices: () => ({
    rows: INVOICES, total: INVOICES.length, page: 1, pageSize: 25, hasMore: false,
    kpis: { totalOutstanding: 5550, totalOverdue: 3700, count: INVOICES.length },
    filters: { status: '', studentId: '', familyId: '', overdueOnly: false, from: '', to: '', search: '' }
  }),

  // /sms/attendance whole-school register
  smsRegister: () => {
    const statuses = ['Present', 'Present', 'Present', 'Absent', 'Late', null];
    const rows = STUDENTS.map((s, i) => ({
      StudentID: s.StudentID, FirstName: s.FirstName, LastName: s.LastName,
      ClassID: i % 3 + 1, ClassName: s.ClassName,
      AttendanceID: statuses[i] ? 900 + i : null, Status: statuses[i],
      ArrivalTime: statuses[i] === 'Late' ? '08:25' : null,
      Notes: statuses[i] === 'Absent' ? 'Parent called - flu' : null
    }));
    return {
      date: new Date().toISOString().slice(0, 10),
      rows,
      counts: { Present: 3, Absent: 1, Late: 1, Excused: 0, NotCaptured: 1, total: rows.length }
    };
  },
  smsRegisterClasses: () => ({ rows: [
    { ClassID: 1, ClassName: 'Busy Bees' }, { ClassID: 2, ClassName: 'Sunflowers' },
    { ClassID: 3, ClassName: 'Little Lions' }, { ClassID: 4, ClassName: 'Rainbow Room' }
  ] }),

  // /devforge dashboard
  devforgeKpis: () => ({
    ActiveSchools: 12, TotalSchools: 14, SuspendedSchools: 1,
    ActiveStudents: 780, ActiveUsers: 96,
    TotalOutstanding: 184500, CollectionsLast30Days: 1240000
  }),
  devforgeRecentSchools: () => ({ rows: [
    { SchoolID: 1, SchoolName: SUNSHINE_SCHOOL,             ContactEmail: 'admin@devforgesolutions.com', SubscriptionPlan: 'Pro+',     SubscriptionStatus: 'Active',    ActiveUserCount: 8,  ActiveStudentCount: 64 },
    { SchoolID: 2, SchoolName: 'Little Acorns Day Care',    ContactEmail: 'info@littleacorns.example',  SubscriptionPlan: 'Standard', SubscriptionStatus: 'Active',    ActiveUserCount: 5,  ActiveStudentCount: 41 },
    { SchoolID: 3, SchoolName: 'Rainbow Bridge Nursery',    ContactEmail: 'hello@rainbowbridge.example',SubscriptionPlan: 'Pro',      SubscriptionStatus: 'Active',    ActiveUserCount: 11, ActiveStudentCount: 88 },
    { SchoolID: 4, SchoolName: 'Tiny Tots Education Centre',ContactEmail: 'admin@tinytots.example',     SubscriptionPlan: 'Standard', SubscriptionStatus: 'Suspended', ActiveUserCount: 3,  ActiveStudentCount: 0 },
    { SchoolID: 5, SchoolName: 'Protea Pre-Primary',        ContactEmail: 'office@protea.example',      SubscriptionPlan: 'Pro+',     SubscriptionStatus: 'Active',    ActiveUserCount: 9,  ActiveStudentCount: 72 }
  ] }),

  // /parent dashboard + invoices
  parentChildren: () => ([
    { StudentID: 2, FirstName: 'Anika', LastName: 'Naidoo', ClassName: 'Busy Bees',  Grade: 'RR', SchoolName: SUNSHINE_SCHOOL, OutstandingAmount: 1850, PresentLastWeek: 5, PrimaryParentEmail: 'sunshine.naidoo@devforgesolutions.com' },
    { StudentID: 7, FirstName: 'Dhiren',LastName: 'Naidoo', ClassName: 'Acorn Class', Grade: 'R',  SchoolName: 'Little Acorns Day Care',   OutstandingAmount: 0,    PresentLastWeek: 4 }
  ]),
  parentSummary: () => ({ totalOwed: 1850, totalPaid: 16650, outstandingCount: 1, overdueCount: 0, overdueAmount: 0, invoiceCount: 10 }),
  parentMessages: () => ([
    { MessageID: 1, Subject: 'Sports day this Friday',        Body: 'Dear parents, please remember sports day starts at 09:00. Learners should wear their house colours.', SentAt: daysAgo(1), IsRead: 0, SchoolName: SUNSHINE_SCHOOL, StudentName: 'Anika Naidoo' },
    { MessageID: 2, Subject: 'June invoice ready',            Body: 'Your invoice for June is ready in the parent portal. Thank you for your continued support.',           SentAt: daysAgo(3), IsRead: 1, SchoolName: SUNSHINE_SCHOOL, StudentName: 'Anika Naidoo' },
    { MessageID: 3, Subject: 'Winter concert save-the-date',  Body: 'Our winter concert will be held on 26 June. More details to follow next week.',                        SentAt: daysAgo(6), IsRead: 1, SchoolName: 'Little Acorns Day Care',   StudentName: 'Dhiren Naidoo' }
  ]),
  parentInvoices: () => INVOICES.filter(i => [2, 7].includes(i.StudentID) || i.StudentID === 2)
};

module.exports = { demoOr, enabled };
