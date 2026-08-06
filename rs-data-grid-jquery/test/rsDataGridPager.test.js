import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPager } from '../src/rsDataGrid/rsDataGridPager/rsDataGridPager.js';

function makeStoreStub(snapshot) {
  return {
    changePageListSize: vi.fn(),
    changePageSize: vi.fn(),
    changePageNumber: vi.fn(),
    decreasePageNum: vi.fn(),
    increasePageNum: vi.fn(),
    lastPageNum: vi.fn(),
    getSnapshot: vi.fn(() => snapshot),
  };
}

describe('rsDataGridPager', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('on first render (init) calls changePageListSize + changePageSize and renders nothing else', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    pager.render(container, { pagination: true, pagingSizes: [10, 20], pageListSize: 5, currentPagingSize: 10, store });
    expect(store.changePageListSize).toHaveBeenCalledWith(5);
    expect(store.changePageSize).toHaveBeenCalledWith(10);
    expect(container.children.length).toBe(0);
  });

  it('second render (props unchanged from init) proceeds past both guard branches and paints the pager', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    const props = { pagination: true, pagingSizes: [10, 20], pageListSize: 5, currentPagingSize: 10, store };
    pager.render(container, props);
    store.changePageListSize.mockClear();
    store.changePageSize.mockClear();
    pager.render(container, props);
    expect(store.changePageListSize).not.toHaveBeenCalled();
    expect(store.changePageSize).not.toHaveBeenCalled();
    expect(container.querySelector('.page-number-background')).not.toBeNull();
  });

  it('reacts to a pageListSize prop change by calling changePageListSize and returning early (no paint)', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    pager.render(container, { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store });
    store.changePageListSize.mockClear();
    pager.render(container, { pagination: true, pagingSizes: [], pageListSize: 8, currentPagingSize: 10, store });
    expect(store.changePageListSize).toHaveBeenCalledWith(8);
    expect(store.changePageSize).not.toHaveBeenCalledTimes(2);
    expect(container.children.length).toBe(0);
  });

  it('reacts to a currentPagingSize prop change by resetting page 0 + changePageSize, returning early (no paint)', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    pager.render(container, { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store });
    store.changePageSize.mockClear();
    pager.render(container, { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 25, store });
    expect(store.changePageNumber).toHaveBeenCalledWith(0);
    expect(store.changePageSize).toHaveBeenCalledWith(25);
    expect(container.children.length).toBe(0);
  });

  it('renders nothing (after clearing) when pagination is false', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    const props = { pagination: false, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store };
    pager.render(container, props);
    container.appendChild(document.createElement('span')); // sentinel to prove clear() runs
    pager.render(container, props);
    expect(container.children.length).toBe(0);
  });

  it('renders page number cells, marking the current page as selected', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 1, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    const props = { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store };
    pager.render(container, props);
    pager.render(container, props);
    const numberCells = [...container.querySelectorAll('.page-numbers')].filter(el => /^\d+$/.test(el.textContent));
    expect(numberCells.map(c => c.textContent)).toEqual(['1', '2', '3']);
    expect(numberCells[1].className).toContain('page-numbers-selected');
    expect(numberCells[0].className).not.toContain('page-numbers-selected');
  });

  it('clicking a page number calls store.changePageNumber(page - 1)', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    const props = { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store };
    pager.render(container, props);
    pager.render(container, props);
    const numberCells = [...container.querySelectorAll('.page-numbers')].filter(el => /^\d+$/.test(el.textContent));
    numberCells[2].click();
    expect(store.changePageNumber).toHaveBeenCalledWith(2);
  });

  it('clicking "<" calls decreasePageNum and ">" calls increasePageNum', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    const props = { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store };
    pager.render(container, props);
    pager.render(container, props);
    const cells = [...container.querySelectorAll('.page-numbers')];
    cells.find(c => c.textContent === '<').click();
    cells.find(c => c.textContent === '>').click();
    expect(store.decreasePageNum).toHaveBeenCalledTimes(1);
    expect(store.increasePageNum).toHaveBeenCalledTimes(1);
  });

  it('appends a jump-to-last-page cell when the current window does not reach pageLimit, and clicking it calls lastPageNum', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageLimit: 12 });
    const pager = createPager();
    const props = { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store };
    pager.render(container, props);
    pager.render(container, props);
    const cells = [...container.querySelectorAll('.page-numbers')];
    const lastCell = cells.find(c => c.textContent === '12');
    expect(lastCell).toBeDefined();
    lastCell.click();
    expect(store.lastPageNum).toHaveBeenCalledTimes(1);
  });

  it('omits the jump-to-last-page cell when the current window already reaches pageLimit', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    const props = { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store };
    pager.render(container, props);
    pager.render(container, props);
    const cells = [...container.querySelectorAll('.page-numbers')].map(c => c.textContent);
    expect(cells).toEqual(['<', '1', '2', '3', '>']);
  });

  it('renders paging-size buttons, marking the active size as selected, and clicking one resets page + changes size', () => {
    const store = makeStoreStub({ pageSize: 20, pageNumber: 3, pageList: [1, 2, 3], pageLimit: 3 });
    const pager = createPager();
    const props = { pagination: true, pagingSizes: [10, 20, 50], pageListSize: 5, currentPagingSize: 20, store };
    pager.render(container, props);
    pager.render(container, props);
    const sizeButtons = [...container.querySelectorAll('.pager-size')];
    expect(sizeButtons.map(b => b.textContent)).toEqual(['10', '20', '50']);
    expect(sizeButtons[1].className).toContain('page-selected');
    expect(sizeButtons[0].className).not.toContain('page-selected');

    store.changePageNumber.mockClear();
    sizeButtons[2].click();
    expect(store.changePageNumber).toHaveBeenCalledWith(0);
    expect(store.changePageSize).toHaveBeenCalledWith(50);
  });

  it('defaults pagingSizes rendering to nothing when the array is empty', () => {
    const store = makeStoreStub({ pageSize: 10, pageNumber: 0, pageList: [1], pageLimit: 1 });
    const pager = createPager();
    const props = { pagination: true, pagingSizes: [], pageListSize: 5, currentPagingSize: 10, store };
    pager.render(container, props);
    pager.render(container, props);
    expect(container.querySelectorAll('.pager-size').length).toBe(0);
  });
});
