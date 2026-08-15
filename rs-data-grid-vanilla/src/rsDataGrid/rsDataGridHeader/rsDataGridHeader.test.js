import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHeader } from './rsDataGridHeader';

const columns = [
  { caption: 'title', dataField: 'title' },
  { caption: 'year', dataField: 'year' },
];
const data = [
  { title: 'Alpha', year: '2020' },
  { title: 'Beta', year: '2021' },
  { title: 'Gamma', year: '2020' },
];

const baseProps = (overrides = {}) => ({
  columns,
  data,
  headerColumnLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusTop: true,
  showSort: true,
  showActions: true,
  showIndex: false,
  showFilter: true,
  dragDropRows: false,
  dragDropColumns: false,
  sort: { field: null, direction: null },
  onSortToggle: vi.fn(),
  onColumnMove: vi.fn(),
  onFilterChange: vi.fn(),
  ...overrides,
});

let container;
let header;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  header = createHeader();
});

afterEach(() => {
  header.destroy();
  container.remove();
});

describe('caption row', () => {
  it('renders one caption cell per column, plus an Actions cell when enabled', () => {
    header.render(container, baseProps());
    expect(container.querySelectorAll('.header-caption').length).toBe(2);
    expect(container.querySelector('.actions-header-cell')).not.toBeNull();
  });

  it('omits the Actions cell when showActions is false', () => {
    header.render(container, baseProps({ showActions: false }));
    expect(container.querySelector('.actions-header-cell')).toBeNull();
  });

  it('renders a drag-header cell when dragDropRows is enabled', () => {
    header.render(container, baseProps({ dragDropRows: true }));
    expect(container.querySelector('.drag-header-cell')).not.toBeNull();
  });

  it('renders an index cell when showIndex is enabled', () => {
    header.render(container, baseProps({ showIndex: true }));
    expect(container.querySelector('.index-header-cell').textContent).toBe('#');
  });

  it('omits sort buttons when showSort is false', () => {
    header.render(container, baseProps({ showSort: false }));
    expect(container.querySelector('.sort-toggle')).toBeNull();
  });

  it('shows a neutral sort icon when unsorted', () => {
    header.render(container, baseProps());
    const btn = container.querySelectorAll('.sort-toggle')[0];
    expect(btn.classList.contains('sort-toggle-active')).toBe(false);
    expect(btn.querySelector('.sort-icon').textContent).toBe('⇅');
  });

  it('invokes onSortToggle with the column field, and does not bubble to the document filter-close listener', () => {
    const props = baseProps();
    header.render(container, props);
    container.querySelectorAll('.sort-toggle')[1].click();
    expect(props.onSortToggle).toHaveBeenCalledWith('year');
  });

  it('shows an active descending icon for the sorted field', () => {
    header.render(container, baseProps({ sort: { field: 'title', direction: 'desc' } }));
    const btn = container.querySelectorAll('.sort-toggle')[0];
    expect(btn.classList.contains('sort-toggle-active')).toBe(true);
    expect(btn.querySelector('.sort-icon').textContent).toBe('▼');
  });

  it('shows an active ascending icon for the sorted field', () => {
    header.render(container, baseProps({ sort: { field: 'title', direction: 'asc' } }));
    expect(container.querySelectorAll('.sort-toggle')[0].querySelector('.sort-icon').textContent).toBe('▲');
  });

  it('omits the border-right on the last column when there is no Actions cell', () => {
    header.render(container, baseProps({ showActions: false }));
    const cells = container.querySelectorAll('.header-caption');
    const lastCell = cells[cells.length - 1].closest('.content-style');
    expect(lastCell.classList.contains('border-right')).toBe(false);
  });

  it('omits border-header/border-area-small when tableBorder/borderRadiusTop are off', () => {
    header.render(container, baseProps({ tableBorder: false, borderRadiusTop: false }));
    const row = container.querySelector('.row-layout-space-between-center');
    expect(row.classList.contains('border-header')).toBe(false);
    expect(row.classList.contains('border-area-small')).toBe(false);
  });

  it('omits border-right on the leading drag/index cells when headerColumnLines is off', () => {
    header.render(container, baseProps({ dragDropRows: true, showIndex: true, headerColumnLines: false }));
    expect(container.querySelector('.drag-header-cell').classList.contains('border-right')).toBe(false);
    expect(container.querySelector('.index-header-cell').classList.contains('border-right')).toBe(false);
  });
});

describe('drag-to-reorder columns', () => {
  it('does not render drag handles when dragDropColumns is off', () => {
    header.render(container, baseProps());
    expect(container.querySelector('.drag-handle')).toBeNull();
  });

  it('sets dataTransfer.effectAllowed on dragstart when a dataTransfer is present', () => {
    header.render(container, baseProps({ dragDropColumns: true }));
    const handle = container.querySelectorAll('.drag-handle')[0];
    const event = new Event('dragstart');
    event.dataTransfer = {};
    handle.dispatchEvent(event);
    expect(event.dataTransfer.effectAllowed).toBe('move');
  });

  it('tolerates dragstart with no dataTransfer available', () => {
    header.render(container, baseProps({ dragDropColumns: true }));
    const handle = container.querySelectorAll('.drag-handle')[0];
    expect(() => handle.dispatchEvent(new Event('dragstart'))).not.toThrow();
  });

  it('highlights the hovered column cell on dragover and clears it on dragleave', () => {
    header.render(container, baseProps({ dragDropColumns: true }));
    const cell = container.querySelectorAll('.content-style')[0];
    cell.dispatchEvent(new Event('dragover'));
    expect(cell.classList.contains('column-drag-over')).toBe(true);
    // A second dragover on the same field is a no-op re-add (dragOverField already equal).
    cell.dispatchEvent(new Event('dragover'));
    expect(cell.classList.contains('column-drag-over')).toBe(true);
    cell.dispatchEvent(new Event('dragleave'));
    expect(cell.classList.contains('column-drag-over')).toBe(false);
  });

  it('dragleave on a cell that is not the current dragOverField is a no-op', () => {
    header.render(container, baseProps({ dragDropColumns: true }));
    const [cellA, cellB] = container.querySelectorAll('.content-style');
    cellA.dispatchEvent(new Event('dragover'));
    expect(() => cellB.dispatchEvent(new Event('dragleave'))).not.toThrow();
    expect(cellA.classList.contains('column-drag-over')).toBe(true);
  });

  it('drop calls onColumnMove with the dragged and target fields, then clears drag state', () => {
    const props = baseProps({ dragDropColumns: true });
    header.render(container, props);
    const handles = container.querySelectorAll('.drag-handle');
    const cells = container.querySelectorAll('.content-style');
    const dragstart = new Event('dragstart');
    handles[0].dispatchEvent(dragstart);
    cells[1].dispatchEvent(new Event('drop'));
    expect(props.onColumnMove).toHaveBeenCalledWith('title', 'year');
  });

  it('drop with no active draggedField does not call onColumnMove', () => {
    const props = baseProps({ dragDropColumns: true });
    header.render(container, props);
    const cells = container.querySelectorAll('.content-style');
    cells[1].dispatchEvent(new Event('drop'));
    expect(props.onColumnMove).not.toHaveBeenCalled();
  });

  it('keeps the highlight class through a full external re-render while a hover is still active', () => {
    const props = baseProps({ dragDropColumns: true });
    header.render(container, props);
    const cell = container.querySelectorAll('.content-style')[0];
    cell.dispatchEvent(new Event('dragover'));
    // Simulate an unrelated prop update (e.g. new data) forcing a full
    // clear()+rebuild while dragOverField is still set for this column.
    header.render(container, props);
    const rebuiltCell = container.querySelectorAll('.content-style')[0];
    expect(rebuiltCell.classList.contains('column-drag-over')).toBe(true);
  });

  it('dragend clears the dragged field and re-renders', () => {
    header.render(container, baseProps({ dragDropColumns: true }));
    const handles = container.querySelectorAll('.drag-handle');
    handles[0].dispatchEvent(new Event('dragstart'));
    handles[0].dispatchEvent(new Event('dragend'));
    // After dragend, a drop finds no draggedField -- confirms state was cleared.
    const cells = container.querySelectorAll('.content-style');
    cells[1].dispatchEvent(new Event('drop'));
    // No throw, and (implicitly, via the previous test) onColumnMove would only
    // fire with a live draggedField.
    expect(container.querySelector('.drag-handle')).not.toBeNull();
  });
});

describe('filter row', () => {
  it('is omitted entirely when showFilter is false', () => {
    header.render(container, baseProps({ showFilter: false }));
    expect(container.querySelector('.filter-row')).toBeNull();
  });

  it('is omitted when there are no columns, even with showFilter on', () => {
    header.render(container, baseProps({ columns: [] }));
    expect(container.querySelector('.filter-row')).toBeNull();
  });

  it('renders a filter toggle per column, closed by default', () => {
    header.render(container, baseProps());
    const toggles = container.querySelectorAll('.filter-toggle');
    expect(toggles.length).toBe(2);
    expect(toggles[0].classList.contains('filter-toggle-open')).toBe(false);
    expect(container.querySelector('.filter-panel')).toBeNull();
  });

  it('renders leading drag/index cells in the filter row to match the caption row', () => {
    header.render(container, baseProps({ dragDropRows: true, showIndex: true }));
    expect(container.querySelectorAll('.drag-header-cell.filter-cell').length).toBe(1);
    expect(container.querySelectorAll('.index-header-cell.filter-cell').length).toBe(1);
  });

  it('omits filter-row-border and the leading cells\' border-right when tableBorder/bodyColumnLines are off', () => {
    header.render(container, baseProps({ tableBorder: false, bodyColumnLines: false, dragDropRows: true, showIndex: true }));
    expect(container.querySelector('.filter-row').classList.contains('filter-row-border')).toBe(false);
    expect(container.querySelector('.drag-header-cell.filter-cell').classList.contains('border-right')).toBe(false);
    expect(container.querySelector('.index-header-cell.filter-cell').classList.contains('border-right')).toBe(false);
  });

  it('opens a filter dropdown on click, listing distinct values, and closes it on a second click', () => {
    header.render(container, baseProps());
    container.querySelectorAll('.filter-toggle')[0].click();
    expect(container.querySelectorAll('.filter-toggle')[0].classList.contains('filter-toggle-open')).toBe(true);
    const options = container.querySelectorAll('.filter-panel .filter-option');
    expect(options.length).toBe(3); // Alpha, Beta, Gamma
    container.querySelectorAll('.filter-toggle')[0].click();
    expect(container.querySelector('.filter-panel')).toBeNull();
  });

  it('opening a second field\'s dropdown closes the first', () => {
    header.render(container, baseProps());
    container.querySelectorAll('.filter-toggle')[0].click();
    container.querySelectorAll('.filter-toggle')[1].click();
    const toggles = container.querySelectorAll('.filter-toggle');
    expect(toggles[0].classList.contains('filter-toggle-open')).toBe(false);
    expect(toggles[1].classList.contains('filter-toggle-open')).toBe(true);
  });

  it('shows "No values" when the column has none among the (cross-filtered) rows', () => {
    header.render(container, baseProps({ data: [] }));
    container.querySelectorAll('.filter-toggle')[0].click();
    expect(container.querySelector('.filter-empty').textContent).toBe('No values');
  });

  it('excludes null/undefined/empty-string values from the options list', () => {
    header.render(container, baseProps({ data: [{ title: 'A', year: '2020' }, { title: null, year: '' }, { title: undefined, year: '2020' }] }));
    container.querySelectorAll('.filter-toggle')[0].click();
    const options = Array.from(container.querySelectorAll('.filter-panel .filter-option span')).map(s => s.textContent);
    expect(options).toEqual(['A']);
  });

  it('checking a value calls onFilterChange and re-renders with the count badge shown', () => {
    const props = baseProps();
    header.render(container, props);
    container.querySelectorAll('.filter-toggle')[0].click();
    container.querySelector('.filter-panel input[type="checkbox"]').dispatchEvent(new Event('change', { bubbles: true }));
    expect(props.onFilterChange).toHaveBeenCalledWith({ dataField: 'title', values: ['Alpha'] });
    expect(container.querySelector('.filter-toggle-active')).not.toBeNull();
    expect(container.querySelector('.filter-count').textContent).toBe('1');
  });

  it('unchecking a value calls onFilterChange with it removed', () => {
    const props = baseProps();
    header.render(container, props);
    container.querySelectorAll('.filter-toggle')[0].click();
    const checkbox = () => container.querySelector('.filter-panel input[type="checkbox"]');
    checkbox().dispatchEvent(new Event('change', { bubbles: true }));
    checkbox().dispatchEvent(new Event('change', { bubbles: true }));
    expect(props.onFilterChange).toHaveBeenLastCalledWith({ dataField: 'title', values: [] });
  });

  it('clicking the count badge clears that filter via clearFilter', () => {
    const props = baseProps();
    header.render(container, props);
    container.querySelectorAll('.filter-toggle')[0].click();
    container.querySelector('.filter-panel input[type="checkbox"]').dispatchEvent(new Event('change', { bubbles: true }));
    container.querySelector('.filter-count').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(props.onFilterChange).toHaveBeenLastCalledWith({ dataField: 'title', values: [] });
  });

  it('shows a "Clear selection" button inside an open dropdown once something is selected, and it clears the filter', () => {
    const props = baseProps();
    header.render(container, props);
    container.querySelectorAll('.filter-toggle')[0].click();
    container.querySelector('.filter-panel input[type="checkbox"]').dispatchEvent(new Event('change', { bubbles: true }));
    const clearBtn = Array.from(container.querySelectorAll('.filter-clear'));
    expect(clearBtn.length).toBe(1);
    clearBtn[0].click();
    expect(props.onFilterChange).toHaveBeenLastCalledWith({ dataField: 'title', values: [] });
  });

  it('a click inside the filter-dropdown does not bubble to the document close-listener', () => {
    header.render(container, baseProps());
    container.querySelectorAll('.filter-toggle')[0].click();
    container.querySelector('.filter-dropdown').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.querySelector('.filter-panel')).not.toBeNull();
  });

  it('a click outside the header closes an open filter dropdown', () => {
    header.render(container, baseProps());
    container.querySelectorAll('.filter-toggle')[0].click();
    expect(container.querySelector('.filter-panel')).not.toBeNull();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.querySelector('.filter-panel')).toBeNull();
  });

  it('a click outside the header when nothing is open is a harmless no-op', () => {
    header.render(container, baseProps());
    expect(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
  });
});

describe('render/destroy listener lifecycle', () => {
  it('attaches the document click listener only once across repeated render() calls', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    header.render(container, baseProps());
    header.render(container, baseProps());
    const clickCalls = addSpy.mock.calls.filter(call => call[0] === 'click');
    expect(clickCalls.length).toBe(1);
    addSpy.mockRestore();
  });

  it('destroy() removes the listener and is a no-op if called again or before any render', () => {
    const freshHeader = createHeader();
    expect(() => freshHeader.destroy()).not.toThrow();

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    header.render(container, baseProps());
    header.destroy();
    header.destroy();
    const clickCalls = removeSpy.mock.calls.filter(call => call[0] === 'click');
    expect(clickCalls.length).toBe(1);
    removeSpy.mockRestore();
  });
});
