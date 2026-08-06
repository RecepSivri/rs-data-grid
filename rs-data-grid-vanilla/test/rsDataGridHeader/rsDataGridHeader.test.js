import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHeader } from '../../src/rsDataGrid/rsDataGridHeader/rsDataGridHeader.js';

function baseProps(overrides = {}) {
  return {
    columns: [
      { caption: 'color', dataField: 'color' },
      { caption: 'size', dataField: 'size' },
    ],
    data: [
      { color: 'red', size: 'S' },
      { color: 'red', size: 'M' },
      { color: 'blue', size: 'S' },
      { color: 'blue', size: undefined },
    ],
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
    ...overrides,
  };
}

describe('rsDataGridHeader', () => {
  let container;
  let header;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    header = createHeader();
  });

  afterEach(() => {
    header.destroy();
  });

  describe('caption row', () => {
    it('renders one caption cell per column, title-cased', () => {
      header.render(container, baseProps({ columns: [{ caption: 'first name', dataField: 'firstName' }] }));
      const captions = Array.from(container.querySelectorAll('.header-caption')).map(n => n.textContent);
      expect(captions).toEqual(['First Name']);
    });

    it('renders the index header cell when showIndex is true', () => {
      header.render(container, baseProps({ showIndex: true }));
      expect(container.querySelector('.index-header-cell').textContent).toBe('#');
    });

    it('omits the index header cell when showIndex is false', () => {
      header.render(container, baseProps({ showIndex: false }));
      expect(container.querySelector('.index-header-cell')).toBeNull();
    });

    it('renders an Actions header cell when showActions is true', () => {
      header.render(container, baseProps({ showActions: true }));
      expect(container.querySelector('.actions-header-cell').textContent).toBe('Actions');
    });

    it('applies border-header/border-area-small classes based on tableBorder/borderRadiusTop', () => {
      header.render(container, baseProps({ tableBorder: true, borderRadiusTop: true }));
      const row = container.querySelector('.full-row.row-layout-space-between-center');
      expect(row.className).toContain('border-header');
      expect(row.className).toContain('border-area-small');
    });

    it('omits border-header/border-area-small when tableBorder/borderRadiusTop are false', () => {
      header.render(container, baseProps({ tableBorder: false, borderRadiusTop: false }));
      const row = container.querySelector('.full-row.row-layout-space-between-center');
      expect(row.className).not.toContain('border-header');
      expect(row.className).not.toContain('border-area-small');
    });

    it('does not render sort toggles when showSort is false', () => {
      header.render(container, baseProps({ showSort: false }));
      expect(container.querySelectorAll('.sort-toggle').length).toBe(0);
    });

    describe('sort toggles (showSort: true)', () => {
      it('shows the neutral icon and no active class when the column is not sorted', () => {
        header.render(container, baseProps({ showSort: true, sort: { field: null, direction: null } }));
        const toggle = container.querySelector('.sort-toggle');
        expect(toggle.className).not.toContain('sort-toggle-active');
        expect(toggle.querySelector('.sort-icon').textContent).toBe('⇅');
      });

      it('shows the descending icon and active class for a desc-sorted column', () => {
        header.render(container, baseProps({ showSort: true, sort: { field: 'color', direction: 'desc' } }));
        const toggle = container.querySelectorAll('.sort-toggle')[0];
        expect(toggle.className).toContain('sort-toggle-active');
        expect(toggle.querySelector('.sort-icon').textContent).toBe('▼');
      });

      it('shows the ascending icon for an asc-sorted column', () => {
        header.render(container, baseProps({ showSort: true, sort: { field: 'color', direction: 'asc' } }));
        const toggle = container.querySelectorAll('.sort-toggle')[0];
        expect(toggle.querySelector('.sort-icon').textContent).toBe('▲');
      });

      it('invokes onSortToggle with the dataField and stops propagation (does not bubble to document)', () => {
        const onSortToggle = vi.fn();
        const docClick = vi.fn();
        document.addEventListener('click', docClick);
        header.render(container, baseProps({ showSort: true, onSortToggle }));
        container.querySelector('.sort-toggle').click();
        expect(onSortToggle).toHaveBeenCalledWith('color');
        expect(docClick).not.toHaveBeenCalled();
        document.removeEventListener('click', docClick);
      });
    });

    describe('column border-right placement (headerColumnLines)', () => {
      it('applies border-right to non-last columns, and to the last column only when showActions is true', () => {
        header.render(container, baseProps({ headerColumnLines: true, showActions: false }));
        const cells = container.querySelectorAll('.content-style.row-layout-center-center');
        expect(cells[0].className).toContain('border-right'); // first (non-last) column
        expect(cells[1].className).not.toContain('border-right'); // last column, no actions
      });

      it('adds border-right to the last column when showActions is true', () => {
        header.render(container, baseProps({ headerColumnLines: true, showActions: true }));
        const cells = container.querySelectorAll('.content-style.row-layout-center-center');
        expect(cells[1].className).toContain('border-right');
      });

      it('omits all border-right classes when headerColumnLines is false', () => {
        header.render(container, baseProps({ headerColumnLines: false, showActions: true }));
        const cells = container.querySelectorAll('.content-style.row-layout-center-center');
        cells.forEach(cell => expect(cell.className).not.toContain('border-right'));
      });
    });
  });

  describe('filter row', () => {
    it('is not rendered when showFilter is false', () => {
      header.render(container, baseProps({ showFilter: false }));
      expect(container.querySelector('.filter-row')).toBeNull();
    });

    it('renders no filter row (null) when there are zero columns, even with showFilter true', () => {
      header.render(container, baseProps({ showFilter: true, columns: [] }));
      expect(container.querySelector('.filter-row')).toBeNull();
    });

    it('renders a filter-toggle button per column, title-cased, closed by default', () => {
      header.render(container, baseProps({ showFilter: true }));
      const toggles = container.querySelectorAll('.filter-toggle');
      expect(toggles.length).toBe(2);
      expect(toggles[0].querySelector('.filter-toggle-label').textContent).toBe('Color');
      expect(container.querySelector('.filter-panel')).toBeNull();
    });

    it('applies filter-row-border when tableBorder is true', () => {
      header.render(container, baseProps({ showFilter: true, tableBorder: true }));
      expect(container.querySelector('.filter-row').className).toContain('filter-row-border');
    });

    it('renders an index filter cell when showIndex is true, bordered per bodyColumnLines', () => {
      header.render(container, baseProps({ showFilter: true, showIndex: true, bodyColumnLines: true }));
      const indexCell = container.querySelector('.filter-row .index-header-cell');
      expect(indexCell).not.toBeNull();
      expect(indexCell.className).toContain('border-right');
    });

    it('renders an actions filter cell when showActions is true', () => {
      header.render(container, baseProps({ showFilter: true, showActions: true }));
      expect(container.querySelector('.filter-row .actions-header-cell')).not.toBeNull();
    });

    it('opens a dropdown panel showing sorted, de-duplicated, non-empty values when the toggle is clicked', () => {
      header.render(container, baseProps({ showFilter: true }));
      const colorToggle = container.querySelectorAll('.filter-toggle')[0];
      colorToggle.click();
      const panel = container.querySelector('.filter-panel');
      expect(panel).not.toBeNull();
      const options = Array.from(panel.querySelectorAll('.filter-option span')).map(s => s.textContent);
      expect(options).toEqual(['blue', 'red']); // sorted, de-duplicated; undefined size row still yields 'blue'/'red' colors
      // render() rebuilds the whole subtree on click, so re-query for the current toggle node.
      expect(container.querySelectorAll('.filter-toggle')[0].className).toContain('filter-toggle-open');
    });

    it('shows "No values" when a column has no eligible option values', () => {
      header.render(
        container,
        baseProps({
          showFilter: true,
          columns: [{ caption: 'missing', dataField: 'missing' }],
          data: [{ missing: undefined }, { missing: null }, { missing: '' }],
        })
      );
      container.querySelector('.filter-toggle').click();
      expect(container.querySelector('.filter-empty').textContent).toBe('No values');
    });

    it('clicking the open toggle again closes the dropdown', () => {
      header.render(container, baseProps({ showFilter: true }));
      const colorToggle = container.querySelectorAll('.filter-toggle')[0];
      colorToggle.click();
      expect(container.querySelector('.filter-panel')).not.toBeNull();
      container.querySelectorAll('.filter-toggle')[0].click(); // re-query: DOM was rebuilt
      expect(container.querySelector('.filter-panel')).toBeNull();
    });

    it('opening a different column\'s dropdown closes the previously open one (single openDataField)', () => {
      header.render(container, baseProps({ showFilter: true }));
      container.querySelectorAll('.filter-toggle')[0].click(); // open color
      expect(container.querySelectorAll('.filter-toggle')[0].className).toContain('filter-toggle-open');
      container.querySelectorAll('.filter-toggle')[1].click(); // open size instead
      const toggles = container.querySelectorAll('.filter-toggle');
      expect(toggles[0].className).not.toContain('filter-toggle-open');
      expect(toggles[1].className).toContain('filter-toggle-open');
    });

    it('checking an option toggles it into selectedValues, calls onFilterChange, marks the checkbox checked, and shows a count badge', () => {
      const onFilterChange = vi.fn();
      header.render(container, baseProps({ showFilter: true, onFilterChange }));
      container.querySelectorAll('.filter-toggle')[0].click(); // open color
      const checkbox = container.querySelector('.filter-option input[type="checkbox"]'); // first option: 'blue'
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      expect(onFilterChange).toHaveBeenCalledWith({ dataField: 'color', values: ['blue'] });
      const toggle = container.querySelectorAll('.filter-toggle')[0];
      expect(toggle.className).toContain('filter-toggle-active');
      expect(toggle.querySelector('.filter-count').textContent).toBe('1');
      const rechecked = container.querySelector('.filter-option input[type="checkbox"]');
      expect(rechecked.checked).toBe(true);
      expect(container.querySelector('.filter-option').className).toContain('filter-option-selected');
    });

    it('unchecking a selected option removes it from selectedValues and calls onFilterChange with the remainder', () => {
      const onFilterChange = vi.fn();
      header.render(container, baseProps({ showFilter: true, onFilterChange }));
      container.querySelectorAll('.filter-toggle')[0].click();
      let checkboxes = container.querySelectorAll('.filter-option input[type="checkbox"]');
      checkboxes[0].dispatchEvent(new Event('change', { bubbles: true })); // select 'blue'
      checkboxes = container.querySelectorAll('.filter-option input[type="checkbox"]');
      checkboxes[1].dispatchEvent(new Event('change', { bubbles: true })); // select 'red' too
      expect(onFilterChange).toHaveBeenLastCalledWith({ dataField: 'color', values: ['blue', 'red'] });
      checkboxes = container.querySelectorAll('.filter-option input[type="checkbox"]');
      checkboxes[0].dispatchEvent(new Event('change', { bubbles: true })); // deselect 'blue'
      expect(onFilterChange).toHaveBeenLastCalledWith({ dataField: 'color', values: ['red'] });
    });

    it('shows a "Clear selection" button only once at least one value is selected, and clicking it clears the filter', () => {
      const onFilterChange = vi.fn();
      header.render(container, baseProps({ showFilter: true, onFilterChange }));
      container.querySelectorAll('.filter-toggle')[0].click();
      expect(container.querySelector('.filter-clear')).toBeNull();
      container.querySelector('.filter-option input[type="checkbox"]').dispatchEvent(new Event('change', { bubbles: true }));
      const clearBtn = container.querySelector('.filter-clear');
      expect(clearBtn.textContent).toBe('Clear selection');
      clearBtn.click();
      expect(onFilterChange).toHaveBeenLastCalledWith({ dataField: 'color', values: [] });
      expect(container.querySelector('.filter-toggle').className).not.toContain('filter-toggle-active');
      expect(container.querySelector('.filter-clear')).toBeNull();
    });

    it("excludes a column's own selection from its own option list, but reflects OTHER active filters when computing options", () => {
      header.render(container, baseProps({ showFilter: true }));
      // Open "size", select "M" (only row with color=red has size M).
      container.querySelectorAll('.filter-toggle')[1].click();
      container.querySelector('.filter-option input[type="checkbox"]').click(); // size options sorted: ['M','S'] -> 'M' first
      // Now open "color": with size=['M'] active, only the red/M row remains -> color options should be just ['red'].
      container.querySelectorAll('.filter-toggle')[0].click();
      const colorOptions = Array.from(container.querySelectorAll('.filter-panel .filter-option span')).map(s => s.textContent);
      expect(colorOptions).toEqual(['red']);
    });

    it('stops propagation on clicks inside the filter-dropdown wrapper so they do not reach the document listener', () => {
      const docClick = vi.fn();
      document.addEventListener('click', docClick);
      header.render(container, baseProps({ showFilter: true }));
      container.querySelectorAll('.filter-toggle')[0].click();
      docClick.mockClear();
      container.querySelector('.filter-dropdown').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(docClick).not.toHaveBeenCalled();
      document.removeEventListener('click', docClick);
    });
  });

  describe('document click closes any open dropdown (closeDropdown)', () => {
    it('closes the open dropdown when a click happens outside the header container', () => {
      header.render(container, baseProps({ showFilter: true }));
      container.querySelectorAll('.filter-toggle')[0].click();
      expect(container.querySelector('.filter-panel')).not.toBeNull();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(container.querySelector('.filter-panel')).toBeNull();
    });

    it('is a no-op when no dropdown is open (openDataField already null)', () => {
      header.render(container, baseProps({ showFilter: true }));
      expect(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
      expect(container.querySelector('.filter-panel')).toBeNull();
    });

    it('attaches the document listener only once across multiple render() calls', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      header.render(container, baseProps());
      header.render(container, baseProps());
      const clickAttachments = addSpy.mock.calls.filter(([type]) => type === 'click');
      expect(clickAttachments.length).toBe(1);
      addSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    it('removes the document click listener so subsequent renders can re-attach it', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      header.render(container, baseProps());
      header.destroy();
      expect(removeSpy.mock.calls.some(([type]) => type === 'click')).toBe(true);
      header.render(container, baseProps());
      const clickAttachments = addSpy.mock.calls.filter(([type]) => type === 'click');
      expect(clickAttachments.length).toBe(2);
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('is a no-op when called before any render (listenerAttached already false)', () => {
      const freshHeader = createHeader();
      expect(() => freshHeader.destroy()).not.toThrow();
    });

    it('is safe to call twice in a row', () => {
      header.render(container, baseProps());
      header.destroy();
      expect(() => header.destroy()).not.toThrow();
    });
  });
});
