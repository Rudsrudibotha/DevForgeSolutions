// Command palette (Ctrl+K / Cmd+K). Open modal, typeahead search,
// arrow keys to navigate, enter to select, esc to close.

(function () {
  'use strict';

  function kchPaletteComponent() {
    return {
      open: false,
      query: '',
      active: 0,
      items: [],
      _keydownHandler: null,
      _triggerHandler: null,

      init() {
        const portal = (document.body && document.body.dataset && document.body.dataset.portal) || 'sms';
        const nav = (window.kchPalette && window.kchPalette.palette && window.kchPalette.palette[portal]) || [];
        const actions = (window.kchPalette && window.kchPalette.actions) || [];
        this.items = nav.concat(actions);

        this._keydownHandler = (e) => {
          const isMac = navigator.platform.toUpperCase().includes('MAC');
          const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
          if (cmdOrCtrl && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            this.toggle();
            return;
          }
          if (this.open) {
            if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
            if (e.key === 'ArrowDown') { e.preventDefault(); this.active = Math.min(this.filtered.length - 1, this.active + 1); this._scrollIntoView(); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); this.active = Math.max(0, this.active - 1); this._scrollIntoView(); return; }
            if (e.key === 'Enter') { e.preventDefault(); this.select(this.filtered[this.active]); return; }
          }
          if (e.key === '/' && !this.open && !this._isTypingInField(e.target)) {
            e.preventDefault();
            this.toggle();
          }
        };
        document.addEventListener('keydown', this._keydownHandler);

        this._triggerHandler = () => this.toggle();
        document.addEventListener('kch:open-palette', this._triggerHandler);
      },

      destroy() {
        if (this._keydownHandler) document.removeEventListener('keydown', this._keydownHandler);
        if (this._triggerHandler) document.removeEventListener('kch:open-palette', this._triggerHandler);
      },

      toggle() { this.open ? this.close() : this._open(); },
      _open() {
        this.open = true;
        this.query = '';
        this.active = 0;
        this.$nextTick(() => {
          const el = document.getElementById('kch-palette-input');
          if (el) el.focus();
        });
      },
      close() { this.open = false; this.query = ''; this.active = 0; },

      get filtered() {
        const q = (this.query || '').toLowerCase().trim();
        if (!q) return this.items;
        return this.items.filter(function (it) {
          const hay = (it.label + ' ' + (it.group || '') + ' ' + (it.keywords || '')).toLowerCase();
          return hay.indexOf(q) !== -1;
        });
      },

      get groups() {
        const list = this.filtered;
        const map = new Map();
        for (let i = 0; i < list.length; i++) {
          const g = list[i].group || 'Other';
          if (!map.has(g)) map.set(g, { name: g, items: [], startIndex: i });
          map.get(g).items.push(list[i]);
        }
        // Recompute startIndex after grouping
        let idx = 0;
        for (const g of map.values()) {
          g.startIndex = idx;
          idx += g.items.length;
        }
        return Array.from(map.values());
      },

      _isTypingInField(t) {
        if (!t) return false;
        const tag = (t.tagName || '').toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
      },

      _scrollIntoView() {
        this.$nextTick(() => {
          const active = document.querySelector('.kch-palette-item.active');
          if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
        });
      },

      select(item) {
        if (!item) return;
        if (item.href && item.href.indexOf('action:') === 0) {
          this._runAction(item.href.substring(7));
        } else if (item.href) {
          window.location.href = item.href;
        }
        this.close();
      },

      _runAction(name) {
        if (name === 'toggle-theme') {
          const d = document.documentElement.classList.toggle('dark');
          try { localStorage.setItem('kch-theme', d ? 'dark' : 'light'); } catch (_) {}
        } else if (name === 'sign-out') {
          const link = document.querySelector('a[href="/auth/logout"], a[href="/login?action=logout"], form[action="/auth/logout"] button');
          if (link) link.click();
          else window.location.href = '/auth/logout';
        } else if (name === 'shortcuts') {
          alert('Keyboard shortcuts:\n  Ctrl+K / Cmd+K  Open command palette\n  /                Quick open (when not typing)\n  Esc              Close palette / modal');
        }
      }
    };
  }

  // Expose for x-data="kchPalette()"
  window.kchPaletteComponent = kchPaletteComponent;
})();
