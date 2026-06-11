// Billing-category picker for the student enrolment form.
// Drag a category card from "Available" onto the learner's list, or use
// the Add/Remove buttons (keyboard and touch fallback). The first
// assigned category is the primary one used for invoicing.
//
// Loaded as a static file so the strict CSP (script-src 'self') applies;
// the category data arrives via data-* attributes on the component root.

(function () {
  'use strict';

  function studentBillingPicker() {
    return {
      assignedIds: [],
      draggingId: null,
      overDrop: false,

      init() {
        try {
          this.assignedIds = JSON.parse(this.$el.dataset.assigned || '[]')
            .map(Number)
            .filter(function (id) { return Number.isInteger(id) && id > 0; });
        } catch (_) {
          this.assignedIds = [];
        }
      },

      isAssigned(id) { return this.assignedIds.indexOf(Number(id)) !== -1; },
      isPrimary(id) { return this.assignedIds.length > 0 && this.assignedIds[0] === Number(id); },

      startDrag(id, event) {
        this.draggingId = Number(id);
        if (event && event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', String(id));
        }
      },
      endDrag() { this.draggingId = null; this.overDrop = false; },

      drop(event) {
        var id = this.draggingId;
        if (!id && event && event.dataTransfer) id = Number(event.dataTransfer.getData('text/plain'));
        this.assign(id);
        this.endDrag();
      },

      assign(id) {
        id = Number(id);
        if (Number.isInteger(id) && id > 0 && !this.isAssigned(id)) this.assignedIds.push(id);
      },
      remove(id) {
        id = Number(id);
        this.assignedIds = this.assignedIds.filter(function (x) { return x !== id; });
      },
      makePrimary(id) {
        id = Number(id);
        if (!this.isAssigned(id)) return;
        this.assignedIds = [id].concat(this.assignedIds.filter(function (x) { return x !== id; }));
      }
    };
  }

  window.studentBillingPicker = studentBillingPicker;

  // Selection + compose state for the students list page. Row checkboxes
  // live inside the HTMX-swapped table body; Alpine re-binds them after
  // each swap, and the selection itself survives in this component.
  function studentListEmailer() {
    return {
      showFilters: false,
      selected: [],
      compose: false,
      invoicePanel: false,
      scope: 'selected',

      init() {
        // Fired via HX-Trigger when the send succeeds.
        window.addEventListener('email-sent', () => {
          this.compose = false;
          this.invoicePanel = false;
          this.selected = [];
        });
      },

      isSelected(id) { return this.selected.indexOf(Number(id)) !== -1; },
      toggleRow(id) {
        id = Number(id);
        if (this.isSelected(id)) {
          this.selected = this.selected.filter(function (x) { return x !== id; });
        } else {
          this.selected.push(id);
        }
      },

      pageIds() {
        return Array.prototype.map.call(
          document.querySelectorAll('#students-table input[data-student-id]'),
          function (el) { return Number(el.dataset.studentId); }
        );
      },
      allOnPageSelected() {
        const ids = this.pageIds();
        return ids.length > 0 && ids.every((id) => this.isSelected(id));
      },
      toggleAll() {
        const ids = this.pageIds();
        if (this.allOnPageSelected()) {
          this.selected = this.selected.filter(function (id) { return ids.indexOf(id) === -1; });
        } else {
          ids.forEach((id) => { if (!this.isSelected(id)) this.selected.push(id); });
        }
      },

      openCompose(scope) {
        if (scope) this.scope = scope;
        this.compose = true;
      }
    };
  }

  window.studentListEmailer = studentListEmailer;
})();
