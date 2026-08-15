import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPager } from './rsDataGridPager';

const makeStore = snapshot => ({
  getSnapshot: vi.fn(() => snapshot),
  changePageListSize: vi.fn(),
  changePageSize: vi.fn(),
  changePageNumber: vi.fn(),
  decreasePageNum: vi.fn(),
  increasePageNum: vi.fn(),
  lastPageNum: vi.fn(),
});

const baseProps = (overrides = {}) => ({
  pagination: true,
  pagingSizes: [10, 20, 50],
  currentPagingSize: 10,
  pageListSize: 5,
  store: makeStore({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageLimit: 10 }),
  ...overrides,
});

let container;
let pager;

beforeEach(() => {
  container = document.createElement('div');
  pager = createPager();
});

describe('init/prop-change lifecycle', () => {
  it('on first render, initializes the store and renders nothing yet', () => {
    const props = baseProps();
    pager.render(container, props);
    expect(props.store.changePageListSize).toHaveBeenCalledWith(5);
    expect(props.store.changePageSize).toHaveBeenCalledWith(10);
    expect(container.children.length).toBe(0);
  });

  it('renders the pager UI from the second render onward with unchanged props', () => {
    const props = baseProps();
    pager.render(container, props);
    pager.render(container, props);
    expect(container.querySelector('.pager-row')).not.toBeNull();
  });

  it('reacts to a pageListSize change by re-syncing the store, without rendering this call', () => {
    const props = baseProps();
    pager.render(container, props);
    pager.render(container, props);
    props.store.changePageListSize.mockClear();
    pager.render(container, { ...props, pageListSize: 3 });
    expect(props.store.changePageListSize).toHaveBeenCalledWith(3);
    // Still showing the previous render's content -- this call returned early.
    expect(container.querySelector('.pager-row')).not.toBeNull();
  });

  it('reacts to a currentPagingSize change by resetting to page 0 and re-syncing page size', () => {
    const props = baseProps();
    pager.render(container, props);
    pager.render(container, props);
    pager.render(container, { ...props, currentPagingSize: 20 });
    expect(props.store.changePageNumber).toHaveBeenCalledWith(0);
    expect(props.store.changePageSize).toHaveBeenCalledWith(20);
  });
});

describe('pagination toggle', () => {
  it('clears the container and renders nothing when pagination is off', () => {
    const props = baseProps({ pagination: false });
    pager.render(container, props);
    pager.render(container, props);
    expect(container.children.length).toBe(0);
  });

  it('renders the pager row when pagination is on', () => {
    const props = baseProps({ pagination: true });
    pager.render(container, props);
    pager.render(container, props);
    expect(container.querySelector('.pager-row')).not.toBeNull();
  });
});

describe('page number buttons', () => {
  it('renders one button per visible page, highlighting the current page', () => {
    const props = baseProps({ store: makeStore({ pageSize: 10, pageNumber: 2, pageList: [1, 2, 3, 4, 5], pageLimit: 5 }) });
    pager.render(container, props);
    pager.render(container, props);
    const numberEls = Array.from(container.querySelectorAll('.page-numbers')).filter(el => /^\d+$/.test(el.textContent));
    expect(numberEls.map(el => el.textContent)).toEqual(['1', '2', '3', '4', '5']);
    expect(numberEls[2].classList.contains('page-numbers-selected')).toBe(true);
    expect(numberEls[0].classList.contains('page-numbers-selected')).toBe(false);
  });

  it('clicking a page number navigates to it (0-based)', () => {
    const props = baseProps();
    pager.render(container, props);
    pager.render(container, props);
    const numberEls = Array.from(container.querySelectorAll('.page-numbers')).filter(el => /^\d+$/.test(el.textContent));
    numberEls[2].click();
    expect(props.store.changePageNumber).toHaveBeenCalledWith(2);
  });

  it('the "<" and ">" buttons call decrease/increasePageNum', () => {
    const props = baseProps();
    pager.render(container, props);
    pager.render(container, props);
    const buttons = Array.from(container.querySelectorAll('.page-numbers'));
    buttons.find(b => b.textContent === '<').click();
    buttons.find(b => b.textContent === '>').click();
    expect(props.store.decreasePageNum).toHaveBeenCalledTimes(1);
    expect(props.store.increasePageNum).toHaveBeenCalledTimes(1);
  });

  it('shows a jump-to-last-page button when the last page is not in the visible window', () => {
    const props = baseProps({
      pageListSize: 3,
      store: makeStore({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3], pageLimit: 10 }),
    });
    pager.render(container, props);
    pager.render(container, props);
    const buttons = Array.from(container.querySelectorAll('.page-numbers'));
    const lastBtn = buttons.find(b => b.textContent === '10');
    expect(lastBtn).toBeDefined();
    lastBtn.click();
    expect(props.store.lastPageNum).toHaveBeenCalledTimes(1);
  });

  it('omits the jump-to-last-page button when the last page is already in the visible window', () => {
    const props = baseProps({
      pageListSize: 3,
      store: makeStore({ pageSize: 10, pageNumber: 9, pageList: [8, 9, 10], pageLimit: 10 }),
    });
    pager.render(container, props);
    pager.render(container, props);
    const buttons = Array.from(container.querySelectorAll('.page-numbers'));
    // '10' legitimately appears once already, as the last page-number button
    // itself -- a second one would mean the jump-to-last button was also added.
    expect(buttons.filter(b => b.textContent === '10').length).toBe(1);
  });
});

describe('page size buttons', () => {
  it('renders one button per paging size, highlighting the current size', () => {
    const props = baseProps({ pagingSizes: [10, 20, 50], store: makeStore({ pageSize: 20, pageNumber: 0, pageList: [1], pageLimit: 1 }) });
    pager.render(container, props);
    pager.render(container, props);
    const sizeButtons = Array.from(container.querySelectorAll('.pager-size'));
    expect(sizeButtons.map(b => b.textContent)).toEqual(['10', '20', '50']);
    expect(sizeButtons[1].classList.contains('page-selected')).toBe(true);
    expect(sizeButtons[0].classList.contains('page-selected')).toBe(false);
  });

  it('clicking a size button resets to page 0 and applies the new size', () => {
    const props = baseProps();
    pager.render(container, props);
    pager.render(container, props);
    const sizeButtons = Array.from(container.querySelectorAll('.pager-size'));
    sizeButtons.find(b => b.textContent === '50').click();
    expect(props.store.changePageNumber).toHaveBeenCalledWith(0);
    expect(props.store.changePageSize).toHaveBeenCalledWith(50);
  });
});
