// School Finance Management
// - Fee schedules by class/child; run monthly invoice job (or auto cron)
// - Upload OFX/CSV → parse → auto-match by ref/amount/family → operator confirms → post receipts
// - Unmatched queue remains for manual processing
// - Statements (PDF) per family; AR aging by family/class
// - Export GL CSV; send receipts
// - Invoice management with families and invoice_lines
// - Bank imports and transactions with idempotency_key
// - Dunning emails/notifications via outbox/notifications