import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import RsDataGridHeader from './RsDataGridHeader.vue';

const columns = [
  { caption: 'title', dataField: 'title' },
  { caption: 'year', dataField: 'year' },
];
const data = [
  { title: 'Alpha', year: '2020' },
  { title: 'Beta', year: '2021' },
  { title: 'Gamma', year: '2020' },
];

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  columns,
  data,
  headerRowLines: true,
  headerColumnLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusTop: true,
  showFilter: true,
  showSort: true,
  showActions: true,
  showIndex: false,
  dragDropRows: false,
  dragDropColumns: false,
  sort: { field: null, direction: null },
  ...overrides,
});

let activeWrapper: VueWrapper | null = null;

async function mountHeader(props: Record<string, unknown> = {}) {
  activeWrapper = mount(RsDataGridHeader, { props: baseProps(props), attachTo: document.body });
  await activeWrapper.vm.$nextTick();
  return activeWrapper;
}

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = null;
  document.body.innerHTML = '';
});

describe('caption row', () => {
  it('renders one caption cell per column, plus an Actions cell when enabled', async () => {
    await mountHeader();
    expect(document.body.querySelectorAll('.header-caption').length).toBe(2);
    expect(document.body.querySelector('.actions-header-cell')).not.toBeNull();
  });

  it('omits the Actions cell when showActions is false', async () => {
    await mountHeader({ showActions: false });
    expect(document.body.querySelector('.actions-header-cell')).toBeNull();
  });

  it('renders a drag-header cell when dragDropRows is enabled, gated by headerColumnLines', async () => {
    await mountHeader({ dragDropRows: true, headerColumnLines: true });
    expect(document.body.querySelector('.drag-header-cell')?.className).toContain('border-right');
  });

  it('omits border-right on the leading drag cell when headerColumnLines is off', async () => {
    await mountHeader({ dragDropRows: true, headerColumnLines: false });
    expect(document.body.querySelector('.drag-header-cell')?.className).not.toContain('border-right');
  });

  it('renders an index cell when showIndex is enabled, gated by headerColumnLines', async () => {
    await mountHeader({ showIndex: true, headerColumnLines: true });
    const cell = document.body.querySelector('.index-header-cell');
    expect(cell?.textContent).toBe('#');
    expect(cell?.className).toContain('border-right');
  });

  it('omits border-right on the index cell when headerColumnLines is off', async () => {
    await mountHeader({ showIndex: true, headerColumnLines: false });
    expect(document.body.querySelector('.index-header-cell')?.className).not.toContain('border-right');
  });

  it('omits sort buttons when showSort is false', async () => {
    await mountHeader({ showSort: false });
    expect(document.body.querySelector('.sort-toggle')).toBeNull();
  });

  it('shows a neutral sort icon when unsorted', async () => {
    await mountHeader();
    const btn = document.body.querySelectorAll('.sort-toggle')[0];
    expect(btn.className).not.toContain('sort-toggle-active');
    expect(btn.querySelector('.sort-icon')?.textContent).toBe('⇅');
  });

  it('invokes sortToggle with the column field on click, without bubbling to the document filter-close listener', async () => {
    const wrapper = await mountHeader();
    (document.body.querySelectorAll('.sort-toggle')[1] as HTMLElement).click();
    expect(wrapper.emitted('sortToggle')?.[0]).toEqual(['year']);
  });

  it('shows an active descending icon for the sorted field', async () => {
    await mountHeader({ sort: { field: 'title', direction: 'desc' } });
    const btn = document.body.querySelectorAll('.sort-toggle')[0];
    expect(btn.className).toContain('sort-toggle-active');
    expect(btn.querySelector('.sort-icon')?.textContent).toBe('▼');
  });

  it('shows an active ascending icon for the sorted field', async () => {
    await mountHeader({ sort: { field: 'title', direction: 'asc' } });
    expect(document.body.querySelectorAll('.sort-toggle')[0].querySelector('.sort-icon')?.textContent).toBe('▲');
  });

  it('omits border-right on regular column cells when headerColumnLines is off', async () => {
    await mountHeader({ headerColumnLines: false });
    const cell = document.body.querySelectorAll('.content-style')[0];
    expect(cell.className).not.toContain('border-right');
  });

  it('does not render a drag-header cell when dragDropRows is off', async () => {
    await mountHeader({ dragDropRows: false });
    expect(document.body.querySelector('.drag-header-cell')).toBeNull();
  });

  it('does not render an index cell when showIndex is off', async () => {
    await mountHeader({ showIndex: false });
    expect(document.body.querySelector('.index-header-cell')).toBeNull();
  });

  it('omits the border-right on the last column when there is no Actions cell', async () => {
    await mountHeader({ showActions: false });
    const cells = document.body.querySelectorAll('.header-caption');
    const lastCell = cells[cells.length - 1].closest('.content-style');
    expect(lastCell?.className).not.toContain('border-right');
  });

  it('applies border-header/border-area-small when tableBorder/borderRadiusTop are on', async () => {
    await mountHeader({ tableBorder: true, borderRadiusTop: true });
    const row = document.body.querySelector('.row-layout-space-between-center');
    expect(row?.className).toContain('border-header');
    expect(row?.className).toContain('border-area-small');
  });

  it('omits border-header/border-area-small when tableBorder/borderRadiusTop are off', async () => {
    await mountHeader({ tableBorder: false, borderRadiusTop: false });
    const row = document.body.querySelector('.row-layout-space-between-center');
    expect(row?.className).not.toContain('border-header');
    expect(row?.className).not.toContain('border-area-small');
  });
});

describe('drag-to-reorder columns', () => {
  it('does not render drag handles when dragDropColumns is off', async () => {
    await mountHeader();
    expect(document.body.querySelector('.drag-handle')).toBeNull();
  });

  it('sets dataTransfer.effectAllowed on dragstart when a dataTransfer is present', async () => {
    await mountHeader({ dragDropColumns: true });
    const handle = document.body.querySelectorAll('.drag-handle')[0];
    const event = new Event('dragstart');
    (event as any).dataTransfer = { effectAllowed: null };
    handle.dispatchEvent(event);
    expect((event as any).dataTransfer.effectAllowed).toBe('move');
  });

  it('tolerates dragstart with no dataTransfer available', async () => {
    await mountHeader({ dragDropColumns: true });
    const handle = document.body.querySelectorAll('.drag-handle')[0];
    expect(() => handle.dispatchEvent(new Event('dragstart'))).not.toThrow();
  });

  it('highlights the hovered column cell on dragover and clears it on dragleave', async () => {
    const wrapper = await mountHeader({ dragDropColumns: true });
    const cell = document.body.querySelectorAll('.content-style')[0];
    cell.dispatchEvent(new Event('dragover'));
    await wrapper.vm.$nextTick();
    expect(cell.className).toContain('column-drag-over');
    cell.dispatchEvent(new Event('dragover'));
    await wrapper.vm.$nextTick();
    expect(cell.className).toContain('column-drag-over');
    cell.dispatchEvent(new Event('dragleave'));
    await wrapper.vm.$nextTick();
    expect(cell.className).not.toContain('column-drag-over');
  });

  it('dragleave on a cell that is not the current dragOverField is a no-op', async () => {
    const wrapper = await mountHeader({ dragDropColumns: true });
    const [cellA, cellB] = document.body.querySelectorAll('.content-style');
    cellA.dispatchEvent(new Event('dragover'));
    await wrapper.vm.$nextTick();
    cellB.dispatchEvent(new Event('dragleave'));
    await wrapper.vm.$nextTick();
    expect(cellA.className).toContain('column-drag-over');
  });

  it('drop calls columnMove with the dragged and target fields, then clears drag state', async () => {
    const wrapper = await mountHeader({ dragDropColumns: true });
    const handles = document.body.querySelectorAll('.drag-handle');
    const cells = document.body.querySelectorAll('.content-style');
    handles[0].dispatchEvent(new Event('dragstart'));
    cells[1].dispatchEvent(new Event('drop'));
    expect(wrapper.emitted('columnMove')?.[0]).toEqual(['title', 'year']);
  });

  it('drop with no active draggedField does not emit columnMove', async () => {
    const wrapper = await mountHeader({ dragDropColumns: true });
    const cells = document.body.querySelectorAll('.content-style');
    cells[1].dispatchEvent(new Event('drop'));
    expect(wrapper.emitted('columnMove')).toBeUndefined();
  });

  it('dragend clears the dragged field', async () => {
    const wrapper = await mountHeader({ dragDropColumns: true });
    const handles = document.body.querySelectorAll('.drag-handle');
    handles[0].dispatchEvent(new Event('dragstart'));
    handles[0].dispatchEvent(new Event('dragend'));
    const cells = document.body.querySelectorAll('.content-style');
    cells[1].dispatchEvent(new Event('drop'));
    expect(wrapper.emitted('columnMove')).toBeUndefined();
  });

  it('when dragDropColumns is off, dragover/dragleave/drop handlers are undefined (no-op) on the cell', async () => {
    await mountHeader({ dragDropColumns: false });
    const cell = document.body.querySelectorAll('.content-style')[0];
    expect(() => {
      cell.dispatchEvent(new Event('dragover'));
      cell.dispatchEvent(new Event('dragleave'));
      cell.dispatchEvent(new Event('drop'));
    }).not.toThrow();
  });
});

describe('filter row', () => {
  it('is omitted entirely when showFilter is false', async () => {
    await mountHeader({ showFilter: false });
    expect(document.body.querySelector('.filter-row')).toBeNull();
  });

  it('is omitted when there are no columns, even with showFilter on', async () => {
    await mountHeader({ columns: [] });
    expect(document.body.querySelector('.filter-row')).toBeNull();
  });

  it('renders leading drag/index cells in the filter row with border-right when bodyColumnLines is on', async () => {
    await mountHeader({ dragDropRows: true, showIndex: true, bodyColumnLines: true });
    expect(document.body.querySelector('.drag-header-cell.filter-cell')?.className).toContain('border-right');
    expect(document.body.querySelector('.index-header-cell.filter-cell')?.className).toContain('border-right');
  });

  it('omits border-right on the leading filter-row cells when bodyColumnLines is off', async () => {
    await mountHeader({ dragDropRows: true, showIndex: true, bodyColumnLines: false });
    expect(document.body.querySelector('.drag-header-cell.filter-cell')?.className).not.toContain('border-right');
    expect(document.body.querySelector('.index-header-cell.filter-cell')?.className).not.toContain('border-right');
  });

  it('renders a filter toggle per column, closed by default', async () => {
    await mountHeader();
    const toggles = document.body.querySelectorAll('.filter-toggle');
    expect(toggles.length).toBe(2);
    expect(toggles[0].className).not.toContain('filter-toggle-open');
    expect(document.body.querySelector('.filter-panel')).toBeNull();
  });

  it('applies filter-row-border only when tableBorder is true', async () => {
    await mountHeader({ tableBorder: false });
    expect(document.body.querySelector('.filter-row')?.className).not.toContain('filter-row-border');
  });

  it('omits border-right on regular filter cells when bodyColumnLines is off', async () => {
    await mountHeader({ bodyColumnLines: false });
    const cell = document.body.querySelectorAll('.filter-cell.full-row')[0];
    expect(cell.className).not.toContain('border-right');
  });

  it('does not render leading drag/index filter cells when dragDropRows/showIndex are off', async () => {
    await mountHeader({ dragDropRows: false, showIndex: false });
    expect(document.body.querySelector('.drag-header-cell.filter-cell')).toBeNull();
    expect(document.body.querySelector('.index-header-cell.filter-cell')).toBeNull();
  });

  it('omits the actions filter cell when showActions is off', async () => {
    await mountHeader({ showActions: false });
    expect(document.body.querySelector('.actions-header-cell.filter-cell')).toBeNull();
  });

  it('opens a filter dropdown on click, listing distinct values, and closes it on a second click', async () => {
    const wrapper = await mountHeader();
    const toggles = () => document.body.querySelectorAll('.filter-toggle');
    (toggles()[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(toggles()[0].className).toContain('filter-toggle-open');
    const options = document.body.querySelectorAll('.filter-panel .filter-option');
    expect(options.length).toBe(3);
    (toggles()[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.filter-panel')).toBeNull();
  });

  it('opening a second field\'s dropdown closes the first', async () => {
    const wrapper = await mountHeader();
    const toggles = () => document.body.querySelectorAll('.filter-toggle');
    (toggles()[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    (toggles()[1] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(toggles()[0].className).not.toContain('filter-toggle-open');
    expect(toggles()[1].className).toContain('filter-toggle-open');
  });

  it('shows "No values" when the column has none among the (cross-filtered) rows', async () => {
    const wrapper = await mountHeader({ data: [] });
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.filter-empty')?.textContent).toBe('No values');
  });

  it('excludes null/undefined/empty-string values from the options list', async () => {
    const wrapper = await mountHeader({ data: [{ title: 'A', year: '2020' }, { title: null, year: '' }, { title: undefined, year: '2020' }] });
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const options = Array.from(document.body.querySelectorAll('.filter-panel .filter-option span')).map(s => s.textContent);
    expect(options).toEqual(['A']);
  });

  it('checking a value emits filterChange and re-renders with the count badge shown', async () => {
    const wrapper = await mountHeader();
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    (document.body.querySelector('.filter-panel input[type="checkbox"]') as HTMLInputElement).dispatchEvent(new Event('change'));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('filterChange')?.[0]).toEqual([{ dataField: 'title', values: ['Alpha'] }]);
    expect(document.body.querySelector('.filter-toggle-active')).not.toBeNull();
    expect(document.body.querySelector('.filter-count')?.textContent).toBe('1');
  });

  it('unchecking a value emits filterChange with it removed', async () => {
    const wrapper = await mountHeader();
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const checkbox = () => document.body.querySelector('.filter-panel input[type="checkbox"]') as HTMLInputElement;
    checkbox().dispatchEvent(new Event('change'));
    await wrapper.vm.$nextTick();
    checkbox().dispatchEvent(new Event('change'));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('filterChange')?.at(-1)).toEqual([{ dataField: 'title', values: [] }]);
  });

  it('clicking the count badge clears that filter', async () => {
    const wrapper = await mountHeader();
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    (document.body.querySelector('.filter-panel input[type="checkbox"]') as HTMLInputElement).dispatchEvent(new Event('change'));
    await wrapper.vm.$nextTick();
    (document.body.querySelector('.filter-count') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('filterChange')?.at(-1)).toEqual([{ dataField: 'title', values: [] }]);
  });

  it('shows a "Clear selection" button inside an open dropdown once something is selected, and it clears the filter', async () => {
    const wrapper = await mountHeader();
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    (document.body.querySelector('.filter-panel input[type="checkbox"]') as HTMLInputElement).dispatchEvent(new Event('change'));
    await wrapper.vm.$nextTick();
    const clearBtn = document.body.querySelector('.filter-clear') as HTMLElement;
    expect(clearBtn).not.toBeNull();
    clearBtn.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('filterChange')?.at(-1)).toEqual([{ dataField: 'title', values: [] }]);
  });

  it('a click inside the filter-dropdown does not bubble to the document close-listener', async () => {
    const wrapper = await mountHeader();
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    (document.body.querySelector('.filter-dropdown') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.filter-panel')).not.toBeNull();
  });

  it('a click outside the header closes an open filter dropdown', async () => {
    const wrapper = await mountHeader();
    (document.body.querySelectorAll('.filter-toggle')[0] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.filter-panel')).not.toBeNull();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(document.body.querySelector('.filter-panel')).toBeNull();
  });

  it('a click outside the header when nothing is open is a harmless no-op', async () => {
    await mountHeader();
    expect(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
  });

  it('removes the document click listener on unmount', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const wrapper = await mountHeader();
    wrapper.unmount();
    activeWrapper = null;
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
    removeSpy.mockRestore();
  });
});
