import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RsDataGridPager } from './rsDataGridPager';
import { DataGridStoreApi } from '../store/useDataGridStore';

const makeStore = (overrides: Partial<DataGridStoreApi> = {}): DataGridStoreApi =>
  ({
    pageSize: 10,
    pageNumber: 0,
    pageList: [1, 2, 3, 4, 5],
    pageLimit: 10,
    changePageListSize: vi.fn(),
    changePageSize: vi.fn(),
    changePageNumber: vi.fn(),
    increasePageNum: vi.fn(),
    decreasePageNum: vi.fn(),
    lastPageNum: vi.fn(),
    ...overrides,
  }) as unknown as DataGridStoreApi;

describe('RsDataGridPager', () => {
  it('renders nothing when pagination is false (though the mount effect still runs)', () => {
    const store = makeStore();
    const { container } = render(<RsDataGridPager pagination={false} pagingSizes={[10, 20]} pageListSize={5} currentPagingSize={10} store={store} />);
    expect(container.firstChild).toBeNull();
  });

  it('initializes pageListSize and pageSize from props on mount', () => {
    const store = makeStore();
    render(<RsDataGridPager pagination={true} pagingSizes={[10, 20]} pageListSize={7} currentPagingSize={25} store={store} />);
    expect(store.changePageListSize).toHaveBeenCalledWith(7);
    expect(store.changePageSize).toHaveBeenCalledWith(25);
  });

  it('re-applies pageListSize when the prop changes after mount', () => {
    const store = makeStore();
    const { rerender } = render(<RsDataGridPager pagination={true} pagingSizes={[10]} pageListSize={5} currentPagingSize={10} store={store} />);
    (store.changePageListSize as any).mockClear();
    rerender(<RsDataGridPager pagination={true} pagingSizes={[10]} pageListSize={8} currentPagingSize={10} store={store} />);
    expect(store.changePageListSize).toHaveBeenCalledWith(8);
  });

  it('resets to page 0 and applies the new size when currentPagingSize prop changes after mount', () => {
    const store = makeStore();
    const { rerender } = render(<RsDataGridPager pagination={true} pagingSizes={[10]} pageListSize={5} currentPagingSize={10} store={store} />);
    (store.changePageNumber as any).mockClear();
    (store.changePageSize as any).mockClear();
    rerender(<RsDataGridPager pagination={true} pagingSizes={[10]} pageListSize={5} currentPagingSize={50} store={store} />);
    expect(store.changePageNumber).toHaveBeenCalledWith(0);
    expect(store.changePageSize).toHaveBeenCalledWith(50);
  });

  it('renders page numbers, marks the current page selected, and handles prev/next clicks', async () => {
    const store = makeStore({ pageNumber: 1, pageList: [1, 2, 3] });
    render(<RsDataGridPager pagination={true} pagingSizes={[]} pageListSize={5} currentPagingSize={10} store={store} />);

    const two = screen.getByText('2');
    expect(two.className).toContain('page-numbers-selected');
    const one = screen.getByText('1');
    expect(one.className).not.toContain('page-numbers-selected');

    await userEvent.click(screen.getByText('<'));
    expect(store.decreasePageNum).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText('>'));
    expect(store.increasePageNum).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText('3'));
    expect(store.changePageNumber).toHaveBeenCalledWith(2);
  });

  it('shows the jump-to-last-page button when the visible window does not reach the last page, and it calls lastPageNum', async () => {
    const store = makeStore({ pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageLimit: 20 });
    render(<RsDataGridPager pagination={true} pagingSizes={[]} pageListSize={5} currentPagingSize={10} store={store} />);
    const lastPageButton = screen.getByText('20');
    await userEvent.click(lastPageButton);
    expect(store.lastPageNum).toHaveBeenCalledTimes(1);
  });

  it('hides the jump-to-last-page button when the visible window already reaches the last page', () => {
    const store = makeStore({ pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageLimit: 5 });
    render(<RsDataGridPager pagination={true} pagingSizes={[]} pageListSize={5} currentPagingSize={10} store={store} />);
    expect(screen.queryByText('5')).not.toBeNull(); // page number 5 itself is in the list
    // pageFirstItem(1) + listSize(5) = 6 > limit(5) -> false, so no extra "jump to last" button beyond the list.
    expect(screen.getAllByText('5')).toHaveLength(1);
  });

  it('renders page size buttons, marks the active one selected, and handles clicks', async () => {
    const store = makeStore({ pageSize: 20 });
    render(<RsDataGridPager pagination={true} pagingSizes={[10, 20, 50]} pageListSize={5} currentPagingSize={20} store={store} />);

    const button20 = screen.getByRole('button', { name: '20' });
    expect(button20.className).toContain('page-selected');
    const button10 = screen.getByRole('button', { name: '10' });
    expect(button10.className).not.toContain('page-selected');

    (store.changePageNumber as any).mockClear();
    await userEvent.click(button10);
    expect(store.changePageNumber).toHaveBeenCalledWith(0);
    expect(store.changePageSize).toHaveBeenCalledWith(10);
  });

  it('handles an empty pageList gracefully (no jump-to-last button)', () => {
    const store = makeStore({ pageList: [], pageLimit: 0 });
    render(<RsDataGridPager pagination={true} pagingSizes={[]} pageListSize={5} currentPagingSize={10} store={store} />);
    expect(screen.getByText('<')).toBeInTheDocument();
    expect(screen.getByText('>')).toBeInTheDocument();
  });
});
