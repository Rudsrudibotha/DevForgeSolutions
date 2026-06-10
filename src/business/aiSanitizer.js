// Business Layer - SanitiseAITextForLog (Task 58). Removes or masks
// personal and financial details before writing to AIRequestLog. Full AI
// prompts are not stored by default; this is for short summaries.

const MASK = '[REDACTED]';

const PII_PATTERNS = [
  // South African ID numbers
  { re: /\b\d{13}\b/g, mask: '[SA_ID]' },
  // Bank account numbers
  { re: /\b\d{8,12}\b/g, mask: '[ACCT]' },
  // Email addresses
  { re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, mask: '[EMAIL]' },
  // Phone numbers (very rough)
  { re: /\+?\d[\d\s().-]{7,}\d/g, mask: '[PHONE]' }
];

function sanitize(text) {
  if (!text) return '';
  let out = String(text);
  for (const { re, mask } of PII_PATTERNS) out = out.replace(re, mask);
  return out.trim().slice(0, 500);
}

// SanitizeAITextForLog
function SanitizeAITextForLog(text) {
  if (!text) return null;
  if (typeof text !== 'string') return null;
  return sanitize(text);
}

// Compose a sanitised summary for a reconciliation suggestion
function summarizeReconciliation({ transactionId, suggestedFamilyId, suggestedInvoiceId, confidenceScore, requiresManualReview }) {
  return [
    'BankTxId=' + (transactionId || '?'),
    'SuggestedFamilyId=' + (suggestedFamilyId || '?'),
    'SuggestedInvoiceId=' + (suggestedInvoiceId || '?'),
    'ConfidenceScore=' + (confidenceScore || 0),
    'RequiresManualReview=' + (requiresManualReview ? 'true' : 'false')
  ].join(';');
}

module.exports = { SanitizeAITextForLog, summarizeReconciliation };
