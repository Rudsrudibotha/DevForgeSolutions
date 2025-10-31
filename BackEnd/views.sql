-- Attendance rate by month
CREATE OR REPLACE VIEW vw_attendance_month AS
SELECT s.school_id, date_trunc('month', a.date)::date AS month,
       count(*) FILTER (WHERE a.check_in IS NOT NULL) AS present_days,
       count(*) AS total_days,
       round(100.0 * count(*) FILTER (WHERE a.check_in IS NOT NULL) / NULLIF(count(*),0), 2) AS attendance_pct
FROM student_attendance a
JOIN students s ON s.id=a.student_id
GROUP BY 1,2;

-- AR aging (30/60/90)
CREATE OR REPLACE VIEW vw_ar_aging AS
SELECT i.school_id, i.student_id,
  sum(i.balance_cents) AS total_due,
  sum(i.balance_cents) FILTER (WHERE i.due_date >= current_date - 30) AS bucket_0_30,
  sum(i.balance_cents) FILTER (WHERE i.due_date < current_date - 30 AND i.due_date >= current_date - 60) AS bucket_31_60,
  sum(i.balance_cents) FILTER (WHERE i.due_date < current_date - 60 AND i.due_date >= current_date - 90) AS bucket_61_90,
  sum(i.balance_cents) FILTER (WHERE i.due_date < current_date - 90) AS bucket_90_plus
FROM invoices i
WHERE i.status IN ('open','partial')
GROUP BY 1,2;