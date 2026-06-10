// Global keyboard shortcuts (Gmail-style: g+d, g+s, etc.)
// Mounted by every page via the layout. Independent from the command palette
// but shares the same keyboard handler to avoid double-firing.

(function () {
  'use strict';

  function kchShortcuts() {
    return {
      _handler: null,
      _waitingForSecond: false,
      _waitingTimer: null,

      init() {
        this._handler = (e) => this._onKey(e);
        document.addEventListener('keydown', this._handler);
      },
      destroy() {
        if (this._handler) document.removeEventListener('keydown', this._handler);
        if (this._waitingTimer) clearTimeout(this._waitingTimer);
      },

      _isTypingInField(t) {
        if (!t) return false;
        const tag = (t.tagName || '').toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
      },

      _navigate(path) {
        window.location.href = path;
      },

      _onKey(e) {
        // Skip when typing
        if (this._isTypingInField(e.target)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // Help shortcut: ? opens a help dialog (simple alert for now)
        if (e.key === '?') {
          e.preventDefault();
          this._showHelp();
          return;
        }

        // g-prefix shortcuts (must be pressed within 1.5s of each other)
        if (e.key === 'g' && !this._waitingForSecond) {
          this._waitingForSecond = true;
          this._waitingTimer = setTimeout(() => { this._waitingForSecond = false; }, 1500);
          return;
        }

        if (this._waitingForSecond) {
          this._waitingForSecond = false;
          if (this._waitingTimer) clearTimeout(this._waitingTimer);
          const key = e.key.toLowerCase();
          const portal = (document.body && document.body.dataset && document.body.dataset.portal) || 'sms';
          const dest = this._resolve(portal, key);
          if (dest) {
            e.preventDefault();
            this._navigate(dest);
          }
        }
      },

      _resolve(portal, key) {
        // Common shortcuts (all portals)
        const common = {
          h: { parent: '/parent', sms: '/sms', devforge: '/devforge' },
          d: { parent: '/parent', sms: '/sms', devforge: '/devforge' }
        };
        if (common[key]) return common[key][portal];

        // Per-portal shortcuts
        const perPortal = {
          parent: { i: '/parent/invoices', m: '/parent/messages', c: '/parent/consent', a: '/account' },
          sms: {
            s: '/sms/students', f: '/sms/families', l: '/sms/classes',
            a: '/sms/attendance', i: '/sms/invoices', p: '/sms/payments',
            b: '/sms/bank-statements', t: '/sms/staff', r: '/sms/reports',
            n: '/sms/settings', ',': '/sms/settings'
          },
          devforge: { s: '/devforge/schools', u: '/devforge/users', p: '/devforge/payments', a: '/devforge/audit', n: '/devforge/settings', ',': '/devforge/settings' }
        };
        return (perPortal[portal] || {})[key];
      },

      _showHelp() {
        const portal = (document.body && document.body.dataset && document.body.dataset.portal) || 'sms';
        const lines = [
          'Keyboard shortcuts:',
          '',
          '  Ctrl+K / Cmd+K  Open command palette',
          '  /                Quick-open palette',
          '  ?                Show this help',
          '  Esc              Close palette / modal',
          '',
          '  g then h         Go home (dashboard)',
          '  g then d         Go to dashboard'
        ];
        const perPortal = {
          parent: [
            '  g then i         Invoices',
            '  g then m         Messages',
            '  g then c         Consent',
            '  g then a         Account'
          ],
          sms: [
            '  g then s         Students',
            '  g then f         Families',
            '  g then l         Classes',
            '  g then a         Attendance',
            '  g then i         Invoices',
            '  g then p         Payments',
            '  g then b         Bank statements',
            '  g then t         Staff',
            '  g then r         Reports',
            '  g then n         Settings'
          ],
          devforge: [
            '  g then s         Schools',
            '  g then u         Users',
            '  g then p         Payments',
            '  g then a         Audit log',
            '  g then n         Settings'
          ]
        };
        if (perPortal[portal]) lines.push('', ...perPortal[portal]);
        alert(lines.join('\n'));
      }
    };
  }

  window.kchShortcuts = kchShortcuts;
})();
