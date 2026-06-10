// Business Layer - CallHostingerGemmaAI (Task 52). The only AI provider
// supported. The API key is server-side only. Timeouts and safe failures
// are enforced.

const https = require('https');
const { URL } = require('url');

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_SECONDS || 60) * 1000;

function CallHostingerGemmaAI({ model, systemInstruction, message, context, temperature = 0.2, maxTokens = 1200 }) {
  return new Promise((resolve, reject) => {
    const baseUrl = process.env.AI_BASE_URL;
    const endpoint = process.env.AI_CHAT_ENDPOINT || '/api/chat';
    const apiKey = process.env.AI_API_KEY;
    if (!baseUrl) return reject(new Error('AI_BASE_URL not configured'));
    if (!apiKey) return reject(new Error('AI_API_KEY not configured'));
    if (!message) return reject(new Error('message is required'));

    let url;
    try { url = new URL(endpoint, baseUrl); }
    catch (err) { return reject(new Error('Invalid AI_BASE_URL/AI_CHAT_ENDPOINT: ' + err.message)); }

    const body = JSON.stringify({
      model: model || 'gemma-3',
      message,
      systemInstruction,
      context: context || {},
      temperature,
      maxTokens
    });

    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + (url.search || ''),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: DEFAULT_TIMEOUT_MS
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('AI provider returned ' + res.statusCode));
        }
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error('AI provider returned non-JSON response'));
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('AI request timed out')); });
    req.on('error', err => reject(err));
    req.write(body);
    req.end();
  });
}

// Test the connection (Task 49). Used by DevForge admin and ops.
async function TestHostingerGemmaConnection() {
  const start = Date.now();
  try {
    const resp = await CallHostingerGemmaAI({
      model: process.env.AI_MODEL || 'gemma-3',
      systemInstruction: 'You are a test assistant. Reply briefly.',
      message: 'Reply with the word OK.',
      context: {},
      temperature: 0,
      maxTokens: 16
    });
    return {
      ok: true,
      elapsedMs: Date.now() - start,
      responseShape: Object.keys(resp || {}),
      hasAnswerField: !!(resp && (resp.answer || resp.message || resp.content || resp.text))
    };
  } catch (err) {
    return {
      ok: false,
      elapsedMs: Date.now() - start,
      error: err.message
    };
  }
}

module.exports = { CallHostingerGemmaAI, TestHostingerGemmaConnection };
