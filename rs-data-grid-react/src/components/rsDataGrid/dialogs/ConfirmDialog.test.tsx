import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing (dialog content) when closed', () => {
    render(<ConfirmDialog open={false} message="hidden message" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('hidden message')).not.toBeInTheDocument();
  });

  it('renders the default title "Confirm" when no title prop is given', () => {
    render(<ConfirmDialog open={true} message="are you sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('are you sure?')).toBeInTheDocument();
  });

  it('renders a custom title when provided', () => {
    render(<ConfirmDialog open={true} title="Custom title" message="msg" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Custom title')).toBeInTheDocument();
  });

  it('calls onConfirm when the "Yes" button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open={true} message="msg" onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Yes'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the "No" button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open={true} message="msg" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('No'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { baseElement } = render(<ConfirmDialog open={true} message="msg" onConfirm={vi.fn()} onCancel={onCancel} />);
    const backdrop = baseElement.querySelector('.MuiBackdrop-root') as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape is pressed', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open={true} message="msg" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
