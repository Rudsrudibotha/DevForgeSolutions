// Business Layer - ValidateAIResponseSafety (Task 56). The AI is a text
// generator, not the security authority. Check the AI response before
// showing it to the user. Block responses that claim to have changed
// data, leak cross-tenant info, expose system instructions, or contain
// raw API keys.

const FORBIDDEN_PATTERNS = [
  /api[_-]?key\s*[:=]/i,
  /bearer\s+[A-Za-z0-9._-]{20,}/i,
  /system[_-]?instruction/i,
  /select\s+\*\s+from\s+sys\./i,
  /(inserted|updated|deleted)\s+\d+\s+rows?/i,
  /(successfully|done|completed)\s+(created|updated|deleted|approved|reconciled|invoiced|allocated|paid)/i
];

function collectCandidateStrings(parsed) {
  const out = [];
  if (!parsed) return out;
  if (typeof parsed === 'string') out.push(parsed);
  for (const k of Object.keys(parsed)) {
    const v = parsed[k];
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'number') out.push(String(v));
    else if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') out.push(item);
        else if (typeof item === 'object' && item !== null) {
          for (const k2 of Object.keys(item)) {
            const v2 = item[k2];
            if (typeof v2 === 'string') out.push(v2);
          }
        }
      }
    }
  }
  return out;
}

function ValidateAIResponseSafety({ parsed, session, context }) {
  if (!parsed) return { safe: false, reason: 'empty' };
  const candidates = collectCandidateStrings(parsed);
  for (const c of candidates) {
    for (const re of FORBIDDEN_PATTERNS) {
      if (re.test(c)) return { safe: false, reason: 'forbidden-pattern:' + re.source };
    }
  }

  // Cross-tenant leak detection: if the AI references a FamilyId,
  // InvoiceId, etc. that is not in the allowed context, block.
  if (context && context.possibleMatches && Array.isArray(context.possibleMatches)) {
    const allowedIds = new Set();
    for (const m of context.possibleMatches) {
      if (m.familyId) allowedIds.add(Number(m.familyId));
      if (m.invoiceId) allowedIds.add(Number(m.invoiceId));
    }
    if (parsed.suggestedFamilyId != null && !allowedIds.has(Number(parsed.suggestedFamilyId))) {
      return { safe: false, reason: 'suggested-family-id-not-in-context' };
    }
    if (parsed.suggestedInvoiceId != null && !allowedIds.has(Number(parsed.suggestedInvoiceId))) {
      return { safe: false, reason: 'suggested-invoice-id-not-in-context' };
    }
  }

  // Tenant leak detection for chat answers: if the session is not DevForge
  // and the answer mentions another tenantId/SchoolId we did not pass in,
  // we treat the answer as suspicious.
  if (session && !session.IsDevForgeUser) {
    const ownTenant = String(session.ActiveTenantId);
    const ownSchool = String(session.ActiveSchoolId);
    for (const c of candidates) {
      if (!c) continue;
      // Look for any 3+ digit number that could be another tenant id. Heuristic.
      const matches = c.match(/\b\d{3,}\b/g);
      if (!matches) continue;
      for (const m of matches) {
        if (m === ownTenant || m === ownSchool) continue;
        // Allow common benign numbers. Treat anything else as potential leak.
        if (m === '000' || m === '123' || m === '999') continue;
        // Don't block everything; only block if it looks like a tenant or school id.
        // Conservative: only block if the number is between 1 and 5 digits AND the
        // answer is otherwise non-numeric. This is a heuristic.
        if (m.length <= 5 && /\b(tenant|school)\b/i.test(c)) {
          return { safe: false, reason: 'possible-cross-tenant-leak' };
        }
      }
    }
  }

  return { safe: true, reason: 'ok' };
}

module.exports = { ValidateAIResponseSafety };
