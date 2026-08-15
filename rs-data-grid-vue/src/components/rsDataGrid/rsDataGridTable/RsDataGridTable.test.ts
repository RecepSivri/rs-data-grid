import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import RsDataGridTable from './RsDataGridTable.vue';

const columns = [
  { caption: 'title', dataField: 'title' },
  { caption: 'poster', dataField: 'poster' },
];

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  columns,
  data: [
    { title: 'Movie A', poster: 'https://example.com/a.png' },
    { title: 'Movie B', poster: 'https://example.com/b.png' },
  ],
  bodyRowLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusBottom: false,
  diagonalRow: false,
  showActions: true,
  showIndex: false,
  dragDropRows: false,
  indexOffset: 0,
  gridMode: 'popup',
  onRequestConfirm: vi.fn().mockResolvedValue(true),
  ...overrides,
});

let activeWrapper: VueWrapper | null = null;

async function mountTable(props: Record<string, unknown> = {}) {
  activeWrapper = mount(RsDataGridTable, { props: baseProps(props), attachTo: document.body });
  await activeWrapper.vm.$nextTick();
  return activeWrapper;
}

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = null;
  document.body.innerHTML = '';
});

const dataRows = () => Array.from(document.body.querySelectorAll('.column-layout > .full-row'));
const setInput = (el: Element, value: string) => {
  (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event('input'));
};

describe('display rows (popup mode)', () => {
  it('renders a cell per column with the row value as text and title attribute', async () => {
    await mountTable({ data: [{ title: 'Solo', poster: 'not-an-image' }] });
    const cell = dataRows()[0].querySelectorAll('.section-style')[0];
    expect(cell.textContent).toBe('Solo');
    expect(cell.getAttribute('title')).toBe('Solo');
  });

  it('renders an <img> thumbnail (no title) for image-URL values', async () => {
    await mountTable({ data: [{ title: 'Solo', poster: 'https://example.com/x.jpg' }] });
    const posterCell = dataRows()[0].querySelectorAll('.section-style')[1];
    const img = posterCell.querySelector('img.cell-thumbnail');
    expect(img?.getAttribute('src')).toBe('https://example.com/x.jpg');
    expect(posterCell.hasAttribute('title')).toBe(false);
  });

  it('shows an index cell with the offset applied when showIndex is on', async () => {
    await mountTable({ showIndex: true, indexOffset: 10 });
    expect(dataRows()[0].querySelector('.index-cell')?.textContent).toBe('11');
  });

  it('omits the actions cell when showActions is off', async () => {
    await mountTable({ showActions: false });
    expect(dataRows()[0].querySelector('.actions-cell')).toBeNull();
  });

  it('Edit calls onRowEdit directly in popup mode (no inline editing state)', async () => {
    const wrapper = await mountTable({ gridMode: 'popup' });
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('rowEdit')?.[0]).toEqual([baseProps().data[0]]);
    expect(dataRows()[0].querySelector('.inline-edit-input')).toBeNull();
  });

  it('Delete emits rowDelete with the row', async () => {
    const props = baseProps();
    const wrapper = await mountTable(props);
    (dataRows()[0].querySelector('.row-action-delete') as HTMLElement).click();
    expect(wrapper.emitted('rowDelete')?.[0]).toEqual([props.data[0]]);
  });
});

describe('row-style classes', () => {
  it('marks the last row row-style-bottom when tableBorder is on', async () => {
    await mountTable({ tableBorder: true, bodyRowLines: false });
    const rows = dataRows();
    expect(rows[rows.length - 1].className).toContain('row-style-bottom');
  });

  it('marks non-last rows row-style-bottom when bodyRowLines is on', async () => {
    await mountTable({ tableBorder: false, bodyRowLines: true });
    expect(dataRows()[0].className).toContain('row-style-bottom');
  });

  it('omits row-style-bottom when both tableBorder and bodyRowLines are off', async () => {
    await mountTable({ tableBorder: false, bodyRowLines: false });
    const rows = dataRows();
    expect(rows[rows.length - 1].className).not.toContain('row-style-bottom');
  });

  it('adds border-area-small to the last row when borderRadiusBottom is on', async () => {
    await mountTable({ borderRadiusBottom: true });
    const rows = dataRows();
    expect(rows[rows.length - 1].className).toContain('border-area-small');
    expect(rows[0].className).not.toContain('border-area-small');
  });

  it('alternates row-background on odd rows when diagonalRow is on', async () => {
    await mountTable({ diagonalRow: true });
    const rows = dataRows();
    expect(rows[0].className).not.toContain('row-background');
    expect(rows[1].className).toContain('row-background');
  });

  it('never adds row-background when diagonalRow is off', async () => {
    await mountTable({ diagonalRow: false });
    dataRows().forEach(row => expect(row.className).not.toContain('row-background'));
  });
});

describe('row mode (inline single-row editing)', () => {
  it('Edit switches that row into inline-editing with prefilled inputs', async () => {
    const wrapper = await mountTable({ gridMode: 'row' });
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const inputs = dataRows()[0].querySelectorAll('.inline-edit-input');
    expect(inputs.length).toBe(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('Movie A');
  });

  it('typing updates the draft', async () => {
    const wrapper = await mountTable({ gridMode: 'row' });
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    setInput(input, 'Edited title');
    await wrapper.vm.$nextTick();
    expect((input as HTMLInputElement).value).toBe('Edited title');
  });

  it('stringifies null/undefined field values as empty strings when entering edit mode', async () => {
    const wrapper = await mountTable({ gridMode: 'row', data: [{ title: null, poster: undefined }] });
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const inputs = dataRows()[0].querySelectorAll('.inline-edit-input');
    expect((inputs[0] as HTMLInputElement).value).toBe('');
    expect((inputs[1] as HTMLInputElement).value).toBe('');
  });

  it('re-entering edit mode on a second row clears any previously-held draft content', async () => {
    const wrapper = await mountTable({ gridMode: 'row' });
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    setInput(dataRows()[0].querySelectorAll('.inline-edit-input')[0], 'Left over');
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelectorAll('.row-action-button')[1] as HTMLElement).click(); // Cancel
    await wrapper.vm.$nextTick();
    (dataRows()[1].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    const inputs = dataRows()[1].querySelectorAll('.inline-edit-input');
    expect((inputs[0] as HTMLInputElement).value).toBe('Movie B');
  });

  it('Cancel exits editing mode without saving', async () => {
    const wrapper = await mountTable({ gridMode: 'row' });
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelectorAll('.row-action-button')[1] as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(dataRows()[0].querySelector('.inline-edit-input')).toBeNull();
  });

  it('Save asks for confirmation, then emits the merged row via batchRowSave', async () => {
    const onRequestConfirm = vi.fn().mockResolvedValue(true);
    const props = baseProps({ gridMode: 'row', onRequestConfirm });
    const wrapper = await mountTable(props);
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    setInput(dataRows()[0].querySelectorAll('.inline-edit-input')[0], 'New title');
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelector('.row-action-save') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(onRequestConfirm).toHaveBeenCalledWith('Confirm save', expect.any(String));
    expect(wrapper.emitted('batchRowSave')?.[0]).toEqual([
      { original: props.data[0], updated: { title: 'New title', poster: 'https://example.com/a.png' } },
    ]);
    expect(dataRows()[0].querySelector('.inline-edit-input')).toBeNull();
  });

  it('Save does nothing further when the confirmation is declined', async () => {
    const onRequestConfirm = vi.fn().mockResolvedValue(false);
    const wrapper = await mountTable({ gridMode: 'row', onRequestConfirm });
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-delete)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelector('.row-action-save') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('batchRowSave')).toBeUndefined();
    expect(dataRows()[0].querySelector('.inline-edit-input')).not.toBeNull();
  });
});

describe('batch mode', () => {
  it('every row starts pre-filled and editable', async () => {
    await mountTable({ gridMode: 'batch' });
    expect((dataRows()[0].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement).value).toBe('Movie A');
    expect((dataRows()[1].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement).value).toBe('Movie B');
  });

  it('typing mutates the batch draft directly', async () => {
    const wrapper = await mountTable({ gridMode: 'batch' });
    const input = dataRows()[0].querySelectorAll('.inline-edit-input')[0];
    setInput(input, 'Changed');
    await wrapper.vm.$nextTick();
    expect((input as HTMLInputElement).value).toBe('Changed');
  });

  it('Delete in batch mode emits rowDelete', async () => {
    const props = baseProps({ gridMode: 'batch' });
    const wrapper = await mountTable(props);
    (dataRows()[0].querySelector('.row-action-delete') as HTMLElement).click();
    expect(wrapper.emitted('rowDelete')?.[0]).toEqual([props.data[0]]);
  });

  it('preserves in-progress drafts across a re-render for rows that persist by reference', async () => {
    const props = baseProps({ gridMode: 'batch' });
    const wrapper = await mountTable(props);
    setInput(dataRows()[0].querySelectorAll('.inline-edit-input')[0], 'Still editing');
    await wrapper.vm.$nextTick();
    await wrapper.setProps({ ...props });
    expect((dataRows()[0].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement).value).toBe('Still editing');
  });

  it('gives a fresh draft to a row that has never been seen before', async () => {
    const props = baseProps({ gridMode: 'batch' });
    const wrapper = await mountTable(props);
    const newRow = { title: 'Movie C', poster: 'https://example.com/c.png' };
    await wrapper.setProps({ ...props, data: [...(props.data as any[]), newRow] });
    expect((dataRows()[2].querySelectorAll('.inline-edit-input')[0] as HTMLInputElement).value).toBe('Movie C');
  });

  it('addBatchRow appends a blank editable row with its own remove button', async () => {
    const wrapper = await mountTable({ gridMode: 'batch' });
    (wrapper.vm as any).addBatchRow();
    await wrapper.vm.$nextTick();
    const rows = dataRows();
    expect(rows.length).toBe(3);
    const newRowInputs = rows[2].querySelectorAll('.inline-edit-input');
    expect((newRowInputs[0] as HTMLInputElement).value).toBe('');
  });

  it('removing a batch-new row via its own delete button drops just that one', async () => {
    const wrapper = await mountTable({ gridMode: 'batch', data: [] });
    (wrapper.vm as any).addBatchRow();
    (wrapper.vm as any).addBatchRow();
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelector('.row-action-delete') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(1);
  });

  it('saveBatch collects only dirty existing rows plus every new-batch row, then clears new rows', async () => {
    const props = baseProps({ gridMode: 'batch' });
    const wrapper = await mountTable(props);
    setInput(dataRows()[0].querySelectorAll('.inline-edit-input')[0], 'Changed title');
    await wrapper.vm.$nextTick();
    (wrapper.vm as any).addBatchRow();
    await wrapper.vm.$nextTick();
    setInput(dataRows()[2].querySelectorAll('.inline-edit-input')[0], 'Fresh row');
    await wrapper.vm.$nextTick();

    (wrapper.vm as any).saveBatch();

    expect(wrapper.emitted('batchCommit')?.[0]).toEqual([
      {
        added: [{ title: 'Fresh row', poster: '' }],
        updated: [{ original: props.data[0], updated: { title: 'Changed title', poster: 'https://example.com/a.png' } }],
      },
    ]);
  });

  it('saveBatch treats unmodified rows as not dirty', async () => {
    const wrapper = await mountTable({ gridMode: 'batch' });
    (wrapper.vm as any).saveBatch();
    expect(wrapper.emitted('batchCommit')?.[0]).toEqual([{ added: [], updated: [] }]);
  });

  it('saveBatch skips rows with no known draft (e.g. called outside batch mode)', async () => {
    const wrapper = await mountTable({ gridMode: 'popup' });
    (wrapper.vm as any).saveBatch();
    expect(wrapper.emitted('batchCommit')?.[0]).toEqual([{ added: [], updated: [] }]);
  });

  it('saveBatch treats a null-valued field, unedited, as not dirty', async () => {
    const wrapper = await mountTable({ gridMode: 'batch', data: [{ title: null, poster: 'https://example.com/a.png' }] });
    (wrapper.vm as any).saveBatch();
    expect(wrapper.emitted('batchCommit')?.[0]).toEqual([{ added: [], updated: [] }]);
  });

  it('a column added after a batch draft was cached falls back to an empty value for it', async () => {
    const oneColumn = [columns[0]];
    const props = baseProps({ gridMode: 'batch', columns: oneColumn, data: [{ title: 'ada' }] });
    const wrapper = await mountTable(props);
    await wrapper.setProps({ ...props, columns });
    const posterInput = dataRows()[0].querySelectorAll('.inline-edit-input')[1];
    expect((posterInput as HTMLInputElement).value).toBe('');
  });
});

describe('add row', () => {
  it('startAddingRow renders a blank add-row above the data with Save/Cancel', async () => {
    const wrapper = await mountTable();
    (wrapper.vm as any).startAddingRow();
    await wrapper.vm.$nextTick();
    const rows = dataRows();
    expect(rows.length).toBe(3);
    const inputs = rows[0].querySelectorAll('.inline-edit-input');
    expect(inputs.length).toBe(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('');
  });

  it('Cancel removes the add-row', async () => {
    const wrapper = await mountTable();
    (wrapper.vm as any).startAddingRow();
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelector('.row-action-button:not(.row-action-save)') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    expect(dataRows().length).toBe(2);
  });

  it('Save asks for confirmation, then emits the draft via batchRowAdd', async () => {
    const onRequestConfirm = vi.fn().mockResolvedValue(true);
    const wrapper = await mountTable({ onRequestConfirm });
    (wrapper.vm as any).startAddingRow();
    await wrapper.vm.$nextTick();
    setInput(dataRows()[0].querySelectorAll('.inline-edit-input')[0], 'New movie');
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelector('.row-action-save') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(onRequestConfirm).toHaveBeenCalledWith('Confirm add', expect.any(String));
    expect(wrapper.emitted('batchRowAdd')?.[0]).toEqual([{ title: 'New movie', poster: '' }]);
    expect(dataRows().length).toBe(2);
  });

  it('Save does nothing further when declined', async () => {
    const onRequestConfirm = vi.fn().mockResolvedValue(false);
    const wrapper = await mountTable({ onRequestConfirm });
    (wrapper.vm as any).startAddingRow();
    await wrapper.vm.$nextTick();
    (dataRows()[0].querySelector('.row-action-save') as HTMLElement).click();
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('batchRowAdd')).toBeUndefined();
    expect(dataRows().length).toBe(3);
  });

  it('omits Save/Cancel actions when showActions is off', async () => {
    const wrapper = await mountTable({ showActions: false });
    (wrapper.vm as any).startAddingRow();
    await wrapper.vm.$nextTick();
    expect(dataRows()[0].querySelector('.actions-cell')).toBeNull();
  });

  it('shows drag/index leading cells, gated by bodyColumnLines', async () => {
    const wrapper = await mountTable({ dragDropRows: true, showIndex: true, bodyColumnLines: true });
    (wrapper.vm as any).startAddingRow();
    await wrapper.vm.$nextTick();
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell')?.className).toContain('border-right');
    expect(row.querySelector('.index-cell')?.className).toContain('border-right');
  });

  it('omits border-right on add-row leading cells when bodyColumnLines is off', async () => {
    const wrapper = await mountTable({ dragDropRows: true, showIndex: true, bodyColumnLines: false });
    (wrapper.vm as any).startAddingRow();
    await wrapper.vm.$nextTick();
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell')?.className).not.toContain('border-right');
    expect(row.querySelector('.index-cell')?.className).not.toContain('border-right');
  });
});

describe('leading drag/index cells on data rows', () => {
  it('shows border-right on data-row leading cells when bodyColumnLines is on', async () => {
    await mountTable({ dragDropRows: true, showIndex: true, bodyColumnLines: true });
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell')?.className).toContain('border-right');
    expect(row.querySelector('.index-cell')?.className).toContain('border-right');
  });

  it('omits border-right on data-row leading cells when bodyColumnLines is off', async () => {
    await mountTable({ dragDropRows: true, showIndex: true, bodyColumnLines: false });
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell')?.className).not.toContain('border-right');
    expect(row.querySelector('.index-cell')?.className).not.toContain('border-right');
  });
});

describe('batch-new row leading cells', () => {
  it('shows border-right when bodyColumnLines is on, omits when off', async () => {
    const wrapper = await mountTable({ gridMode: 'batch', data: [], dragDropRows: true, showIndex: true, bodyColumnLines: true });
    (wrapper.vm as any).addBatchRow();
    await wrapper.vm.$nextTick();
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell')?.className).toContain('border-right');
    expect(row.querySelector('.index-cell')?.className).toContain('border-right');
  });

  it('omits border-right when bodyColumnLines is off', async () => {
    const wrapper = await mountTable({ gridMode: 'batch', data: [], dragDropRows: true, showIndex: true, bodyColumnLines: false });
    (wrapper.vm as any).addBatchRow();
    await wrapper.vm.$nextTick();
    const row = dataRows()[0];
    expect(row.querySelector('.drag-cell')?.className).not.toContain('border-right');
    expect(row.querySelector('.index-cell')?.className).not.toContain('border-right');
  });

  it('a column added after addBatchRow falls back to an empty value for it on the new row', async () => {
    const props = baseProps({ gridMode: 'batch', data: [], columns: [columns[0]] });
    const wrapper = await mountTable(props);
    (wrapper.vm as any).addBatchRow();
    await wrapper.vm.$nextTick();
    await wrapper.setProps({ ...props, columns });
    const posterInput = dataRows()[0].querySelectorAll('.inline-edit-input')[1];
    expect((posterInput as HTMLInputElement).value).toBe('');
  });
});

describe('drag-to-reorder rows', () => {
  it('sets dataTransfer.effectAllowed on dragstart when available, tolerates its absence', async () => {
    await mountTable({ dragDropRows: true });
    const handle = dataRows()[0].querySelector('.drag-handle') as HTMLElement;
    const event = new Event('dragstart');
    (event as any).dataTransfer = { effectAllowed: null };
    handle.dispatchEvent(event);
    expect((event as any).dataTransfer.effectAllowed).toBe('move');
    expect(() => handle.dispatchEvent(new Event('dragstart'))).not.toThrow();
  });

  it('highlights the hovered row on dragover, clears on dragleave (no-op if not the current target)', async () => {
    const wrapper = await mountTable({ dragDropRows: true });
    const [rowA, rowB] = dataRows();
    rowA.dispatchEvent(new Event('dragover'));
    await wrapper.vm.$nextTick();
    expect(rowA.className).toContain('row-drag-over');
    rowB.dispatchEvent(new Event('dragleave'));
    await wrapper.vm.$nextTick();
    expect(rowA.className).toContain('row-drag-over');
    rowA.dispatchEvent(new Event('dragleave'));
    await wrapper.vm.$nextTick();
    expect(rowA.className).not.toContain('row-drag-over');
  });

  it('drop calls onRowMove with the dragged and target rows', async () => {
    const props = baseProps({ dragDropRows: true });
    const wrapper = await mountTable(props);
    const handle = dataRows()[0].querySelector('.drag-handle') as HTMLElement;
    handle.dispatchEvent(new Event('dragstart'));
    dataRows()[1].dispatchEvent(new Event('drop'));
    expect(wrapper.emitted('rowMove')?.[0]).toEqual([props.data[0], props.data[1]]);
  });

  it('drop with no active draggedRow does not emit rowMove', async () => {
    const wrapper = await mountTable({ dragDropRows: true });
    dataRows()[1].dispatchEvent(new Event('drop'));
    expect(wrapper.emitted('rowMove')).toBeUndefined();
  });

  it('dragend clears drag state', async () => {
    const wrapper = await mountTable({ dragDropRows: true });
    const handle = dataRows()[0].querySelector('.drag-handle') as HTMLElement;
    handle.dispatchEvent(new Event('dragstart'));
    handle.dispatchEvent(new Event('dragend'));
    await wrapper.vm.$nextTick();
    expect(dataRows()[0].className).not.toContain('row-dragging');
    dataRows()[1].dispatchEvent(new Event('drop'));
    expect(wrapper.emitted('rowMove')).toBeUndefined();
  });

  it('marks the dragged row row-dragging while active', async () => {
    const wrapper = await mountTable({ dragDropRows: true });
    const handle = dataRows()[0].querySelector('.drag-handle') as HTMLElement;
    handle.dispatchEvent(new Event('dragstart'));
    await wrapper.vm.$nextTick();
    expect(dataRows()[0].className).toContain('row-dragging');
  });

  it('when dragDropRows is off, drag handlers are undefined (no-op) on the row', async () => {
    await mountTable({ dragDropRows: false });
    const row = dataRows()[0];
    expect(() => {
      row.dispatchEvent(new Event('dragover'));
      row.dispatchEvent(new Event('dragleave'));
      row.dispatchEvent(new Event('drop'));
    }).not.toThrow();
  });
});
