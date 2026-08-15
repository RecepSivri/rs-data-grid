import { forwardRef, useImperativeHandle } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

const fetchNowMock = vi.fn();

vi.mock('rs-data-grid-react', () => {
  const RsDataGrid = forwardRef((props: any, ref: any) => {
    useImperativeHandle(ref, () => ({ fetchNow: fetchNowMock }));
    return (
      <div
        className="rs-data-grid-stub"
        data-props={JSON.stringify(props)}
        onClick={() => {
          props.onRowAdd();
          props.onRowEdit();
          props.onRowDelete();
          props.onBatchSave();
        }}
      />
    );
  });
  return { RsDataGrid };
});

const { default: App } = await import('./App');

const stubProps = () => JSON.parse((document.querySelector('.rs-data-grid-stub') as HTMLElement).dataset.props!);

afterEach(() => {
  vi.clearAllMocks();
});

describe('gridConfig', () => {
  it('falls back to the built-in defaultGridConfig when no gridConfig prop is given', () => {
    render(<App />);
    expect(stubProps().fetchUrl).toContain('gist.githubusercontent.com');
    expect(stubProps().gridMode).toBe('popup');
  });

  it('uses the provided gridConfig prop instead of the default', () => {
    render(<App gridConfig={{ theme: 'dark', dataSource: [{ id: 1 }], gridMode: 'batch' }} />);
    expect(stubProps().dataSource).toEqual([{ id: 1 }]);
    expect(stubProps().gridMode).toBe('batch');
  });
});

describe('background style', () => {
  it('renders a light background for the light theme', () => {
    const { container } = render(<App gridConfig={{ theme: 'light', dataSource: [] }} />);
    expect((container.firstChild as HTMLElement).style.background).toBe('rgb(255, 255, 255)');
  });

  it('renders a dark background for the dark theme', () => {
    const { container } = render(<App gridConfig={{ theme: 'dark', dataSource: [] }} />);
    expect((container.firstChild as HTMLElement).style.background).toBe('rgb(28, 30, 33)');
  });
});

describe('fetchNonce -> imperative fetchNow', () => {
  it('does not call fetchNow when fetchNonce is undefined', () => {
    render(<App gridConfig={{ dataSource: [] }} />);
    expect(fetchNowMock).not.toHaveBeenCalled();
  });

  it('does not call fetchNow on the first defined fetchNonce (swallowed by design)', () => {
    const { rerender } = render(<App gridConfig={{ dataSource: [] }} />);
    rerender(<App gridConfig={{ dataSource: [] }} fetchNonce={1} />);
    expect(fetchNowMock).not.toHaveBeenCalled();
  });

  it('calls fetchNow on the next fetchNonce change after the first', () => {
    const { rerender } = render(<App gridConfig={{ dataSource: [] }} fetchNonce={1} />);
    rerender(<App gridConfig={{ dataSource: [] }} fetchNonce={2} />);
    expect(fetchNowMock).toHaveBeenCalledTimes(1);
    rerender(<App gridConfig={{ dataSource: [] }} fetchNonce={3} />);
    expect(fetchNowMock).toHaveBeenCalledTimes(2);
  });
});

describe('event forwarding', () => {
  it('forwards onRowAdd/onRowEdit/onRowDelete/onBatchSave straight through to RsDataGrid', () => {
    const onRowAdd = vi.fn();
    const onRowEdit = vi.fn();
    const onRowDelete = vi.fn();
    const onBatchSave = vi.fn();
    const { container } = render(
      <App gridConfig={{ dataSource: [] }} onRowAdd={onRowAdd} onRowEdit={onRowEdit} onRowDelete={onRowDelete} onBatchSave={onBatchSave} />
    );
    fireEvent.click(container.querySelector('.rs-data-grid-stub')!);
    expect(onRowAdd).toHaveBeenCalledTimes(1);
    expect(onRowEdit).toHaveBeenCalledTimes(1);
    expect(onRowDelete).toHaveBeenCalledTimes(1);
    expect(onBatchSave).toHaveBeenCalledTimes(1);
  });

  it('defaults each callback prop to a no-op when omitted', () => {
    const { container } = render(<App gridConfig={{ dataSource: [] }} />);
    expect(() => fireEvent.click(container.querySelector('.rs-data-grid-stub')!)).not.toThrow();
  });
});
