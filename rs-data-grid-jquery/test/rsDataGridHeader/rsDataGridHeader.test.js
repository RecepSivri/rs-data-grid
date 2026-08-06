import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import $ from 'jquery';
import { createHeader } from '../../src/rsDataGrid/rsDataGridHeader/rsDataGridHeader.js';

const columns = [
  { caption: 'first name', dataField: 'firstName' },
  { caption: 'AGE', dataField: 'age' },
];

const data = [
  { firstName: 'ada', age: 30 },
  { firstName: 'bob', age: 25 },
  { firstName: 'cid', age: 30 },
];

function baseProps(overrides = {}) {
  return {
    columns,
    data,
    headerRowLines: true,
    headerColumnLines: true,
    bodyColumnLines: true,
    tableBorder: true,
    borderRadiusTop: false,
    showFilter: false,
    showSort: false,
    showActions: false,
    showIndex: false,
    sort: { field: null, direction: null },
    onFilterChange: vi.fn(),
    onSortToggle: vi.fn(),
    delegationRoot: undefined,
    ...overrides,
  };
}

// Count only the handlers this module's own namespace registered on `document`,
// via jQuery's internal event data store -- used to assert destroy() actually
// removes what bindDelegation() added, and to make cross-instance leaks visible.
function countNamespacedDocumentHandlers() {
  const events = $._data(document, 'events');
  if (!events || !events.click) {
    return 0;
  }
  return events.click.filter(h => h.namespace === 'rsGridFilterHeader').length;
}

describe('rsDataGridHeader', () => {
  afterEach(() => {
    // Belt-and-suspenders cleanup so a leaking test can't poison the next one.
    $(document).off('click.rsGridFilterHeader');
    document.body.innerHTML = '';
  });

  describe('buildCaptionRow via render()', () => {
    it('renders one caption cell per column, title-cased', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps());
      const captions = [...container.querySelectorAll('.header-caption')].map(n => n.textContent);
      expect(captions).toEqual(['First Name', 'Age']);
    });

    it('renders an index header cell first when showIndex is true', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showIndex: true }));
      const indexCell = container.querySelector('.index-header-cell');
      expect(indexCell).not.toBeNull();
      expect(indexCell.textContent).toBe('#');
    });

    it('omits the index header cell when showIndex is false', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showIndex: false }));
      expect(container.querySelector('.index-header-cell')).toBeNull();
    });

    it('renders an actions header cell last when showActions is true', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showActions: true }));
      expect(container.querySelector('.actions-header-cell').textContent).toBe('Actions');
    });

    it('omits sort toggle buttons when showSort is false', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showSort: false }));
      expect(container.querySelectorAll('.sort-toggle').length).toBe(0);
    });

    it('renders a neutral sort icon (⇅) for unsorted columns when showSort is true', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showSort: true }));
      const icons = [...container.querySelectorAll('.sort-icon')].map(n => n.textContent);
      expect(icons).toEqual(['⇅', '⇅']);
      expect(container.querySelectorAll('.sort-toggle-active').length).toBe(0);
    });

    it('renders a descending icon (▼) and marks the toggle active for the sorted-desc column', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showSort: true, sort: { field: 'age', direction: 'desc' } }));
      const toggles = [...container.querySelectorAll('.sort-toggle')];
      expect(toggles[1].className).toContain('sort-toggle-active');
      expect(toggles[1].querySelector('.sort-icon').textContent).toBe('▼');
      expect(toggles[0].className).not.toContain('sort-toggle-active');
    });

    it('renders an ascending icon (▲) for the sorted-asc column', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showSort: true, sort: { field: 'firstName', direction: 'asc' } }));
      expect(container.querySelectorAll('.sort-toggle')[0].querySelector('.sort-icon').textContent).toBe('▲');
    });

    it('adds border-right to all-but-last column cell when headerColumnLines is true and showActions is false', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ headerColumnLines: true, showActions: false }));
      const cells = [...container.querySelectorAll('.content-style')];
      expect(cells[0].className).toContain('border-right');
      expect(cells[1].className).not.toContain('border-right');
    });

    it('adds border-right to the LAST column cell too when showActions is true', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ headerColumnLines: true, showActions: true }));
      const cells = [...container.querySelectorAll('.content-style')];
      expect(cells[1].className).toContain('border-right');
    });

    it('applies border-header class when tableBorder is true, and border-area-small when borderRadiusTop is true', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ tableBorder: true, borderRadiusTop: true }));
      const row = container.querySelector('.full-row.row-layout-space-between-center');
      expect(row.className).toContain('border-header');
      expect(row.className).toContain('border-area-small');
    });
  });

  describe('buildFilterRow via render()', () => {
    it('renders no filter row at all when showFilter is false', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showFilter: false }));
      expect(container.querySelector('.filter-row')).toBeNull();
    });

    it('renders nothing for the filter row when there are zero columns (buildFilterRow returns null)', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showFilter: true, columns: [] }));
      expect(container.querySelector('.filter-row')).toBeNull();
    });

    it('renders a filter-toggle button per column with title-cased label and no active/open state by default', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showFilter: true }));
      const toggles = [...container.querySelectorAll('.filter-toggle')];
      expect(toggles.length).toBe(2);
      expect(toggles[0].querySelector('.filter-toggle-label').textContent).toBe('First Name');
      expect(toggles[0].className).not.toContain('filter-toggle-active');
      expect(toggles[0].className).not.toContain('filter-toggle-open');
      expect(container.querySelector('.filter-count')).toBeNull();
    });

    it('renders an index filter cell first when showIndex is true, and an actions filter cell last when showActions is true', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showFilter: true, showIndex: true, showActions: true }));
      expect(container.querySelector('.index-header-cell.filter-cell')).not.toBeNull();
      expect(container.querySelector('.actions-header-cell.filter-cell')).not.toBeNull();
    });

    it('applies filter-row-border only when tableBorder is true', () => {
      const header = createHeader();
      const container = document.createElement('div');
      header.render(container, baseProps({ showFilter: true, tableBorder: false }));
      expect(container.querySelector('.filter-row').className).not.toContain('filter-row-border');
    });
  });

  describe('delegated interactions (bound once on the container when no delegationRoot given)', () => {
    it('sort-toggle click calls onSortToggle with the column dataField and stops propagation', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const onSortToggle = vi.fn();
      header.render(container, baseProps({ showSort: true, onSortToggle }));
      container.querySelectorAll('.sort-toggle')[1].click();
      expect(onSortToggle).toHaveBeenCalledWith('age');
    });

    it('filter-toggle click opens the dropdown (adds filter-toggle-open + renders filter-panel with options)', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true }));
      container.querySelectorAll('.filter-toggle')[0].click();
      const toggle = container.querySelectorAll('.filter-toggle')[0];
      expect(toggle.className).toContain('filter-toggle-open');
      const options = [...container.querySelectorAll('.filter-option span')].map(n => n.textContent);
      expect(options).toEqual(['ada', 'bob', 'cid']);
    });

    it('clicking an already-open filter-toggle closes it (toggle behavior)', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true }));
      const toggle = () => container.querySelectorAll('.filter-toggle')[0];
      toggle().click();
      expect(toggle().className).toContain('filter-toggle-open');
      toggle().click();
      expect(toggle().className).not.toContain('filter-toggle-open');
    });

    it('opening one column\'s filter closes any previously open one (single open field)', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true }));
      const toggles = () => container.querySelectorAll('.filter-toggle');
      toggles()[0].click();
      toggles()[1].click();
      expect(toggles()[0].className).not.toContain('filter-toggle-open');
      expect(toggles()[1].className).toContain('filter-toggle-open');
    });

    it('shows "No values" when a column has no distinct non-empty values among the (other-filter-applied) rows', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true, data: [{ firstName: '', age: null }, { firstName: null, age: undefined }] }));
      container.querySelectorAll('.filter-toggle')[0].click();
      expect(container.querySelector('.filter-empty').textContent).toBe('No values');
    });

    it('checking a filter-option checkbox calls onFilterChange with the new values array and re-renders it checked', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const onFilterChange = vi.fn();
      header.render(container, baseProps({ showFilter: true, onFilterChange }));
      container.querySelectorAll('.filter-toggle')[0].click();
      const checkbox = container.querySelector('.filter-option input[type="checkbox"]');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      expect(onFilterChange).toHaveBeenCalledWith({ dataField: 'firstName', values: ['ada'] });
      const rechecked = container.querySelector('.filter-option input[type="checkbox"]');
      expect(rechecked.checked).toBe(true);
      expect(container.querySelector('.filter-count').textContent).toBe('1');
    });

    it('unchecking a selected filter-option removes it from the values array', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const onFilterChange = vi.fn();
      header.render(container, baseProps({ showFilter: true, onFilterChange }));
      container.querySelectorAll('.filter-toggle')[0].click();
      let checkbox = container.querySelector('.filter-option input[type="checkbox"]');
      checkbox.dispatchEvent(new Event('change', { bubbles: true })); // select 'ada'
      // dropdown re-rendered open still (openDataField unchanged); re-query then toggle again
      checkbox = container.querySelector('.filter-option input[type="checkbox"]');
      checkbox.dispatchEvent(new Event('change', { bubbles: true })); // unselect 'ada'
      expect(onFilterChange).toHaveBeenLastCalledWith({ dataField: 'firstName', values: [] });
    });

    it('regression: numeric-looking option values (e.g. an "age" column) filter correctly end-to-end', () => {
      // jQuery's .data() auto-casts a data-value like "30" into the Number 30.
      // getOptions()/applyFilters() compare via values.includes(String(row[field])),
      // so a stray Number here would never match and the filter would silently
      // return zero rows. Read via .attr('data-value') to keep it a string.
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const onFilterChange = vi.fn();
      header.render(container, baseProps({ showFilter: true, onFilterChange }));
      container.querySelectorAll('.filter-toggle')[1].click(); // open "age"
      const thirtyCheckbox = [...container.querySelectorAll('.filter-option')]
        .find(l => l.textContent.trim() === '30')
        .querySelector('input');
      thirtyCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      expect(onFilterChange).toHaveBeenCalledWith({ dataField: 'age', values: ['30'] });
      expect(typeof onFilterChange.mock.calls[0][0].values[0]).toBe('string');
    });

    it('the options list for one column excludes rows already filtered out by a different column\'s active filter', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const props = baseProps({ showFilter: true });
      header.render(container, props);
      // select age=30 for the age column, then reopen the firstName dropdown
      container.querySelectorAll('.filter-toggle')[1].click();
      const ageCheckbox = [...container.querySelectorAll('.filter-option')].find(l => l.textContent.trim() === '30').querySelector('input');
      ageCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      container.querySelectorAll('.filter-toggle')[1].click(); // close age dropdown
      container.querySelectorAll('.filter-toggle')[0].click(); // open firstName dropdown
      const names = [...container.querySelectorAll('.filter-option span')].map(n => n.textContent);
      expect(names).toEqual(['ada', 'cid']); // bob (age 25) excluded
    });

    it('renders a "Clear selection" button only once a filter is active, and clicking it clears that field only', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const onFilterChange = vi.fn();
      header.render(container, baseProps({ showFilter: true, onFilterChange }));
      container.querySelectorAll('.filter-toggle')[0].click();
      expect(container.querySelector('.filter-clear')).toBeNull();
      const checkbox = container.querySelector('.filter-option input[type="checkbox"]');
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      const clearBtn = container.querySelector('.filter-clear');
      expect(clearBtn).not.toBeNull();
      clearBtn.click();
      expect(onFilterChange).toHaveBeenLastCalledWith({ dataField: 'firstName', values: [] });
      expect(container.querySelector('.filter-count')).toBeNull();
    });

    it('clicking inside the filter-dropdown itself does not bubble to close it (stopPropagation)', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true }));
      container.querySelectorAll('.filter-toggle')[0].click();
      const dropdown = container.querySelector('.filter-dropdown');
      dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(container.querySelectorAll('.filter-toggle')[0].className).toContain('filter-toggle-open');
    });
  });

  describe('outside-click-close (namespaced $(document).on("click.rsGridFilterHeader"))', () => {
    it('closes an open dropdown when a click reaches document from outside the header', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true }));
      container.querySelectorAll('.filter-toggle')[0].click();
      expect(container.querySelectorAll('.filter-toggle')[0].className).toContain('filter-toggle-open');

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(container.querySelectorAll('.filter-toggle')[0].className).not.toContain('filter-toggle-open');
    });

    it('is a no-op when no dropdown is open (openDataField null guard, no re-render triggered)', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true }));
      const captionCellBefore = container.querySelector('.header-caption');
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      // no re-render happened: same DOM node reference survives
      expect(container.querySelector('.header-caption')).toBe(captionCellBefore);
    });

    it('destroy() removes the document-level listener so further outside clicks no longer close anything', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true }));
      container.querySelectorAll('.filter-toggle')[0].click();
      header.destroy();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      // still open: destroy() unbound the closer before this click happened
      expect(container.querySelectorAll('.filter-toggle')[0].className).toContain('filter-toggle-open');
    });

    it('does not leak a growing number of document-level handlers across repeated render() calls on the same instance', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      header.render(container, baseProps({ showFilter: true }));
      header.render(container, baseProps({ showFilter: true }));
      header.render(container, baseProps({ showFilter: true }));
      expect(countNamespacedDocumentHandlers()).toBe(1);
      header.destroy();
      expect(countNamespacedDocumentHandlers()).toBe(0);
    });

    it('multiple mount/destroy cycles (fresh instance each time, matching real single-spa remount behavior) leave zero handlers behind', () => {
      for (let i = 0; i < 3; i++) {
        const header = createHeader();
        const container = document.createElement('div');
        document.body.appendChild(container);
        header.render(container, baseProps({ showFilter: true }));
        expect(countNamespacedDocumentHandlers()).toBe(1);
        header.destroy();
        expect(countNamespacedDocumentHandlers()).toBe(0);
      }
    });

    it('documents a cross-instance interaction: two concurrently-mounted header instances share the "click.rsGridFilterHeader" namespace, so destroying one removes BOTH document handlers', () => {
      // This is a real characteristic of the current implementation, not a
      // hypothetical: $(document).off(namespace) matches by namespace alone,
      // not by which instance's bindDelegation() registered the handler. In
      // production only one grid mounts at a time, so this does not manifest --
      // but it is exactly the kind of thing a delegation-based rewrite can get
      // wrong, so it is pinned down here explicitly.
      const headerA = createHeader();
      const containerA = document.createElement('div');
      document.body.appendChild(containerA);
      headerA.render(containerA, baseProps({ showFilter: true }));

      const headerB = createHeader();
      const containerB = document.createElement('div');
      document.body.appendChild(containerB);
      headerB.render(containerB, baseProps({ showFilter: true }));

      expect(countNamespacedDocumentHandlers()).toBe(2);

      headerA.destroy();

      expect(countNamespacedDocumentHandlers()).toBe(0);
    });
  });

  describe('jQuery event delegation survives full DOM rebuilds', () => {
    it('a stable delegationRoot keeps sort-toggle clicks working after the header container is torn down and replaced', () => {
      const header = createHeader();
      const stableRoot = document.createElement('div');
      document.body.appendChild(stableRoot);
      const onSortToggle = vi.fn();

      // First render: a fresh headerContainer, as rsDataGrid.js creates on every renderBody().
      let headerContainer = document.createElement('div');
      stableRoot.appendChild(headerContainer);
      header.render(headerContainer, baseProps({ showSort: true, onSortToggle, delegationRoot: stableRoot }));
      headerContainer.querySelectorAll('.sort-toggle')[0].click();
      expect(onSortToggle).toHaveBeenCalledTimes(1);

      // Force a full rebuild: remove the old container entirely and mount a brand new one,
      // exactly like renderBody() does every time (headerContainer = el('div') each call).
      stableRoot.removeChild(headerContainer);
      headerContainer = document.createElement('div');
      stableRoot.appendChild(headerContainer);
      header.render(headerContainer, baseProps({ showSort: true, onSortToggle, delegationRoot: stableRoot }));

      headerContainer.querySelectorAll('.sort-toggle')[1].click();
      expect(onSortToggle).toHaveBeenCalledTimes(2);
      expect(onSortToggle).toHaveBeenLastCalledWith('age');
    });

    it('falls back to binding directly on the passed container when no delegationRoot is supplied', () => {
      const header = createHeader();
      const container = document.createElement('div');
      document.body.appendChild(container);
      const onSortToggle = vi.fn();
      header.render(container, baseProps({ showSort: true, onSortToggle, delegationRoot: undefined }));
      container.querySelectorAll('.sort-toggle')[0].click();
      expect(onSortToggle).toHaveBeenCalledTimes(1);
    });
  });
});
