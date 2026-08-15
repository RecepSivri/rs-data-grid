import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GridSettingsDialog } from './GridSettingsDialog';
import { IColumn } from '../models/rsDataGrid.models';

const columns: IColumn[] = [
  { caption: 'Title', dataField: 'title' },
  { caption: 'Year', dataField: 'year' },
  { caption: 'Genre', dataField: 'genre' },
];

describe('GridSettingsDialog', () => {
  it('renders nothing when closed', () => {
    render(<GridSettingsDialog open={false} columns={columns} selected={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('Grid Settings')).not.toBeInTheDocument();
  });

  it('shows the title, hint text, and one menu option per column when opened', () => {
    render(<GridSettingsDialog open={true} columns={columns} selected={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Grid Settings')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('Columns'));
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Title')).toBeInTheDocument();
    expect(within(listbox).getByText('Year')).toBeInTheDocument();
    expect(within(listbox).getByText('Genre')).toBeInTheDocument();
  });

  it('omits the "Visible order" section and Clear button when nothing is selected', () => {
    render(<GridSettingsDialog open={true} columns={columns} selected={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('Visible order')).not.toBeInTheDocument();
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('shows the "Visible order" section, drag hint, and one chip per selected field, in order', () => {
    render(<GridSettingsDialog open={true} columns={columns} selected={['year', 'title']} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Visible order')).toBeInTheDocument();
    expect(screen.getByText('Drag to reorder.')).toBeInTheDocument();
    const chips = document.querySelectorAll('.grid-settings-drag-chip');
    expect(Array.from(chips).map(c => c.textContent)).toEqual(['Year', 'Title']);
  });

  it('falls back to the raw field name in a chip when the field is not among the known columns', () => {
    render(<GridSettingsDialog open={true} columns={columns} selected={['unknown']} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getAllByText('unknown').length).toBeGreaterThan(0);
  });

  it('checking a column in the Select calls onChange with it appended', () => {
    const onChange = vi.fn();
    render(<GridSettingsDialog open={true} columns={columns} selected={['title']} onChange={onChange} onClose={vi.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByRole('option', { name: /Year/ }));
    expect(onChange).toHaveBeenCalledWith(['title', 'year']);
  });

  it('unchecking a selected column in the Select calls onChange with it removed', () => {
    const onChange = vi.fn();
    render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year']} onChange={onChange} onClose={vi.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByRole('option', { name: /Title/ }));
    expect(onChange).toHaveBeenCalledWith(['year']);
  });

  it('clicking a chip\'s own delete icon calls onChange with that field removed', () => {
    const onChange = vi.fn();
    render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year']} onChange={onChange} onClose={vi.fn()} />);
    const chip = document.querySelector('.grid-settings-drag-chip') as HTMLElement;
    fireEvent.click(within(chip).getByTestId('CancelIcon'));
    expect(onChange).toHaveBeenCalledWith(['year']);
  });

  it('the Clear button clears the whole selection', () => {
    const onChange = vi.fn();
    render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year']} onChange={onChange} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('the Close button calls onClose', () => {
    const onClose = vi.fn();
    render(<GridSettingsDialog open={true} columns={columns} selected={[]} onChange={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('drag-to-reorder the selected chips', () => {
    it('dragging a chip onto a later one reorders the selection', () => {
      const onChange = vi.fn();
      render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year', 'genre']} onChange={onChange} onClose={vi.fn()} />);
      const chips = document.querySelectorAll('.grid-settings-drag-chip');
      fireEvent.dragStart(chips[0]);
      fireEvent.dragOver(chips[2]);
      fireEvent.drop(chips[2]);
      expect(onChange).toHaveBeenCalledWith(['year', 'genre', 'title']);
    });

    it('dragging a chip onto an earlier one reorders the selection', () => {
      const onChange = vi.fn();
      render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year', 'genre']} onChange={onChange} onClose={vi.fn()} />);
      const chips = document.querySelectorAll('.grid-settings-drag-chip');
      fireEvent.dragStart(chips[2]);
      fireEvent.dragOver(chips[0]);
      fireEvent.drop(chips[0]);
      expect(onChange).toHaveBeenCalledWith(['genre', 'title', 'year']);
    });

    it('dropping a chip onto itself is a no-op', () => {
      const onChange = vi.fn();
      render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year']} onChange={onChange} onClose={vi.fn()} />);
      const chips = document.querySelectorAll('.grid-settings-drag-chip');
      fireEvent.dragStart(chips[0]);
      fireEvent.dragOver(chips[0]);
      fireEvent.drop(chips[0]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('dropping with no active draggedField does not call onChange', () => {
      const onChange = vi.fn();
      render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year']} onChange={onChange} onClose={vi.fn()} />);
      const chips = document.querySelectorAll('.grid-settings-drag-chip');
      fireEvent.drop(chips[1]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('applies the drag-over highlight class on dragover and clears it on dragleave', () => {
      render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year']} onChange={vi.fn()} onClose={vi.fn()} />);
      const chips = document.querySelectorAll('.grid-settings-drag-chip');
      fireEvent.dragOver(chips[1]);
      expect(chips[1].className).toContain('grid-settings-drag-chip-over');
      fireEvent.dragLeave(chips[1]);
      expect(chips[1].className).not.toContain('grid-settings-drag-chip-over');
    });

    it('dragleave on a chip that is not the current dragOverField is a no-op', () => {
      render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year']} onChange={vi.fn()} onClose={vi.fn()} />);
      const chips = document.querySelectorAll('.grid-settings-drag-chip');
      fireEvent.dragOver(chips[0]);
      fireEvent.dragLeave(chips[1]);
      expect(chips[0].className).toContain('grid-settings-drag-chip-over');
    });

    it('dragend clears the dragged field so a later drop is a no-op', () => {
      const onChange = vi.fn();
      render(<GridSettingsDialog open={true} columns={columns} selected={['title', 'year']} onChange={onChange} onClose={vi.fn()} />);
      const chips = document.querySelectorAll('.grid-settings-drag-chip');
      fireEvent.dragStart(chips[0]);
      fireEvent.dragEnd(chips[0]);
      fireEvent.drop(chips[1]);
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
