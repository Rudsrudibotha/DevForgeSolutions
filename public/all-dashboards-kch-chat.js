// Kinder Care Hub chat client (KCH module shared by all 3 dashboards).
// Communicates only with /api/messages/* endpoints. Never trusts client-supplied
// tenant / school / sender values.

(function () {
  'use strict';

  const api = (path, options) => fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': (document.querySelector('meta[name="csrf-token"]') || {}).content || ''
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
    currentConversationId: null,
    pollTimer: null,
    sse: null
  };

  const $ = (id) => document.getElementById(id);

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

  function renderConversations() {
    const list = $('kchConversationList');
    const empty = $('kchConversationEmpty');
    if (!list) return;
    if (!state.conversations.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = state.conversations.map(c => `
      <li class="p-3 cursor-pointer hover:bg-slate-50 ${state.currentConversationId === c.ConversationId ? 'bg-brand-50' : ''}" data-cid="${c.ConversationId}">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">${escapeHtml(initials(c.ConversationName || ('Chat ' + c.ConversationId)))}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${escapeHtml(c.ConversationName || ('Chat ' + c.ConversationId))}</p>
            <p class="text-xs text-muted truncate">${escapeHtml(c.LastMessagePreview || '')}</p>
          </div>
          <div class="text-right">
            ${c.UnreadCount > 0 ? `<span class="badge-brand">${c.UnreadCount}</span>` : ''}
            <p class="text-[10px] text-muted mt-1">${c.LastMessageAt ? new Date(c.LastMessageAt).toLocaleTimeString() : ''}</p>
          </div>
        </div>
      </li>
    `).join('');
    Array.from(list.querySelectorAll('li')).forEach(li => {
      li.addEventListener('click', () => {
        openConversation(Number(li.getAttribute('data-cid')));
      });
    });
  }

  async function loadConversations() {
    try {
      const data = await api('/api/messages/conversations');
      state.conversations = data.items || [];
      renderConversations();
      // Update unread pill in header
      const totalUnread = state.conversations.reduce((s, c) => s + (c.UnreadCount || 0), 0);
      const pill = $('kchUnreadPill');
      if (pill) {
        if (totalUnread > 0) {
          pill.textContent = String(totalUnread);
          pill.classList.remove('hidden');
        } else {
          pill.classList.add('hidden');
        }
      }
      // Also update a topbar unread indicator if present
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

  async function openConversation(conversationId) {
    state.currentConversationId = conversationId;
    const conv = state.conversations.find(c => c.ConversationId === conversationId);
    if (conv) {
      $('kchConvTitle').textContent = conv.ConversationName || ('Chat ' + conversationId);
      $('kchConvSubtitle').textContent = conv.ConversationType || '';
      const typeEl = $('kchConvType');
      if (typeEl) typeEl.textContent = conv.ConversationType || '';
    }
    renderConversations();
    await loadMessages();
    try { await api('/api/messages/conversations/' + conversationId + '/read', { method: 'POST' }); } catch (_) {}
    // Mark conversation as read locally
    if (conv) conv.UnreadCount = 0;
    loadConversations();
  }

  async function loadMessages() {
    if (!state.currentConversationId) return;
    try {
      const data = await api('/api/messages/conversations/' + state.currentConversationId + '/messages?pageSize=40');
      renderMessages(data.items || []);
    } catch (err) {
      console.warn('[kch] loadMessages failed', err.message);
    }
  }

  function renderMessages(items) {
    const list = $('kchMessageList');
    if (!list) return;
    list.innerHTML = items.map(m => {
      const isMe = m.SenderUserId === (window.kchCurrentUserId || 0);
      const ts = m.CreatedAt ? new Date(m.CreatedAt).toLocaleTimeString() : '';
      const body = m.MessageBody ? `<p class="text-sm">${escapeHtml(m.MessageBody)}</p>` : '';
      return `<div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
        <div class="${isMe ? 'bg-brand-100' : 'bg-slate-100'} rounded-lg px-3 py-2 max-w-[80%]">
          <p class="text-xs text-muted mb-1">${escapeHtml(ts)}</p>
          ${body}
        </div>
      </div>`;
    }).join('');
    list.scrollTop = list.scrollHeight;
  }

  // ---- Send message ----
  const sendForm = $('kchMessageForm');
  if (sendForm) {
    sendForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.currentConversationId) return;
      const input = $('kchMessageInput');
      const body = String(input.value || '').trim();
      const attachmentId = $('kchAttachmentId').value || null;
      if (!body && !attachmentId) return;
      const btn = $('kchSendBtn');
      btn.disabled = true;
      try {
        const messageType = body && attachmentId ? 'TextWithImage' : (attachmentId ? 'Image' : 'Text');
        await api('/api/messages/conversations/' + state.currentConversationId + '/messages', {
          method: 'POST',
          body: JSON.stringify({ messageBody: body, messageType, messageAttachmentId: attachmentId || null })
        });
        input.value = '';
        $('kchAttachmentId').value = '';
        $('kchAttachmentPreview').classList.add('hidden');
        await loadMessages();
        await loadConversations();
      } catch (err) {
        if (window.kch && window.kch.toast) window.kch.toast.show('Send failed: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---- Image upload ----
  const fileInput = $('kchImageFile');
  if (fileInput) {
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        if (window.kch && window.kch.toast) window.kch.toast.show('Image must be 10 MB or smaller', 'error');
        return;
      }
      if (!state.currentConversationId) {
        if (window.kch && window.kch.toast) window.kch.toast.show('Open a conversation first', 'info');
        return;
      }
      const fd = new FormData();
      fd.append('image', file);
      fd.append('conversationId', String(state.currentConversationId));
      try {
        const res = await fetch('/api/messages/attachments', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin',
          headers: { 'X-CSRF-Token': (document.querySelector('meta[name="csrf-token"]') || {}).content || '' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        $('kchAttachmentId').value = data.attachmentId;
        $('kchAttachmentName').textContent = file.name;
        $('kchAttachmentPreview').classList.remove('hidden');
      } catch (err) {
        if (window.kch && window.kch.toast) window.kch.toast.show('Upload failed: ' + err.message, 'error');
      } finally {
        fileInput.value = '';
      }
    });
  }

  const removeAttachment = $('kchRemoveAttachment');
  if (removeAttachment) {
    removeAttachment.addEventListener('click', () => {
      $('kchAttachmentId').value = '';
      $('kchAttachmentPreview').classList.add('hidden');
    });
  }

  // ---- New conversation modal ----
  const newConvBtn = $('kchNewConversation');
  const newConvModal = $('kchNewConvModal');
  const newConvCancel = $('kchNewConvCancel');
  const newConvForm = $('kchNewConvForm');
  if (newConvBtn) newConvBtn.addEventListener('click', () => newConvModal && newConvModal.classList.remove('hidden'));
  if (newConvCancel) newConvCancel.addEventListener('click', () => newConvModal && newConvModal.classList.add('hidden'));
  if (newConvForm) {
    newConvForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const conversationType = $('kchNewConvType').value;
      const recipients = String($('kchNewConvRecipients').value || '').split(',').map(s => Number(String(s).trim())).filter(n => Number.isInteger(n) && n > 0);
      try {
        const data = await api('/api/messages/conversations', {
          method: 'POST',
          body: JSON.stringify({ conversationType, otherUserIds: recipients })
        });
        newConvModal.classList.add('hidden');
        await loadConversations();
        openConversation(data.conversationId);
      } catch (err) {
        if (window.kch && window.kch.toast) window.kch.toast.show('Could not create: ' + err.message, 'error');
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
        if (window.kch && window.kch.toast) window.kch.toast.show('Fault submitted. Thank you.', 'success');
        faultForm.reset();
      } catch (err) {
        if (window.kch && window.kch.toast) window.kch.toast.show('Submit failed: ' + err.message, 'error');
      }
    });
  }

  // ---- Polling (fallback when SSE not supported) ----
  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = setInterval(async () => {
      try {
        const data = await api('/api/messages/poll?sinceEventId=0');
        const items = (data && data.items) || [];
        if (items.length) await loadConversations();
      } catch (_) { /* ignore */ }
    }, 15000);
  }

  function trySSE() {
    if (!window.EventSource) return;
    try {
      const sse = new EventSource('/api/messages/events');
      sse.onmessage = () => loadConversations();
      state.sse = sse;
    } catch (_) { /* fallback to polling */ }
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', () => {
    loadConversations();
    trySSE();
    startPolling();
  });
})();
