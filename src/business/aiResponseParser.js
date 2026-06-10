// Business Layer - ParseGemmaChatResponse (Task 55). Extracts the
// assistant's answer text from the Hostinger response. If the response
// body does not match the expected contract, returns a safe fallback.

const SAFE_FALLBACK = 'The AI assistant could not return a valid response. Please try again or continue manually.';

function pickFirst(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k];
  }
  return null;
}

function ParseGemmaChatResponse(response) {
  if (!response || typeof response !== 'object') {
    return { answer: SAFE_FALLBACK, citations: [], parsed: false };
  }

  // Try common response shapes. Hostinger's wrapper may use any of these.
  const answer = pickFirst(response, ['answer', 'message', 'content', 'text', 'response', 'output', 'result']);

  // For reconciliation responses the answer may be JSON-encoded in a string
  // like: { "answer": "...", "suggestedFamilyId": "...", ... }
  if (typeof answer === 'string') {
    const trimmed = answer.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const inner = JSON.parse(trimmed);
        return {
          answer: pickFirst(inner, ['answer', 'reason', 'message', 'content']) || SAFE_FALLBACK,
          suggestedFamilyId: inner.suggestedFamilyId || null,
          suggestedInvoiceId: inner.suggestedInvoiceId || null,
          suggestedPayerName: inner.suggestedPayerName || null,
          confidence: inner.confidence || null,
          confidenceScore: typeof inner.confidenceScore === 'number' ? inner.confidenceScore : null,
          reason: inner.reason || null,
          alternativeMatches: Array.isArray(inner.alternativeMatches) ? inner.alternativeMatches : [],
          requiresManualReview: !!inner.requiresManualReview,
          citations: Array.isArray(inner.citations) ? inner.citations : [],
          parsed: true
        };
      } catch (_) { /* fall through */ }
    }
    return { answer: answer || SAFE_FALLBACK, citations: [], parsed: true };
  }

  // Sometimes the response is already an object with structured fields.
  if (typeof answer === 'object' && answer !== null) {
    return {
      answer: pickFirst(answer, ['answer', 'reason', 'message', 'content']) || SAFE_FALLBACK,
      suggestedFamilyId: answer.suggestedFamilyId || null,
      suggestedInvoiceId: answer.suggestedInvoiceId || null,
      suggestedPayerName: answer.suggestedPayerName || null,
      confidence: answer.confidence || null,
      confidenceScore: typeof answer.confidenceScore === 'number' ? answer.confidenceScore : null,
      reason: answer.reason || null,
      alternativeMatches: Array.isArray(answer.alternativeMatches) ? answer.alternativeMatches : [],
      requiresManualReview: !!answer.requiresManualReview,
      citations: Array.isArray(answer.citations) ? answer.citations : [],
      parsed: true
    };
  }

  return { answer: SAFE_FALLBACK, citations: [], parsed: false };
}

module.exports = { ParseGemmaChatResponse, SAFE_FALLBACK };
