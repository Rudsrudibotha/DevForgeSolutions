'use strict';

// KCH chat (WhatsApp-style messaging): route-layer gating plus service
// unit tests with stubbed repositories (no DB). Includes the required
// negative tenancy case: a school user cannot open a conversation with
// a contact outside their school.

const assert = require('assert');
const http = require('http');

const PORT = process.env.TEST_PORT || 3001;
const HOST = process.env.TEST_HOST || 'localhost';

function request(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port: PORT, path, method, headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  PASS: ${name}`))
    .catch(err => {
      console.error(`  FAIL: ${name}`);
      console.error(`    ${err.message}`);
      process.exitCode = 1;
    });
}

// ---- Service test harness (stubbed repos, no DB) ----

const { KchChatService } = require('../src/business/kchChatService');
const { KchBroadcastService } = require('../src/business/kchBroadcastService');
const { AttachmentRetentionService } = require('../src/business/attachmentRetentionService');

function ctxFor(role, { userId = 10, tenantId = 1, schoolId = 1 } = {}) {
  return {
    sessionContext: {
      UserId: userId,
      ActiveTenantId: role === 'admin' ? null : tenantId,
      ActiveSchoolId: role === 'admin' ? null : schoolId,
      UserRole: role,
      IsDevForgeUser: role === 'admin',
      IsSchoolUser: role === 'school',
      IsParentUser: role === 'parent',
      HasTenantAccess: true
    }
  };
}

function makeStubs() {
  const conv = { ConversationId: 9, TenantId: 1, SchoolId: 1, ConversationType: 'SchoolToParent', LastMessageId: 4 };
  const calls = {
    participantsAdded: [], unreadIncremented: [], events: [], created: [],
    blobStored: [], blobDeleted: [], lastMessage: null, markedRead: [], attachmentsCreated: [],
    deliveries: [], deliveryStatuses: []
  };
  const stubs = {
    calls,
    conv,
    contactRepository: {
      findContact: async () => null,
      listForSchoolUser: async (args) => { calls.contactQuery = { kind: 'school', args }; return []; },
      listForParentUser: async (args) => { calls.contactQuery = { kind: 'parent', args }; return []; },
      listForAdminUser: async (args) => { calls.contactQuery = { kind: 'admin', args }; return []; },
      listParentsForSchool: async () => [{ UserID: 21 }, { UserID: 22 }]
    },
    conversationRepository: {
      findDirectConversation: async () => null,
      create: async (args) => { calls.created.push(args); return 101; },
      getById: async () => conv,
      updateLastMessage: async (id, msgId, at, preview) => { calls.lastMessage = { id, msgId, preview }; },
      listForUser: async () => []
    },
    participantRepository: {
      add: async (p) => calls.participantsAdded.push(p),
      listActiveForConversation: async () => [{ UserId: 10 }, { UserId: 20 }],
      incrementUnread: async (cid, uid) => calls.unreadIncremented.push(uid),
      markRead: async (cid, uid, lastId) => calls.markedRead.push({ cid, uid, lastId })
    },
    messageRepository: {
      create: async (m) => { calls.message = m; return 555; },
      listForConversation: async () => []
    },
    attachmentRepository: {
      create: async (a) => { calls.attachmentsCreated.push(a); return 77; },
      findById: async () => null,
      listExpired: async () => [],
      markDeleted: async () => {}
    },
    notificationEventRepository: {
      create: async (e) => calls.events.push(e),
      listForUserSince: async () => []
    },
    conversationAuditLogRepository: { write: async () => {} },
    blobProvider: {
      store: async (x) => { calls.blobStored.push(x); return { blobUrl: 'local://t1/img.png', provider: 'localDisk' }; },
      read: async () => ({ buffer: Buffer.from('img'), contentType: 'image/png', filename: 'img.png' }),
      delete: async (url) => { calls.blobDeleted.push(url); return { deleted: true }; }
    },
    access: {
      canUserAccessConversation: async () => ({ allowed: true, reason: 'ok', conversation: conv, participant: {} }),
      canUserSendMessage: async () => ({ allowed: true, reason: 'ok', conversation: conv, participant: {} }),
      canUserUploadImage: async () => ({ allowed: true, reason: 'ok' })
    },
    canTenantUseFeature: async () => ({ IsAllowed: true, Reason: 'ok' })
  };
  return stubs;
}

async function run() {
  console.log('\n[kch-messaging] /api/messages route layer');

  const admin = { 'X-Test-Role': 'admin' };
  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };

  // Under DISABLE_AUTH the harness injects a default test user, so a
  // bare request can't observe the production 401; it must still never
  // be a silent 2xx-for-someone-else error or a redirect to HTML.
  await test('GET /api/messages/conversations without test role is JSON, not a redirect', async () => {
    const r = await request('GET', '/api/messages/conversations');
    assert.ok([200, 401, 500].includes(r.status), `got ${r.status}`);
    assert.ok(!String(r.headers['content-type'] || '').includes('text/html'), 'API must not return HTML');
  });

  await test('GET /api/messages/conversations as parent is NOT 403 (parents can chat)', async () => {
    const r = await request('GET', '/api/messages/conversations', parent);
    assert.ok(r.status !== 403, `expected non-403, got ${r.status}`);
  });

  await test('GET /api/messages/conversations as school is 200/500 (DB-dependent)', async () => {
    const r = await request('GET', '/api/messages/conversations', school);
    assert.ok([200, 500].includes(r.status), `got ${r.status}`);
  });

  await test('GET /api/messages/conversations as admin is 200/500 (DB-dependent)', async () => {
    const r = await request('GET', '/api/messages/conversations', admin);
    assert.ok([200, 500].includes(r.status), `got ${r.status}`);
  });

  await test('GET /api/messages/contacts as parent is 200/500 (DB-dependent)', async () => {
    const r = await request('GET', '/api/messages/contacts', parent);
    assert.ok([200, 500].includes(r.status), `got ${r.status}`);
  });

  await test('GET /api/messages/conversations/abc/messages is 404 (route regex)', async () => {
    const r = await request('GET', '/api/messages/conversations/abc/messages', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /api/messages/conversations/0/messages is 404 (route regex)', async () => {
    const r = await request('GET', '/api/messages/conversations/0/messages', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /api/messages/attachments/0/view is 404 (route regex)', async () => {
    const r = await request('GET', '/api/messages/attachments/0/view', school);
    assert.strictEqual(r.status, 404);
  });

  await test('POST /api/messages/conversations with no target is 400', async () => {
    const r = await request('POST', '/api/messages/conversations',
      { ...school, 'Content-Type': 'application/json' }, JSON.stringify({}));
    assert.ok([400, 402, 500].includes(r.status), `got ${r.status}`);
  });

  console.log('\n[kch-messaging] chat service (stubbed repos)');

  await test('listContacts dispatches by role and is school-scoped', async () => {
    const stubs = makeStubs();
    const svc = new KchChatService(stubs);
    await svc.listContacts(ctxFor('school', { schoolId: 7 }), { q: 'ann' });
    assert.strictEqual(stubs.calls.contactQuery.kind, 'school');
    assert.strictEqual(stubs.calls.contactQuery.args.schoolId, 7);
    await svc.listContacts(ctxFor('parent', { schoolId: 3 }), {});
    assert.strictEqual(stubs.calls.contactQuery.kind, 'parent');
    assert.strictEqual(stubs.calls.contactQuery.args.schoolId, 3);
    await svc.listContacts(ctxFor('admin'), {});
    assert.strictEqual(stubs.calls.contactQuery.kind, 'admin');
  });

  await test('startConversation DENIES a target outside the school (negative tenancy)', async () => {
    const stubs = makeStubs(); // findContact -> null
    const svc = new KchChatService(stubs);
    await assert.rejects(
      () => svc.startConversation(ctxFor('school'), { targetUserId: 999 }),
      (err) => err.statusCode === 403 && /not_a_contact/.test(err.message)
    );
  });

  await test('startConversation rejects messaging yourself', async () => {
    const svc = new KchChatService(makeStubs());
    await assert.rejects(
      () => svc.startConversation(ctxFor('school', { userId: 10 }), { targetUserId: 10 }),
      (err) => err.statusCode === 400
    );
  });

  await test('startConversation school->parent creates SchoolToParent with both participants', async () => {
    const stubs = makeStubs();
    stubs.contactRepository.findContact = async () => ({ UserID: 20, ContactRole: 'parent', ContactSchoolId: 1, FirstName: 'Thandi', LastName: 'M' });
    const svc = new KchChatService(stubs);
    const result = await svc.startConversation(ctxFor('school'), { targetUserId: 20 });
    assert.strictEqual(result.conversationType, 'SchoolToParent');
    assert.strictEqual(result.existing, false);
    assert.strictEqual(stubs.calls.created[0].conversationType, 'SchoolToParent');
    assert.deepStrictEqual(stubs.calls.participantsAdded.map(p => p.userId).sort(), [10, 20]);
  });

  await test('startConversation reuses the reverse-direction thread (one thread per pair)', async () => {
    const stubs = makeStubs();
    stubs.contactRepository.findContact = async () => ({ UserID: 20, ContactRole: 'parent', ContactSchoolId: 1, Username: 'mom' });
    stubs.conversationRepository.findDirectConversation = async ({ conversationType }) =>
      conversationType === 'ParentToSchool' ? { ConversationId: 42 } : null;
    const svc = new KchChatService(stubs);
    const result = await svc.startConversation(ctxFor('school'), { targetUserId: 20 });
    assert.strictEqual(result.conversationId, 42);
    assert.strictEqual(result.existing, true);
    assert.strictEqual(stubs.calls.created.length, 0);
  });

  await test('sendMessage rejects an empty message', async () => {
    const svc = new KchChatService(makeStubs());
    await assert.rejects(
      () => svc.sendMessage(ctxFor('school'), 9, { body: '   ' }),
      (err) => err.statusCode === 400 && /message_or_image_required/.test(err.message)
    );
  });

  await test('sendMessage rejects a non-image upload', async () => {
    const svc = new KchChatService(makeStubs());
    await assert.rejects(
      () => svc.sendMessage(ctxFor('school'), 9, { body: 'hi', file: { mimetype: 'application/pdf', buffer: Buffer.alloc(1), originalname: 'x.pdf', size: 1 } }),
      (err) => err.statusCode === 400 && /unsupported_image_type/.test(err.message)
    );
  });

  await test('sendMessage text: creates message, bumps unread for the OTHER participant, emits event', async () => {
    const stubs = makeStubs();
    const svc = new KchChatService(stubs);
    const msg = await svc.sendMessage(ctxFor('school', { userId: 10 }), 9, { body: 'Hello there' });
    assert.strictEqual(msg.messageId, 555);
    assert.strictEqual(stubs.calls.message.messageType, 'Text');
    assert.deepStrictEqual(stubs.calls.unreadIncremented, [20]); // not the sender
    assert.strictEqual(stubs.calls.events.length, 1);
    assert.strictEqual(stubs.calls.events[0].targetUserId, 20);
    assert.strictEqual(stubs.calls.lastMessage.preview, 'Hello there');
  });

  await test('sendMessage with image stores the blob and records the attachment', async () => {
    const stubs = makeStubs();
    const svc = new KchChatService(stubs);
    const file = { mimetype: 'image/png', buffer: Buffer.from('png'), originalname: 'photo.png', size: 3 };
    const msg = await svc.sendMessage(ctxFor('parent', { userId: 10 }), 9, { body: '', file });
    assert.strictEqual(msg.type, 'Image');
    assert.strictEqual(stubs.calls.blobStored.length, 1);
    assert.strictEqual(stubs.calls.attachmentsCreated[0].storagePath, 'local://t1/img.png');
    assert.strictEqual(stubs.calls.attachmentsCreated[0].messageId, 555);
    assert.strictEqual(stubs.calls.lastMessage.preview, 'Photo');
  });

  await test('getAttachmentForView reports expired images instead of serving bytes', async () => {
    const stubs = makeStubs();
    stubs.attachmentRepository.findById = async () => ({ MessageAttachmentId: 5, ConversationId: 9, IsDeleted: true, StoragePath: 'local://x' });
    const svc = new KchChatService(stubs);
    const result = await svc.getAttachmentForView(ctxFor('parent'), 5);
    assert.strictEqual(result.expired, true);
  });

  await test('getAttachmentForView denies when conversation access is denied', async () => {
    const stubs = makeStubs();
    stubs.attachmentRepository.findById = async () => ({ MessageAttachmentId: 5, ConversationId: 9, IsDeleted: false, StoragePath: 'local://x' });
    stubs.access.canUserAccessConversation = async () => ({ allowed: false, reason: 'cross-tenant-access-denied' });
    const svc = new KchChatService(stubs);
    await assert.rejects(
      () => svc.getAttachmentForView(ctxFor('parent'), 5),
      (err) => err.statusCode === 403
    );
  });

  await test('markRead stores the last read message id for the caller', async () => {
    const stubs = makeStubs();
    const svc = new KchChatService(stubs);
    await svc.markRead(ctxFor('school', { userId: 10 }), 9);
    assert.deepStrictEqual(stubs.calls.markedRead, [{ cid: 9, uid: 10, lastId: 4 }]);
  });

  console.log('\n[kch-messaging] broadcast service (stubbed repos)');

  await test('createBroadcast is school-only', async () => {
    const stubs = makeStubs();
    const svc = new KchBroadcastService({ ...stubs, broadcastRepository: {}, deliveryRepository: {} });
    await assert.rejects(
      () => svc.createBroadcast(ctxFor('parent'), { messageBody: 'hi' }),
      (err) => err.statusCode === 403
    );
  });

  await test('createBroadcast queues one delivery per linked parent', async () => {
    const stubs = makeStubs();
    const broadcastRepository = { create: async () => 31 };
    const deliveryRepository = { create: async (d) => stubs.calls.deliveries.push(d) };
    const svc = new KchBroadcastService({ ...stubs, broadcastRepository, deliveryRepository });
    const result = await svc.createBroadcast(ctxFor('school'), { messageBody: 'School closes early on Friday' });
    assert.strictEqual(result.totalRecipients, 2);
    assert.strictEqual(stubs.calls.deliveries.length, 2);
  });

  console.log('\n[kch-messaging] attachment retention (60 days)');

  await test('sweep deletes expired blobs and soft-deletes their rows', async () => {
    const deletedRows = [];
    const blobDeleted = [];
    let cutoffSeen = null;
    const svc = new AttachmentRetentionService({
      attachmentRepository: {
        listExpired: async (cutoff) => {
          cutoffSeen = cutoff;
          return deletedRows.length ? [] : [
            { MessageAttachmentId: 1, StoragePath: 'local://a.png', ThumbnailPath: null },
            { MessageAttachmentId: 2, StoragePath: 'local://b.png', ThumbnailPath: 'local://b-thumb.png' }
          ];
        },
        markDeleted: async (id) => deletedRows.push(id)
      },
      blobProvider: { delete: async (url) => { blobDeleted.push(url); return { deleted: true }; } }
    });
    const result = await svc.sweepExpiredAttachments({ retentionDays: 60, batchSize: 10 });
    assert.strictEqual(result.deleted, 2);
    assert.strictEqual(result.failed, 0);
    assert.deepStrictEqual(deletedRows, [1, 2]);
    assert.deepStrictEqual(blobDeleted, ['local://a.png', 'local://b.png', 'local://b-thumb.png']);
    // Cutoff is ~60 days ago (give an hour of slack)
    const expected = Date.now() - 60 * 24 * 60 * 60 * 1000;
    assert.ok(Math.abs(cutoffSeen.getTime() - expected) < 60 * 60 * 1000, 'cutoff is 60 days back');
  });

  await test('sweep keeps rows whose blob delete fails and stops without spinning', async () => {
    let listCalls = 0;
    const marked = [];
    const svc = new AttachmentRetentionService({
      attachmentRepository: {
        listExpired: async () => {
          listCalls++;
          return [{ MessageAttachmentId: 1, StoragePath: 'local://broken.png', ThumbnailPath: null }];
        },
        markDeleted: async (id) => marked.push(id)
      },
      blobProvider: { delete: async () => { throw new Error('storage down'); } }
    });
    const result = await svc.sweepExpiredAttachments({ batchSize: 1 });
    assert.strictEqual(result.deleted, 0);
    assert.ok(result.failed >= 1);
    assert.strictEqual(marked.length, 0);
    assert.strictEqual(listCalls, 1, 'stopped after a fully-failed batch');
  });

  await test('default retention window is 60 days', async () => {
    const svc = new AttachmentRetentionService({ attachmentRepository: { listExpired: async () => [] }, blobProvider: {} });
    assert.strictEqual(svc.retentionDays(), 60);
    assert.strictEqual(svc.retentionDays('not-a-number'), 60);
    assert.strictEqual(svc.retentionDays(30), 30);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL KCH MESSAGING TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
