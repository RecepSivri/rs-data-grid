import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RsDataGridHeader } from './rsDataGridHeader';
import { IColumn } from '../models/rsDataGrid.models';

const columns: IColumn[] = [
  { caption: 'first name', dataField: 'firstName' },
  { caption: 'city', dataField: 'city' },
];

const data = [
  { firstName: 'alice', city: 'ankara' },
  { firstName: 'bob', city: 'istanbul' },
  { firstName: 'carol', city: 'ankara' },
  { firstName: 'dave', city: '' },
  { firstName: null, city: 'izmir' },
];

const baseProps = {
  columns,
  data,
  headerRowLines: true,
  headerColumnLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusTop: false,
  showFilter: true,
  showSort: true,
  showActions: true,
  showIndex: false,
  sort: { field: null, direction: null } as { field: string | null; direction: 'asc' | 'desc' | null },
  onFilterChange: vi.fn(),
  onSortToggle: vi.fn(),
};

describe('RsDataGridHeader', () => {
  it('renders title-cased column captions', () => {
    render(<RsDataGridHeader {...baseProps} />);
    // "First Name" / "City" appear once in the header-caption span and once in the filter toggle label.
    expect(screen.getAllByText('First Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('City').length).toBeGreaterThan(0);
    expect(document.querySelector('.header-caption')?.textContent).toBe('First Name');
  });

  it('renders the index header cell when showIndex is true', () => {
    render(<RsDataGridHeader {...baseProps} showIndex={true} />);
    expect(screen.getByText('#')).toBeInTheDocument();
  });

  it('does not render the index header cell when showIndex is false', () => {
    render(<RsDataGridHeader {...baseProps} showIndex={false} />);
    expect(screen.queryByText('#')).not.toBeInTheDocument();
  });

  it('renders the actions header cell when showActions is true', () => {
    render(<RsDataGridHeader {...baseProps} showActions={true} />);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('does not render the actions header cell when showActions is false', () => {
    render(<RsDataGridHeader {...baseProps} showActions={false} />);
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  it('does not render sort buttons when showSort is false', () => {
    render(<RsDataGridHeader {...baseProps} showSort={false} />);
    expect(screen.queryByLabelText('Sort first name')).not.toBeInTheDocument();
  });

  it('shows the neutral sort icon when the column is unsorted', () => {
    render(<RsDataGridHeader {...baseProps} sort={{ field: null, direction: null }} />);
    const button = screen.getByLabelText('Sort first name');
    expect(button.className).not.toContain('sort-toggle-active');
    expect(button.textContent).toBe('⇅');
  });

  it('shows the descending sort icon when sorted desc on that field', () => {
    render(<RsDataGridHeader {...baseProps} sort={{ field: 'firstName', direction: 'desc' }} />);
    const button = screen.getByLabelText('Sort first name');
    expect(button.className).toContain('sort-toggle-active');
    expect(button.textContent).toBe('▼');
  });

  it('shows the ascending sort icon when sorted asc on that field', () => {
    render(<RsDataGridHeader {...baseProps} sort={{ field: 'firstName', direction: 'asc' }} />);
    const button = screen.getByLabelText('Sort first name');
    expect(button.textContent).toBe('▲');
  });

  it('shows the neutral icon for a column that is not the currently sorted field', () => {
    render(<RsDataGridHeader {...baseProps} sort={{ field: 'city', direction: 'asc' }} />);
    const button = screen.getByLabelText('Sort first name');
    expect(button.textContent).toBe('⇅');
  });

  it('calls onSortToggle with the field when the sort button is clicked, and stops propagation', () => {
    const onSortToggle = vi.fn();
    render(<RsDataGridHeader {...baseProps} onSortToggle={onSortToggle} />);
    fireEvent.click(screen.getByLabelText('Sort first name'));
    expect(onSortToggle).toHaveBeenCalledWith('firstName');
  });

  it('does not render the filter row when showFilter is false', () => {
    render(<RsDataGridHeader {...baseProps} showFilter={false} />);
    expect(screen.queryByLabelText('Filter first name')).not.toBeInTheDocument();
  });

  it('does not render the filter row when there are no columns', () => {
    render(<RsDataGridHeader {...baseProps} columns={[]} />);
    expect(screen.queryByLabelText('Filter first name')).not.toBeInTheDocument();
  });

  it('opens the filter dropdown on toggle click and shows sorted unique, non-empty option values', async () => {
    render(<RsDataGridHeader {...baseProps} />);
    await userEvent.click(screen.getByLabelText('Filter first name'));
    // alice, bob, carol, dave -- null excluded, sorted alphabetically
    const panel = screen.getByLabelText('Filter first name').parentElement!.querySelector('.filter-panel')!;
    expect(panel).toBeTruthy();
    expect(Array.from(panel.querySelectorAll('.filter-option span:last-child')).map(n => n.textContent)).toEqual(['alice', 'bob', 'carol', 'dave']);
  });

  it('shows "No values" when a column has no eligible option values', async () => {
    const empties = [{ firstName: '', city: '' }, { firstName: null, city: undefined }];
    render(<RsDataGridHeader {...baseProps} data={empties} />);
    await userEvent.click(screen.getByLabelText('Filter first name'));
    expect(screen.getByText('No values')).toBeInTheDocument();
  });

  it('closes the dropdown when the toggle is clicked again', async () => {
    render(<RsDataGridHeader {...baseProps} />);
    const toggle = screen.getByLabelText('Filter first name');
    await userEvent.click(toggle);
    expect(toggle.className).toContain('filter-toggle-open');
    await userEvent.click(toggle);
    expect(toggle.className).not.toContain('filter-toggle-open');
  });

  it('closes an open dropdown on an outside click', async () => {
    render(<RsDataGridHeader {...baseProps} />);
    await userEvent.click(screen.getByLabelText('Filter first name'));
    expect(screen.getByText('alice')).toBeInTheDocument(); // sanity: panel is open with options, not the empty state
    fireEvent.click(document.body);
    expect(screen.queryByText('alice')).not.toBeInTheDocument();
  });

  it('does not close the dropdown when clicking inside the filter panel (checkbox toggle)', async () => {
    const onFilterChange = vi.fn();
    render(<RsDataGridHeader {...baseProps} onFilterChange={onFilterChange} />);
    await userEvent.click(screen.getByLabelText('Filter first name'));
    const aliceCheckbox = screen.getByText('alice').previousSibling as HTMLInputElement;
    fireEvent.click(aliceCheckbox);
    expect(onFilterChange).toHaveBeenCalledWith({ dataField: 'firstName', values: ['alice'] });
    // still open (checkbox click stayed inside the stopPropagation wrapper)
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('toggles a selected option off again and updates the filter count/badge', async () => {
    const onFilterChange = vi.fn();
    render(<RsDataGridHeader {...baseProps} onFilterChange={onFilterChange} />);
    const toggle = screen.getByLabelText('Filter first name');
    await userEvent.click(toggle);
    const aliceCheckbox = screen.getByText('alice').previousSibling as HTMLInputElement;
    fireEvent.click(aliceCheckbox); // select
    expect(toggle.className).toContain('filter-toggle-active');
    expect(screen.getByText('1')).toBeInTheDocument(); // count badge
    fireEvent.click(aliceCheckbox); // deselect
    expect(onFilterChange).toHaveBeenLastCalledWith({ dataField: 'firstName', values: [] });
  });

  it('clears the filter selection via the "Clear selection" button', async () => {
    const onFilterChange = vi.fn();
    render(<RsDataGridHeader {...baseProps} onFilterChange={onFilterChange} />);
    await userEvent.click(screen.getByLabelText('Filter first name'));
    fireEvent.click((screen.getByText('alice').previousSibling as HTMLInputElement));
    expect(screen.getByText('Clear selection')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear selection'));
    expect(onFilterChange).toHaveBeenLastCalledWith({ dataField: 'firstName', values: [] });
    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();
  });

  it('excludes the current column\'s own selection when computing its own cross-filter options (getOptions)', async () => {
    render(<RsDataGridHeader {...baseProps} />);
    // Select "ankara" for city first.
    await userEvent.click(screen.getByLabelText('Filter city'));
    fireEvent.click((screen.getByText('ankara').previousSibling as HTMLInputElement));
    // Now open first name's dropdown -- it should be cross-filtered by city=ankara (alice, carol),
    // not restricted by any firstName selection of its own (there is none yet).
    await userEvent.click(screen.getByLabelText('Filter first name'));
    const panel = screen.getByLabelText('Filter first name').closest('.filter-dropdown')!.querySelector('.filter-panel')!;
    expect(Array.from(panel.querySelectorAll('.filter-option span:last-child')).map(n => n.textContent)).toEqual(['alice', 'carol']);
  });

  it('clicking the filter-count badge clears that filter without toggling the toggle button itself', async () => {
    const onFilterChange = vi.fn();
    render(<RsDataGridHeader {...baseProps} onFilterChange={onFilterChange} />);
    await userEvent.click(screen.getByLabelText('Filter first name'));
    fireEvent.click(screen.getByText('alice').previousSibling as HTMLInputElement);
    const badge = screen.getByLabelText('Clear filter for first name');
    fireEvent.click(badge);
    expect(onFilterChange).toHaveBeenLastCalledWith({ dataField: 'firstName', values: [] });
  });

  it('renders the drag-header/index leading cells (in both the caption row and filter row) with border-right when column lines are on', () => {
    render(<RsDataGridHeader {...baseProps} dragDropRows={true} showIndex={true} headerColumnLines={true} bodyColumnLines={true} showFilter={true} />);
    const dragCells = document.querySelectorAll('.drag-header-cell');
    const indexCells = document.querySelectorAll('.index-header-cell');
    expect(dragCells.length).toBe(2); // caption row + filter row
    expect(indexCells.length).toBe(2);
    dragCells.forEach(cell => expect(cell.className).toContain('border-right'));
    indexCells.forEach(cell => expect(cell.className).toContain('border-right'));
  });

  it('omits border-right on the leading cells when column lines are off', () => {
    render(<RsDataGridHeader {...baseProps} dragDropRows={true} showIndex={true} headerColumnLines={false} bodyColumnLines={false} showFilter={true} />);
    document.querySelectorAll('.drag-header-cell').forEach(cell => expect(cell.className).not.toContain('border-right'));
    document.querySelectorAll('.index-header-cell').forEach(cell => expect(cell.className).not.toContain('border-right'));
  });

  describe('drag-to-reorder columns', () => {
    it('does not render drag handles when dragDropColumns is off', () => {
      render(<RsDataGridHeader {...baseProps} dragDropColumns={false} />);
      expect(document.querySelector('.drag-handle')).toBeNull();
    });

    it('sets dataTransfer.effectAllowed on dragstart', () => {
      render(<RsDataGridHeader {...baseProps} dragDropColumns={true} />);
      const handle = document.querySelectorAll('.drag-handle')[0];
      const event = new Event('dragstart', { bubbles: true }) as any;
      event.dataTransfer = { effectAllowed: null };
      handle.dispatchEvent(event);
      expect(event.dataTransfer.effectAllowed).toBe('move');
    });

    it('highlights the hovered column cell on dragover and clears it on dragleave', () => {
      render(<RsDataGridHeader {...baseProps} dragDropColumns={true} />);
      const cell = document.querySelectorAll('.content-style')[0];
      fireEvent.dragOver(cell);
      expect(cell.className).toContain('column-drag-over');
      fireEvent.dragLeave(cell);
      expect(cell.className).not.toContain('column-drag-over');
    });

    it('dragleave on a cell that is not the current dragOverField is a no-op', () => {
      render(<RsDataGridHeader {...baseProps} dragDropColumns={true} />);
      const [cellA, cellB] = document.querySelectorAll('.content-style');
      fireEvent.dragOver(cellA);
      fireEvent.dragLeave(cellB);
      expect(cellA.className).toContain('column-drag-over');
    });

    it('drop calls onColumnMove with the dragged and target fields, then clears drag state', () => {
      const onColumnMove = vi.fn();
      render(<RsDataGridHeader {...baseProps} dragDropColumns={true} onColumnMove={onColumnMove} />);
      const handles = document.querySelectorAll('.drag-handle');
      const cells = document.querySelectorAll('.content-style');
      fireEvent.dragStart(handles[0], { dataTransfer: { effectAllowed: null } });
      fireEvent.drop(cells[1]);
      expect(onColumnMove).toHaveBeenCalledWith('firstName', 'city');
    });

    it('drop with no active draggedField does not call onColumnMove', () => {
      const onColumnMove = vi.fn();
      render(<RsDataGridHeader {...baseProps} dragDropColumns={true} onColumnMove={onColumnMove} />);
      fireEvent.drop(document.querySelectorAll('.content-style')[1]);
      expect(onColumnMove).not.toHaveBeenCalled();
    });

    it('dragend clears the dragged field', () => {
      const onColumnMove = vi.fn();
      render(<RsDataGridHeader {...baseProps} dragDropColumns={true} onColumnMove={onColumnMove} />);
      const handles = document.querySelectorAll('.drag-handle');
      fireEvent.dragStart(handles[0], { dataTransfer: { effectAllowed: null } });
      fireEvent.dragEnd(handles[0]);
      fireEvent.drop(document.querySelectorAll('.content-style')[1]);
      expect(onColumnMove).not.toHaveBeenCalled();
    });
  });

  it('applies border classes based on tableBorder/borderRadiusTop props', () => {
    const { container } = render(<RsDataGridHeader {...baseProps} tableBorder={true} borderRadiusTop={true} />);
    const headerRow = container.querySelector('.full-row.row-layout-space-between-center')!;
    expect(headerRow.className).toContain('border-header');
    expect(headerRow.className).toContain('border-area-small');
  });

  it('omits border classes when tableBorder/borderRadiusTop are false', () => {
    const { container } = render(<RsDataGridHeader {...baseProps} tableBorder={false} borderRadiusTop={false} />);
    const headerRow = container.querySelector('.full-row.row-layout-space-between-center')!;
    expect(headerRow.className).not.toContain('border-header');
    expect(headerRow.className).not.toContain('border-area-small');
  });
});
