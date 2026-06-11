// Kinder Care Hub chat client (KCH module shared by all 3 dashboards).
// WhatsApp-style: pick a contact, chat in one thread per pair, images
// inline (kept 60 days). Talks only to /api/messages/*; never trusts
// client-supplied tenant / school / sender values.

(function () {
  'use strict';

  const csrf = () => (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

  const api = (path, options) => fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf()
    },
    ...options
  }).then(async (res) => {
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error((body && body.error) || ('HTTP ' + res.status));
    return body;
  });

  const state = {
    conversations: [],
    contacts: [],
    currentConversationId: null,
    filter: '',
    lastEventId: 0,
    pollTimer: null,
    pendingFile: null,
    startingContactUserId: null
  };

  const $ = (id) => document.getElementById(id);
  const me = () => Number(window.kchCurrentUserId || 0);

  function toast(message, type) {
    if (window.kch && window.kch.toast) window.kch.toast.show(message, type || 'info');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(s => s.charAt(0).toUpperCase()).join('') || '?';
  }

  function timeLabel(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  function dayLabel(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function roleLabel(role) {
    if (role === 'parent') return 'Parent';
    if (role === 'school') return 'School staff';
    if (role === 'admin') return 'DevForge support';
    return role || '';
  }

  // ---- Chat list ----

  function visibleConversations() {
    const f = state.filter.trim().toLowerCase();
    if (!f) return state.conversations;
    return state.conversations.filter(c =>
      String(c.name || '').toLowerCase().includes(f) ||
      String(c.lastMessagePreview || '').toLowerCase().includes(f));
  }

  function renderConversations() {
    const list = $('kchConversationList');
    const empty = $('kchConversationEmpty');
    if (!list) return;
    const rows = visibleConversations();
    if (!rows.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = rows.map(c => `
      <li class="p-3 cursor-pointer hover:bg-slate-50 ${state.currentConversationId === c.conversationId ? 'bg-brand-50' : ''}"
          data-cid="${c.conversationId}" role="option" aria-selected="${state.currentConversationId === c.conversationId}">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 shrink-0 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold" aria-hidden="true">${escapeHtml(initials(c.name))}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-sm font-medium truncate">${escapeHtml(c.name)}</p>
              <p class="text-[11px] text-muted shrink-0">${escapeHtml(timeLabel(c.lastMessageAt))}</p>
            </div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-muted truncate">${escapeHtml(c.lastMessagePreview || roleLabel(c.otherRole))}</p>
              ${c.unreadCount > 0 ? `<span class="badge-brand shrink-0">${c.unreadCount}</span>` : ''}
            </div>
          </div>
        </div>
      </li>
    `).join('');
    Array.from(list.querySelectorAll('li')).forEach(li => {
      li.addEventListener('click', () => openConversation(Number(li.getAttribute('data-cid'))));
    });
  }

  async function loadConversations() {
    try {
      const data = await api('/api/messages/conversations');
      state.conversations = data.items || [];
      renderConversations();
      const totalUnread = state.conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
      const topPill = document.getElementById('kchTopUnread');
      if (topPill) {
        if (totalUnread > 0) {
          topPill.textContent = String(totalUnread);
          topPill.classList.remove('hidden');
        } else {
          topPill.classList.add('hidden');
        }
      }
    } catch (err) {
      console.warn('[kch] loadConversations failed', err.message);
    }
  }

  // ---- Open conversation + history ----

  async function openConversation(conversationId, fallbackConversation) {
    state.currentConversationId = conversationId;
    const conv = state.conversations.find(c => c.conversationId === conversationId) || fallbackConversation;
    if (conv) {
      $('kchConvTitle').textContent = conv.name;
      $('kchConvSubtitle').textContent = roleLabel(conv.otherRole);
      const typeEl = $('kchConvType');
      if (typeEl) typeEl.textContent = conv.isBroadcast ? 'Broadcast' : '';
      const avatar = $('kchConvAvatar');
      if (avatar) {
        avatar.textContent = initials(conv.name);
        avatar.classList.remove('hidden');
      }
    }
    renderConversations();
    await loadMessages();
    try { await api('/api/messages/conversations/' + conversationId + '/read', { method: 'POST' }); } catch (_) {}
    if (conv) conv.unreadCount = 0;
    renderConversations();
    const input = $('kchMessageInput');
    if (input) input.focus();
  }

  async function loadMessages() {
    if (!state.currentConversationId) return;
    try {
      const data = await api('/api/messages/conversations/' + state.currentConversationId + '/messages?pageSize=50');
      renderMessages(data.items || []);
    } catch (err) {
      console.warn('[kch] loadMessages failed', err.message);
    }
  }

  function attachmentHtml(m) {
    if (!m.attachment) return '';
    if (m.attachment.expired) {
      return `<div class="flex items-center gap-2 text-xs text-muted italic border rounded-lg px-3 py-2 bg-white/60 mb-1">
        <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        Image no longer available (kept for 60 days)
      </div>`;
    }
    const src = '/api/messages/attachments/' + m.attachment.attachmentId + '/view';
    return `<a href="${src}" target="_blank" rel="noopener" class="block mb-1">
      <img src="${src}" alt="${escapeHtml(m.attachment.fileName || 'Image')}" loading="lazy"
           class="rounded-lg max-h-64 max-w-full object-cover" />
    </a>`;
  }

  function renderMessages(items) {
    const list = $('kchMessageList');
    if (!list) return;
    let lastDay = '';
    const html = [];
    for (const m of items) {
      const day = m.createdAt ? new Date(m.createdAt).toDateString() : '';
      if (day && day !== lastDay) {
        lastDay = day;
        html.push(`<div class="flex justify-center my-2"><span class="text-[11px] text-muted bg-white border rounded-full px-3 py-0.5">${escapeHtml(dayLabel(m.createdAt))}</span></div>`);
      }
      const isMe = m.senderUserId === me();
      const ts = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const body = m.body ? `<p class="text-sm whitespace-pre-wrap break-words">${escapeHtml(m.body)}</p>` : '';
      const sender = !isMe && m.senderName ? `<p class="text-[11px] font-semibold text-brand-700 mb-0.5">${escapeHtml(m.senderName)}</p>` : '';
      html.push(`<div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
        <div class="${isMe ? 'bg-brand-100' : 'bg-white border'} rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} px-3 py-2 max-w-[80%] shadow-sm">
          ${sender}
          ${attachmentHtml(m)}
          ${body}
          <p class="text-[10px] text-muted text-right mt-0.5">${escapeHtml(ts)}</p>
        </div>
      </div>`);
    }
    list.innerHTML = html.join('');
    list.scrollTop = list.scrollHeight;
  }

  // ---- Composer (text + optional image in one send) ----

  function clearPendingFile() {
    state.pendingFile = null;
    const preview = $('kchAttachmentPreview');
    if (preview) preview.classList.add('hidden');
    const thumb = $('kchAttachmentThumb');
    if (thumb && thumb.src) {
      URL.revokeObjectURL(thumb.src);
      thumb.src = '';
    }
  }

  const sendForm = $('kchMessageForm');
  if (sendForm) {
    sendForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.currentConversationId) {
        toast('Pick a chat first', 'info');
        return;
      }
      const input = $('kchMessageInput');
      const body = String(input.value || '').trim();
      if (!body && !state.pendingFile) return;
      const btn = $('kchSendBtn');
      btn.disabled = true;
      try {
        const fd = new FormData();
        fd.append('body', body);
        if (state.pendingFile) fd.append('image', state.pendingFile);
        const res = await fetch('/api/messages/conversations/' + state.currentConversationId + '/messages', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin',
          headers: { 'X-CSRF-Token': csrf() }
        });
        const data = await res.json();
        if (!res.ok) throw new Error((data && data.error) || 'Send failed');
        input.value = '';
        clearPendingFile();
        await loadMessages();
        await loadConversations();
      } catch (err) {
        toast('Send failed: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  const fileInput = $('kchImageFile');
  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast('Image must be 10 MB or smaller', 'error');
        fileInput.value = '';
        return;
      }
      state.pendingFile = file;
      const thumb = $('kchAttachmentThumb');
      if (thumb) thumb.src = URL.createObjectURL(file);
      $('kchAttachmentName').textContent = file.name;
      $('kchAttachmentPreview').classList.remove('hidden');
      fileInput.value = '';
    });
  }

  const removeAttachment = $('kchRemoveAttachment');
  if (removeAttachment) removeAttachment.addEventListener('click', clearPendingFile);

  const searchInput = $('kchSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.filter = searchInput.value || '';
      renderConversations();
    });
  }

  // ---- New chat: contact picker ----

  const newConvBtn = $('kchNewConversation');
  const newConvModal = $('kchNewConvModal');
  const newConvCancel = $('kchNewConvCancel');
  const contactSearch = $('kchContactSearch');
  let contactSearchTimer = null;

  function renderContacts() {
    const list = $('kchContactList');
    const empty = $('kchContactEmpty');
    if (!list) return;
    if (!state.contacts.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    let lastGroup = '';
    const html = [];
    for (const c of state.contacts) {
      const group = roleLabel(c.role);
      if (group !== lastGroup) {
        lastGroup = group;
        html.push(`<li class="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted bg-slate-50">${escapeHtml(group)}</li>`);
      }
      const userId = Number(c.userId);
      const isStarting = state.startingContactUserId === userId;
      html.push(`<li role="option" aria-selected="${isStarting ? 'true' : 'false'}">
        <button type="button"
                class="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 ${isStarting ? 'bg-brand-50' : ''}"
                data-kch-contact
                data-uid="${userId || ''}"
                data-school-id="${c.schoolId || ''}"
                ${isStarting ? 'aria-busy="true" disabled' : ''}>
          <div class="h-9 w-9 shrink-0 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold" aria-hidden="true">${escapeHtml(initials(c.name))}</div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">${escapeHtml(c.name)}</p>
            ${c.schoolName ? `<p class="text-xs text-muted truncate">${escapeHtml(c.schoolName)}</p>` : ''}
          </div>
          ${isStarting ? '<span class="text-xs text-muted shrink-0">Opening...</span>' : ''}
        </button>
      </li>`);
    }
    list.innerHTML = html.join('');
  }

  async function loadContacts(q) {
    try {
      const data = await api('/api/messages/contacts' + (q ? ('?q=' + encodeURIComponent(q)) : ''));
      state.contacts = data.items || [];
      renderContacts();
    } catch (err) {
      toast('Could not load contacts: ' + err.message, 'error');
    }
  }

  async function startChatWith(userId, schoolId) {
    if (!Number.isInteger(userId) || userId <= 0 || state.startingContactUserId) return;
    state.startingContactUserId = userId;
    renderContacts();
    try {
      const data = await api('/api/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId, targetSchoolId: schoolId })
      });
      newConvModal.classList.add('hidden');
      await loadConversations();
      const created = data.conversation || {};
      const conversationId = Number(created.conversationId || 0);
      const fallbackConversation = {
        conversationId,
        name: created.otherName || 'New chat',
        otherUserId: created.otherUserId || userId,
        otherRole: created.otherRole || null,
        conversationType: created.conversationType || null,
        isBroadcast: false,
        lastMessageAt: null,
        lastMessagePreview: '',
        unreadCount: 0
      };
      if (conversationId && !state.conversations.some(c => c.conversationId === conversationId)) {
        state.conversations.unshift(fallbackConversation);
        renderConversations();
      }
      await openConversation(conversationId, fallbackConversation);
    } catch (err) {
      toast('Could not start chat: ' + err.message, 'error');
    } finally {
      state.startingContactUserId = null;
      renderContacts();
    }
  }

  if (newConvBtn) {
    newConvBtn.addEventListener('click', () => {
      newConvModal.classList.remove('hidden');
      if (contactSearch) {
        contactSearch.value = '';
        contactSearch.focus();
      }
      loadContacts('');
    });
  }
  if (newConvCancel) newConvCancel.addEventListener('click', () => newConvModal.classList.add('hidden'));
  if (newConvModal) {
    newConvModal.addEventListener('click', (e) => { if (e.target === newConvModal) newConvModal.classList.add('hidden'); });
  }
  const contactList = $('kchContactList');
  if (contactList) {
    contactList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-kch-contact]');
      if (!button || !contactList.contains(button)) return;
      startChatWith(Number(button.getAttribute('data-uid')), Number(button.getAttribute('data-school-id')) || null);
    });
  }
  if (contactSearch) {
    contactSearch.addEventListener('input', () => {
      clearTimeout(contactSearchTimer);
      contactSearchTimer = setTimeout(() => loadContacts(contactSearch.value), 250);
    });
  }

  // ---- Broadcast to all parents (school portal only) ----

  const broadcastBtn = $('kchBroadcastBtn');
  const broadcastModal = $('kchBroadcastModal');
  const broadcastCancel = $('kchBroadcastCancel');
  const broadcastForm = $('kchBroadcastForm');
  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', () => {
      newConvModal.classList.add('hidden');
      broadcastModal.classList.remove('hidden');
      $('kchBroadcastBody').focus();
    });
  }
  if (broadcastCancel) broadcastCancel.addEventListener('click', () => broadcastModal.classList.add('hidden'));
  if (broadcastForm) {
    broadcastForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = String($('kchBroadcastBody').value || '').trim();
      if (!body) return;
      try {
        const created = await api('/api/messages/broadcasts', {
          method: 'POST',
          body: JSON.stringify({ messageBody: body })
        });
        const id = created.broadcast.broadcastAnnouncementId;
        // Deliver in batches until done (server caps each batch).
        let remaining = created.broadcast.totalRecipients;
        for (let i = 0; i < 50 && remaining > 0; i++) {
          const r = await api('/api/messages/broadcasts/' + id + '/process', { method: 'POST' });
          remaining = r.remaining;
          if (!r.processed) break;
        }
        broadcastModal.classList.add('hidden');
        broadcastForm.reset();
        toast('Broadcast sent to all parents.', 'success');
        await loadConversations();
      } catch (err) {
        toast('Broadcast failed: ' + err.message, 'error');
      }
    });
  }

  // ---- AI assistant (DevForge + School only) ----

  const aiForm = $('kchAiForm');
  if (aiForm) {
    aiForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = $('kchAiInput');
      const question = String(input.value || '').trim();
      if (!question) return;
      appendAi('You', question);
      input.value = '';
      try {
        const data = await api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ question }) });
        appendAi('AI', (data && data.answer) || 'No response');
      } catch (err) {
        appendAi('AI', 'Error: ' + err.message);
      }
    });
  }
  function appendAi(sender, text) {
    const log = $('kchAiLog');
    if (!log) return;
    const el = document.createElement('div');
    el.className = 'rounded p-2 ' + (sender === 'You' ? 'bg-brand-50' : 'bg-slate-50');
    el.innerHTML = `<p class="text-[11px] text-muted">${escapeHtml(sender)}</p><p>${escapeHtml(text)}</p>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  // ---- Fault report ----

  const faultBtn = $('kchFaultBtn');
  const faultModal = $('kchFaultModal');
  const faultCancel = $('kchFaultCancel');
  const faultForm = $('kchFaultForm');
  if (faultBtn) faultBtn.addEventListener('click', () => faultModal && faultModal.classList.remove('hidden'));
  if (faultCancel) faultCancel.addEventListener('click', () => faultModal && faultModal.classList.add('hidden'));
  if (faultForm) {
    faultForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const description = String($('kchFaultDescription').value || '').trim();
      const screenName = String($('kchFaultScreen').value || '').trim();
      const priority = $('kchFaultPriority').value;
      try {
        await api('/api/ai/fault-report', { method: 'POST', body: JSON.stringify({ description, screenName, priority }) });
        faultModal.classList.add('hidden');
        toast('Fault submitted. Thank you.', 'success');
        faultForm.reset();
      } catch (err) {
        toast('Submit failed: ' + err.message, 'error');
      }
    });
  }

  // ---- Polling for new-message events ----

  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = setInterval(async () => {
      try {
        const data = await api('/api/messages/poll?sinceEventId=' + state.lastEventId);
        const items = (data && data.items) || [];
        if (!items.length) return;
        state.lastEventId = items[items.length - 1].eventId;
        await loadConversations();
        if (items.some(e => e.conversationId === state.currentConversationId)) {
          await loadMessages();
          try { await api('/api/messages/conversations/' + state.currentConversationId + '/read', { method: 'POST' }); } catch (_) {}
        }
      } catch (_) { /* ignore */ }
    }, 10000);
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
    startPolling();
  });
})();
