import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditRowDialog } from './EditRowDialog';
import { IColumn } from '../models/rsDataGrid.models';

describe('EditRowDialog', () => {
  it('renders nothing when closed', () => {
    render(<EditRowDialog open={false} row={{ a: 1 }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Edit row')).not.toBeInTheDocument();
  });

  it('shows "Edit row" title and fields from the row keys, prefilled with stringified values', () => {
    render(<EditRowDialog open={true} row={{ name: 'Alice', age: 30 }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Edit row')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('age')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });

  it('treats null/undefined row values as empty strings', () => {
    render(<EditRowDialog open={true} row={{ a: null, b: undefined }} onSave={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.map(i => i.value)).toEqual(['', '']);
  });

  it('shows "Add row" title and fields from columns (empty values) when row is not provided', () => {
    const columns: IColumn[] = [
      { caption: 'First Name', dataField: 'firstName' },
      { caption: 'Last Name', dataField: 'lastName' },
    ];
    render(<EditRowDialog open={true} columns={columns} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Add row')).toBeInTheDocument();
    expect(screen.getByText('firstName')).toBeInTheDocument();
    expect(screen.getByText('lastName')).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.every(i => i.value === '')).toBe(true);
  });

  it('uses no fields (add mode) when neither row nor columns are provided', () => {
    render(<EditRowDialog open={true} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Add row')).toBeInTheDocument();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('updates the field value on input change', () => {
    render(<EditRowDialog open={true} row={{ name: 'Alice' }} onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByDisplayValue('Alice');
    fireEvent.change(input, { target: { value: 'Bob' } });
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
  });

  it('calls onSave with the row spread and edited field values when editing', () => {
    const onSave = vi.fn();
    render(<EditRowDialog open={true} row={{ id: 1, name: 'Alice' }} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Zed' } });
    fireEvent.click(screen.getByText('Save'));
    // Every own key of the row becomes an editable field, so the saved id
    // comes back through editableRow as its stringified form.
    expect(onSave).toHaveBeenCalledWith({ id: '1', name: 'Zed' });
  });

  it('calls onSave with the field values built from columns when adding', () => {
    const onSave = vi.fn();
    const columns: IColumn[] = [{ caption: 'City', dataField: 'city' }];
    render(<EditRowDialog open={true} columns={columns} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ankara' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ city: 'Ankara' });
  });

  it('calls onCancel when the Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<EditRowDialog open={true} row={{ a: 1 }} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { baseElement } = render(<EditRowDialog open={true} row={{ a: 1 }} onSave={vi.fn()} onCancel={onCancel} />);
    const backdrop = baseElement.querySelector('.MuiBackdrop-root') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('recomputes fields when the row prop changes while open', () => {
    const { rerender } = render(<EditRowDialog open={true} row={{ a: 1 }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('a')).toBeInTheDocument();
    rerender(<EditRowDialog open={true} row={{ b: 2 }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('a')).not.toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('does not recompute fields while closed', () => {
    const { rerender } = render(<EditRowDialog open={false} row={{ a: 1 }} onSave={vi.fn()} onCancel={vi.fn()} />);
    rerender(<EditRowDialog open={false} row={{ b: 2 }} onSave={vi.fn()} onCancel={vi.fn()} />);
    rerender(<EditRowDialog open={true} row={{ b: 2 }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('b')).toBeInTheDocument();
  });
});
