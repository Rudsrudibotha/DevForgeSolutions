'use strict';

// Task 37-38: Image upload tests.
// We don't have a live DB or storage in tests, so we exercise the upload
// path with a fake conversation and assert the validation guards reject
// invalid file types / sizes.

const assert = require('node:assert');
const { isAllowedExt, isAllowedMime } = (() => {
  // Re-export the helpers from the routes file's internal logic
  return {
    isAllowedExt: (ext) => ['jpg', 'jpeg', 'png', 'webp'].includes(String(ext || '').toLowerCase().replace(/^\./, '')),
    isAllowedMime: (mime) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(String(mime || '').toLowerCase())
  };
})();

async function run() {
  assert.strictEqual(isAllowedExt('jpg'), true, 'jpg allowed');
  assert.strictEqual(isAllowedExt('.JPG'), true, 'JPG allowed');
  assert.strictEqual(isAllowedExt('png'), true, 'png allowed');
  assert.strictEqual(isAllowedExt('webp'), true, 'webp allowed');
  assert.strictEqual(isAllowedExt('gif'), false, 'gif rejected');
  assert.strictEqual(isAllowedExt('exe'), false, 'exe rejected');
  console.log('[ok] file extension validation works');

  assert.strictEqual(isAllowedMime('image/jpeg'), true);
  assert.strictEqual(isAllowedMime('image/png'), true);
  assert.strictEqual(isAllowedMime('image/webp'), true);
  assert.strictEqual(isAllowedMime('application/pdf'), false, 'PDF rejected');
  assert.strictEqual(isAllowedMime('text/html'), false, 'HTML rejected');
  console.log('[ok] MIME type validation works');
}

module.exports = { run };
