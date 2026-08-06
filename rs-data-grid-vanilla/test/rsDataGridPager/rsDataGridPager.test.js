import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPager } from '../../src/rsDataGrid/rsDataGridPager/rsDataGridPager.js';

function makeStore(snapshot) {
  return {
    __snapshot: snapshot,
    getSnapshot: vi.fn(function () {
      return this.__snapshot;
    }),
    changePageListSize: vi.fn(),
    changePageSize: vi.fn(),
    changePageNumber: vi.fn(),
    increasePageNum: vi.fn(),
    decreasePageNum: vi.fn(),
    lastPageNum: vi.fn(),
  };
}

function baseProps(store, overrides = {}) {
  return {
    pagination: true,
    pagingSizes: [10, 20, 50],
    pageListSize: 5,
    currentPagingSize: 10,
    store,
    ...overrides,
  };
}

describe('rsDataGridPager', () => {
  let container;
  let sentinel;
  let pager;
  let store;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    sentinel = document.createElement('span');
    sentinel.className = 'sentinel';
    container.appendChild(sentinel);
    document.body.appendChild(container);
    pager = createPager();
    store = makeStore({ pageSize: 10, pageNumber: 0, pageList: [1, 2, 3, 4, 5], pageLimit: 10 });
  });

  describe('init pass (first render call)', () => {
    it('calls changePageListSize and changePageSize with the initial props and does not touch the DOM', () => {
      pager.render(container, baseProps(store));
      expect(store.changePageListSize).toHaveBeenCalledWith(5);
      expect(store.changePageSize).toHaveBeenCalledWith(10);
      expect(store.changePageNumber).not.toHaveBeenCalled();
      // container was never clear()ed nor appended to during the init pass
      expect(container.querySelector('.sentinel')).toBe(sentinel);
      expect(container.children.length).toBe(1);
    });
  });

  describe('pageListSize prop-change pass', () => {
    it('calls only changePageListSize with the new value and does not touch the DOM', () => {
      pager.render(container, baseProps(store, { pageListSize: 5 })); // init
      pager.render(container, baseProps(store, { pageListSize: 8 })); // changed
      expect(store.changePageListSize).toHaveBeenCalledTimes(2);
      expect(store.changePageListSize).toHaveBeenNthCalledWith(2, 8);
      expect(store.changePageSize).toHaveBeenCalledTimes(1); // only from init pass
      expect(container.querySelector('.sentinel')).toBe(sentinel);
    });

    it('subsequent renders with the now-current pageListSize proceed past this branch', () => {
      pager.render(container, baseProps(store, { pageListSize: 5 })); // init
      pager.render(container, baseProps(store, { pageListSize: 8 })); // changed -> stores lastPageListSize=8
      pager.render(container, baseProps(store, { pageListSize: 8 })); // unchanged now -> falls through
      expect(container.querySelector('.sentinel')).toBeNull(); // real render cleared the container
    });
  });

  describe('currentPagingSize prop-change pass', () => {
    it('calls changePageNumber(0) then changePageSize with the new value and does not touch the DOM', () => {
      pager.render(container, baseProps(store, { currentPagingSize: 10 })); // init
      pager.render(container, baseProps(store, { currentPagingSize: 20 })); // changed
      expect(store.changePageNumber).toHaveBeenCalledWith(0);
      expect(store.changePageSize).toHaveBeenLastCalledWith(20);
      expect(container.querySelector('.sentinel')).toBe(sentinel);
    });
  });

  describe('steady-state render (no init/prop-change branch triggered)', () => {
    function renderSteady(overrides = {}) {
      pager.render(container, baseProps(store, overrides)); // init pass
      pager.render(container, baseProps(store, overrides)); // identical props -> falls through to real render
    }

    it('clears the container first (sentinel removed)', () => {
      renderSteady();
      expect(container.querySelector('.sentinel')).toBeNull();
    });

    it('renders nothing (blank) when pagination is false', () => {
      renderSteady({ pagination: false });
      expect(container.children.length).toBe(0);
    });

    it('renders one page-number cell per pageList entry with its number as text', () => {
      renderSteady();
      const numberEls = container.querySelectorAll('.page-numbers');
      // '<' + 5 page numbers + '>' (writeAS not triggered here: pageList[0]=1, 1+5=6<=10 -> actually triggered, see next test)
      const texts = Array.from(numberEls).map(n => n.textContent);
      expect(texts).toContain('1');
      expect(texts).toContain('5');
    });

    it('marks the page matching pageNumber (0-based) as selected', () => {
      store.__snapshot.pageNumber = 2; // page "3" is selected
      renderSteady();
      const numberEls = Array.from(container.querySelectorAll('.page-numbers'));
      const selected = numberEls.find(el => el.classList.contains('page-numbers-selected'));
      expect(selected.textContent).toBe('3');
    });

    it('clicking a page number calls store.changePageNumber(page - 1)', () => {
      renderSteady();
      const numberEls = Array.from(container.querySelectorAll('.page-numbers'));
      const page3 = numberEls.find(el => el.textContent === '3');
      page3.click();
      expect(store.changePageNumber).toHaveBeenCalledWith(2);
    });

    it('clicking "<" calls store.decreasePageNum()', () => {
      renderSteady();
      const first = container.querySelectorAll('.page-numbers')[0];
      expect(first.textContent).toBe('<');
      first.click();
      expect(store.decreasePageNum).toHaveBeenCalledTimes(1);
    });

    it('clicking ">" calls store.increasePageNum()', () => {
      renderSteady();
      const numberEls = container.querySelectorAll('.page-numbers');
      const last = numberEls[numberEls.length - 1];
      expect(last.textContent).toBe('>');
      last.click();
      expect(store.increasePageNum).toHaveBeenCalledTimes(1);
    });

    it('shows a jump-to-last-page button (labelled with pageLimit) when the pageList window does not reach the end', () => {
      store.__snapshot.pageList = [1, 2, 3, 4, 5];
      store.__snapshot.pageLimit = 10; // 1 + 5 <= 10 -> writeAS true
      renderSteady();
      const numberEls = Array.from(container.querySelectorAll('.page-numbers'));
      const lastPageBtn = numberEls.find(el => el.textContent === '10');
      expect(lastPageBtn).toBeDefined();
      lastPageBtn.click();
      expect(store.lastPageNum).toHaveBeenCalledTimes(1);
    });

    it('omits the jump-to-last-page button when the pageList window already reaches the end', () => {
      store.__snapshot.pageList = [6, 7, 8, 9, 10];
      store.__snapshot.pageLimit = 10; // 6 + 5 > 10 -> writeAS false
      renderSteady();
      const numberEls = Array.from(container.querySelectorAll('.page-numbers'));
      const lastPageBtn = numberEls.find(el => el.textContent === '10' && el.onclick === undefined);
      // the only '10' text possible would be the jump button; page numbers here max out at 10 too,
      // so assert total count instead: '<' + 5 numbers + '>' = 7, no extra jump button.
      expect(numberEls.length).toBe(7);
    });

    it('renders an empty pageList window gracefully (no page-number cells, still "<"/">")', () => {
      store.__snapshot.pageList = [];
      store.__snapshot.pageLimit = 0;
      renderSteady();
      const numberEls = Array.from(container.querySelectorAll('.page-numbers'));
      const texts = numberEls.map(n => n.textContent);
      expect(texts).toContain('<');
      expect(texts).toContain('>');
    });

    it('renders one size button per pagingSizes entry, marking the active pageSize', () => {
      store.__snapshot.pageSize = 20;
      renderSteady({ pagingSizes: [10, 20, 50] });
      const sizeButtons = Array.from(container.querySelectorAll('.pager-size'));
      expect(sizeButtons.map(b => b.textContent)).toEqual(['10', '20', '50']);
      const selected = sizeButtons.find(b => b.classList.contains('page-selected'));
      expect(selected.textContent).toBe('20');
    });

    it('clicking a size button resets to page 0 then changes the page size', () => {
      renderSteady({ pagingSizes: [10, 20, 50] });
      const sizeButtons = Array.from(container.querySelectorAll('.pager-size'));
      const btn50 = sizeButtons.find(b => b.textContent === '50');
      btn50.click();
      expect(store.changePageNumber).toHaveBeenCalledWith(0);
      expect(store.changePageSize).toHaveBeenLastCalledWith(50);
    });

    it('renders no size buttons when pagingSizes is empty', () => {
      renderSteady({ pagingSizes: [] });
      expect(container.querySelectorAll('.pager-size').length).toBe(0);
    });

    it('re-renders cleanly on repeated steady-state calls (rebuilds each time)', () => {
      renderSteady();
      const firstRun = container.querySelectorAll('.page-numbers').length;
      pager.render(container, baseProps(store)); // another steady-state pass
      const secondRun = container.querySelectorAll('.page-numbers').length;
      expect(secondRun).toBe(firstRun);
    });
  });
});
