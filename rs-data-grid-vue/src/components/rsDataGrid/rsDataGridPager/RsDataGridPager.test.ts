import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import RsDataGridPager from './RsDataGridPager.vue';

const makeStore = (overrides: Record<string, unknown> = {}) => ({
  pageNumber: 0,
  pageSize: 10,
  pageList: [1, 2, 3, 4, 5],
  pageLimit: 10,
  changePageListSize: vi.fn(),
  changePageSize: vi.fn(),
  changePageNumber: vi.fn(),
  increasePageNum: vi.fn(),
  decreasePageNum: vi.fn(),
  lastPageNum: vi.fn(),
  ...overrides,
});

const baseProps = (overrides: Record<string, unknown> = {}) => ({
  pagination: true,
  pagingSizes: [10, 20, 50],
  currentPagingSize: 10,
  pageListSize: 5,
  store: makeStore(),
  ...overrides,
});

let activeWrapper: VueWrapper | null = null;

async function mountPager(props: Record<string, unknown> = {}) {
  activeWrapper = mount(RsDataGridPager, { props: baseProps(props), attachTo: document.body });
  await activeWrapper.vm.$nextTick();
  return activeWrapper;
}

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = null;
  document.body.innerHTML = '';
});

describe('mount lifecycle', () => {
  it('syncs the store\'s page list size and page size on mount', async () => {
    const props = baseProps();
    await mountPager(props);
    expect((props.store as any).changePageListSize).toHaveBeenCalledWith(5);
    expect((props.store as any).changePageSize).toHaveBeenCalledWith(10);
  });
});

describe('reactive prop watchers', () => {
  it('re-syncs the store when pageListSize changes', async () => {
    const props = baseProps();
    const wrapper = await mountPager(props);
    await wrapper.setProps({ pageListSize: 8 });
    expect((props.store as any).changePageListSize).toHaveBeenLastCalledWith(8);
  });

  it('resets to page 0 and re-syncs page size when currentPagingSize changes', async () => {
    const props = baseProps();
    const wrapper = await mountPager(props);
    await wrapper.setProps({ currentPagingSize: 20 });
    expect((props.store as any).changePageNumber).toHaveBeenCalledWith(0);
    expect((props.store as any).changePageSize).toHaveBeenLastCalledWith(20);
  });
});

describe('pagination toggle', () => {
  it('renders nothing when pagination is off', async () => {
    await mountPager({ pagination: false });
    expect(document.body.querySelector('.pager-row')).toBeNull();
  });

  it('renders the pager row when pagination is on', async () => {
    await mountPager({ pagination: true });
    expect(document.body.querySelector('.pager-row')).not.toBeNull();
  });
});

describe('page number buttons', () => {
  it('renders one button per visible page, highlighting the current page', async () => {
    await mountPager({ store: makeStore({ pageNumber: 2, pageList: [1, 2, 3, 4, 5], pageLimit: 5 }) });
    const numberEls = Array.from(document.body.querySelectorAll('.page-numbers')).filter(el => /^\d+$/.test(el.textContent?.trim() ?? ''));
    expect(numberEls.map(el => el.textContent?.trim())).toEqual(['1', '2', '3', '4', '5']);
    expect(numberEls[2].className).toContain('page-numbers-selected');
    expect(numberEls[0].className).not.toContain('page-numbers-selected');
  });

  it('clicking a page number navigates to it (0-based)', async () => {
    const props = baseProps();
    await mountPager(props);
    const numberEls = Array.from(document.body.querySelectorAll('.page-numbers')).filter(el => /^\d+$/.test(el.textContent?.trim() ?? ''));
    (numberEls[2] as HTMLElement).click();
    expect((props.store as any).changePageNumber).toHaveBeenCalledWith(2);
  });

  it('the "<" and ">" buttons call decrease/increasePageNum', async () => {
    const props = baseProps();
    await mountPager(props);
    const buttons = Array.from(document.body.querySelectorAll('.page-numbers'));
    (buttons.find(b => b.textContent?.trim() === '<') as HTMLElement).click();
    (buttons.find(b => b.textContent?.trim() === '>') as HTMLElement).click();
    expect((props.store as any).decreasePageNum).toHaveBeenCalledTimes(1);
    expect((props.store as any).increasePageNum).toHaveBeenCalledTimes(1);
  });

  it('shows a jump-to-last-page button when the last page is not in the visible window', async () => {
    const props = baseProps({ pageListSize: 3, store: makeStore({ pageList: [1, 2, 3], pageLimit: 10 }) });
    await mountPager(props);
    const buttons = Array.from(document.body.querySelectorAll('.page-numbers'));
    const lastBtn = buttons.find(b => b.textContent?.trim() === '10');
    expect(lastBtn).toBeDefined();
    (lastBtn as HTMLElement).click();
    expect((props.store as any).lastPageNum).toHaveBeenCalledTimes(1);
  });

  it('omits the jump-to-last-page button when the last page is already in the visible window', async () => {
    await mountPager({ pageListSize: 3, store: makeStore({ pageNumber: 9, pageList: [8, 9, 10], pageLimit: 10 }) });
    const buttons = Array.from(document.body.querySelectorAll('.page-numbers'));
    // '10' legitimately appears once already, as the last page-number button
    // itself -- a second one would mean the jump-to-last button was also added.
    expect(buttons.filter(b => b.textContent?.trim() === '10').length).toBe(1);
  });
});

describe('page size buttons', () => {
  it('renders one button per paging size, highlighting the current size', async () => {
    await mountPager({ pagingSizes: [10, 20, 50], store: makeStore({ pageSize: 20, pageList: [1], pageLimit: 1 }) });
    const sizeButtons = Array.from(document.body.querySelectorAll('.pager-size'));
    expect(sizeButtons.map(b => b.textContent?.trim())).toEqual(['10', '20', '50']);
    expect(sizeButtons[1].className).toContain('page-selected');
    expect(sizeButtons[0].className).not.toContain('page-selected');
  });

  it('clicking a size button resets to page 0 and applies the new size', async () => {
    const props = baseProps();
    await mountPager(props);
    const sizeButtons = Array.from(document.body.querySelectorAll('.pager-size'));
    (sizeButtons.find(b => b.textContent?.trim() === '50') as HTMLElement).click();
    expect((props.store as any).changePageNumber).toHaveBeenCalledWith(0);
    expect((props.store as any).changePageSize).toHaveBeenLastCalledWith(50);
  });
});
