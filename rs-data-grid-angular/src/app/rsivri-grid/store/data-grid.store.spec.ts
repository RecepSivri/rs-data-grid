import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  applyFilters, applyGlobalSearch, applySort, DataGridStore, returnLastPageList, returnPageList,
  returnPageStateRelatedPageNum, setDataWrapper
} from './data-grid.store';
import { AppState } from './data-grid.state';

function stateWith(pager: Partial<AppState['pager']>, data: any[] = []): AppState {
  return {
    data,
    pager: {
      pageSize: 10,
      pageNumber: 0,
      pageList: [1, 2, 3, 4, 5],
      pageListSize: 5,
      pageLimit: 10,
      remotePage: false,
      ...pager
    }
  };
}

describe('data-grid pager math (pure helpers)', () => {
  describe('setDataWrapper', () => {
    it('computes pageLimit/pageList for local data when pageListSize <= pageLimit', () => {
      const data = new Array(23).fill({});
      const state = setDataWrapper(stateWith({ pageSize: 10, pageListSize: 3 }), data, false, undefined);
      expect(state.data).toBe(data);
      expect(state.pager.pageLimit).toBe(3); // ceil(23/10)
      expect(state.pager.pageList).toEqual([1, 2, 3]);
      expect(state.pager.remotePage).toBeFalse();
    });

    it('clamps pageList length to pageLimit when pageListSize > pageLimit', () => {
      const data = new Array(5).fill({});
      const state = setDataWrapper(stateWith({ pageSize: 10, pageListSize: 5 }), data, false, undefined);
      expect(state.pager.pageLimit).toBe(1); // ceil(5/10)
      expect(state.pager.pageList).toEqual([1]);
    });

    it('marks remotePage and derives pageLimit from remoteDatasize when remote and a size is given', () => {
      const state = setDataWrapper(stateWith({ pageSize: 10, pageListSize: 5 }), [], true, 42);
      expect(state.pager.remotePage).toBeTrue();
      expect((state.pager as any).remoteDataSize).toBe(42);
      expect(state.pager.pageLimit).toBe(5); // ceil(42/10)
    });

    it('falls back to pageLimit 0 when remote and no size is given', () => {
      const state = setDataWrapper(stateWith({ pageSize: 10, pageListSize: 5 }), [], true, undefined);
      expect(state.pager.remotePage).toBeTrue();
      expect(state.pager.pageLimit).toBe(0);
    });
  });

  it('returnPageList clamps to pageLimit when pageListSize is larger', () => {
    expect(returnPageList(5, 3)).toEqual([1, 2, 3]);
    expect(returnPageList(3, 10)).toEqual([1, 2, 3]);
  });

  describe('returnPageStateRelatedPageNum (changePageNumber)', () => {
    it('jumps directly to page 0 without touching pageList', () => {
      const state = returnPageStateRelatedPageNum(stateWith({ pageList: [1, 2, 3, 4, 5] }), 0, 'none');
      expect(state.pager.pageNumber).toBe(0);
      expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
    });

    it('jumps directly to the last page without touching pageList', () => {
      const state = returnPageStateRelatedPageNum(
        stateWith({ pageList: [1, 2, 3, 4, 5], pageLimit: 10 }), 9, 'none'
      );
      expect(state.pager.pageNumber).toBe(9);
      expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
    });

    it('slides the visible window forward and clamps it to pageLimit near the end', () => {
      const state = returnPageStateRelatedPageNum(
        stateWith({ pageList: [4, 5, 6, 7, 8], pageListSize: 5, pageLimit: 10 }), 7, 'none'
      );
      expect(state.pager.pageNumber).toBe(7);
      expect(state.pager.pageList).toEqual([8, 9, 10]);
    });

    it('slides the visible window backward to the start of the range', () => {
      const state = returnPageStateRelatedPageNum(
        stateWith({ pageList: [5, 6, 7, 8, 9], pageListSize: 5, pageLimit: 10 }), 4, 'none'
      );
      expect(state.pager.pageNumber).toBe(4);
      expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
    });

    it('slides the visible window backward mid-range without hitting the start clamp', () => {
      const state = returnPageStateRelatedPageNum(
        stateWith({ pageList: [7, 8, 9, 10, 11], pageListSize: 5, pageLimit: 12 }), 6, 'none'
      );
      expect(state.pager.pageNumber).toBe(6);
      expect(state.pager.pageList).toEqual([3, 4, 5, 6, 7]);
    });

    it('updates only the page number when the current window is unaffected', () => {
      const state = returnPageStateRelatedPageNum(
        stateWith({ pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 10 }), 2, 'none'
      );
      expect(state.pager.pageNumber).toBe(2);
      expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
    });

    it('increasePageNum semantics: stays on the last page once pageLimit - 1 is reached', () => {
      const s = stateWith({ pageNumber: 9, pageLimit: 10, pageList: [1, 2, 3, 4, 5], pageListSize: 5 });
      const state = returnPageStateRelatedPageNum(s, s.pager.pageNumber === s.pager.pageLimit - 1 ? s.pager.pageNumber : s.pager.pageNumber + 1, 'increase');
      expect(state.pager.pageNumber).toBe(9);
    });

    it('increasePageNum semantics: increments the page number when not on the last page', () => {
      const s = stateWith({ pageNumber: 3, pageLimit: 10, pageList: [1, 2, 3, 4, 5], pageListSize: 5 });
      const state = returnPageStateRelatedPageNum(s, s.pager.pageNumber === s.pager.pageLimit - 1 ? s.pager.pageNumber : s.pager.pageNumber + 1, 'increase');
      expect(state.pager.pageNumber).toBe(4);
    });

    it('decreasePageNum semantics: stays on page 0 once already there', () => {
      const s = stateWith({ pageNumber: 0, pageLimit: 10, pageList: [1, 2, 3, 4, 5], pageListSize: 5 });
      const state = returnPageStateRelatedPageNum(s, s.pager.pageNumber === 0 ? 0 : s.pager.pageNumber - 1, 'decrease');
      expect(state.pager.pageNumber).toBe(0);
    });

    it('decreasePageNum semantics: decrements the page number when not on the first page', () => {
      const s = stateWith({ pageNumber: 4, pageLimit: 10, pageList: [1, 2, 3, 4, 5], pageListSize: 5 });
      const state = returnPageStateRelatedPageNum(s, s.pager.pageNumber === 0 ? 0 : s.pager.pageNumber - 1, 'decrease');
      expect(state.pager.pageNumber).toBe(3);
    });
  });

  it('returnLastPageList jumps to the final page and rebuilds the visible window', () => {
    const s = stateWith({ pageLimit: 10, pageListSize: 5, pageList: [1, 2, 3, 4, 5] });
    const state = returnLastPageList(s, s.pager.pageLimit - 1);
    expect(state.pager.pageNumber).toBe(9);
    expect(state.pager.pageList).toEqual([6, 7, 8, 9, 10]);
  });

  describe('applyFilters', () => {
    const rows = [
      { firstName: 'Jane', lastName: 'Doe' },
      { firstName: 'John', lastName: 'Smith' },
      { firstName: 'Janet', lastName: 'Jones' },
    ];

    it('returns the original array when there are no active filters', () => {
      expect(applyFilters(rows, {})).toBe(rows);
      expect(applyFilters(rows, { firstName: [], lastName: [] })).toBe(rows);
    });

    it('filters rows to those matching any of the selected values per field', () => {
      expect(applyFilters(rows, { firstName: ['Jane', 'Janet'] })).toEqual([rows[0], rows[2]]);
    });

    it('combines multiple active column filters with AND semantics', () => {
      expect(applyFilters(rows, { firstName: ['Jane', 'Janet'], lastName: ['Jones'] })).toEqual([rows[2]]);
    });

    it('treats a missing field on a row as an empty string', () => {
      expect(applyFilters([{ lastName: 'Doe' }], { firstName: ['x'] })).toEqual([]);
    });
  });

  describe('applySort', () => {
    const rows = [
      { name: 'Charlie', age: '30' },
      { name: 'Alice', age: '5' },
      { name: 'Bob', age: '100' },
    ];

    it('returns the original array unchanged when no field/direction is set', () => {
      expect(applySort(rows, { field: null, direction: null })).toBe(rows);
      expect(applySort(rows, { field: 'name', direction: null })).toBe(rows);
    });

    it('sorts strings alphabetically ascending', () => {
      expect(applySort(rows, { field: 'name', direction: 'asc' })).toEqual([
        { name: 'Alice', age: '5' },
        { name: 'Bob', age: '100' },
        { name: 'Charlie', age: '30' },
      ]);
    });

    it('sorts strings alphabetically descending', () => {
      expect(applySort(rows, { field: 'name', direction: 'desc' })).toEqual([
        { name: 'Charlie', age: '30' },
        { name: 'Bob', age: '100' },
        { name: 'Alice', age: '5' },
      ]);
    });

    it('sorts numeric-looking values numerically rather than lexicographically', () => {
      // lexicographic order would be '100' < '30' < '5'; numeric order is 5 < 30 < 100
      expect(applySort(rows, { field: 'age', direction: 'asc' })).toEqual([
        { name: 'Alice', age: '5' },
        { name: 'Charlie', age: '30' },
        { name: 'Bob', age: '100' },
      ]);
    });

    it('does not mutate the input array', () => {
      const original = [...rows];
      applySort(rows, { field: 'name', direction: 'asc' });
      expect(rows).toEqual(original);
    });
  });

  describe('applyGlobalSearch', () => {
    const rows = [
      { firstName: 'Jane', lastName: 'Doe', city: 'Boston' },
      { firstName: 'John', lastName: 'Smith', city: 'Denver' },
      { firstName: 'Janet', lastName: 'Jones', city: 'Boston' },
    ];

    it('returns the original array when the search term is empty or whitespace', () => {
      expect(applyGlobalSearch(rows, '')).toBe(rows);
      expect(applyGlobalSearch(rows, '   ')).toBe(rows);
    });

    it('matches rows where any field contains the term, case-insensitively', () => {
      expect(applyGlobalSearch(rows, 'boston')).toEqual([rows[0], rows[2]]);
    });

    it('matches across different fields, not just one', () => {
      expect(applyGlobalSearch(rows, 'smith')).toEqual([rows[1]]);
      expect(applyGlobalSearch(rows, 'denver')).toEqual([rows[1]]);
    });

    it('trims surrounding whitespace from the search term', () => {
      expect(applyGlobalSearch(rows, '  doe  ')).toEqual([rows[0]]);
    });

    it('returns an empty array when nothing matches', () => {
      expect(applyGlobalSearch(rows, 'nonexistent')).toEqual([]);
    });
  });
});

describe('DataGridStore', () => {
  let store: DataGridStore;
  let httpMock: HttpTestingController;
  let appRef: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataGridStore,
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    store = TestBed.inject(DataGridStore);
    httpMock = TestBed.inject(HttpTestingController);
    appRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts with the initial pager state and no data', () => {
    expect(store.data()).toEqual([]);
    expect(store.pageNumber()).toBe(0);
    expect(store.pageSize()).toBe(10);
    expect(store.pageList()).toEqual([1, 2, 3, 4, 5]);
  });

  it('setData recomputes pageLimit/pageList from the provided data', () => {
    store.setData(new Array(23).fill({}), false);
    expect(store.pageLimit()).toBe(3);
    expect(store.pageList()).toEqual([1, 2, 3]);
  });

  it('changePageSize recomputes pageLimit and pageList from the new page size', () => {
    store.setData(new Array(30).fill({}), false);
    store.changePageSize(6);
    expect(store.pageSize()).toBe(6);
    expect(store.pageLimit()).toBe(5); // ceil(30/6)
    expect(store.pageList()).toEqual([1, 2, 3, 4, 5]);
  });

  it('changePageListSize recomputes pageList using the current pageLimit', () => {
    store.setData(new Array(100).fill({}), false);
    store.changePageListSize(3);
    expect(store.pageList()).toEqual([1, 2, 3]);
  });

  it('increasePageNum/decreasePageNum/lastPageNum move the page number as expected', () => {
    store.setData(new Array(100).fill({}), false); // pageLimit = 10
    store.lastPageNum();
    expect(store.pageNumber()).toBe(9);
    store.decreasePageNum();
    expect(store.pageNumber()).toBe(8);
    store.increasePageNum();
    expect(store.pageNumber()).toBe(9);
  });

  describe('setFilter', () => {
    beforeEach(() => {
      store.setData([
        { firstName: 'Jane', lastName: 'Doe' },
        { firstName: 'John', lastName: 'Smith' },
        { firstName: 'Janet', lastName: 'Jones' },
      ], false);
    });

    it('narrows data() to rows matching the selected values and recomputes the pager', () => {
      store.setFilter('firstName', ['Jane', 'Janet']);
      expect(store.data()).toEqual([
        { firstName: 'Jane', lastName: 'Doe' },
        { firstName: 'Janet', lastName: 'Jones' },
      ]);
      expect(store.pageLimit()).toBe(1);
      expect(store.pageList()).toEqual([1]);
    });

    it('resets pageNumber back to 0 when a filter is applied', () => {
      store.changePageSize(1);
      store.increasePageNum();
      expect(store.pageNumber()).toBe(1);

      store.setFilter('firstName', ['Jane', 'Janet']);
      expect(store.pageNumber()).toBe(0);
    });

    it('restores the unfiltered data once the selected values are cleared', () => {
      store.setFilter('firstName', ['Jane', 'Janet']);
      store.setFilter('firstName', []);
      expect(store.data().length).toBe(3);
      expect(store.pageLimit()).toBe(1);
    });

    it('combines filters across multiple columns', () => {
      store.setFilter('firstName', ['Jane', 'Janet']);
      store.setFilter('lastName', ['Jones']);
      expect(store.data()).toEqual([{ firstName: 'Janet', lastName: 'Jones' }]);
    });
  });

  describe('toggleSort', () => {
    beforeEach(() => {
      store.setData([
        { firstName: 'Jane', age: '30' },
        { firstName: 'Adam', age: '5' },
        { firstName: 'Beth', age: '100' },
      ], false);
    });

    it('starts with no active sort', () => {
      expect(store.sort()).toEqual({ field: null, direction: null });
    });

    it('sorts descending on the first toggle of a column', () => {
      store.toggleSort('firstName');
      expect(store.sort()).toEqual({ field: 'firstName', direction: 'desc' });
      expect(store.data()).toEqual([
        { firstName: 'Jane', age: '30' },
        { firstName: 'Beth', age: '100' },
        { firstName: 'Adam', age: '5' },
      ]);
    });

    it('flips to ascending on a second toggle of the same column', () => {
      store.toggleSort('firstName');
      store.toggleSort('firstName');
      expect(store.sort()).toEqual({ field: 'firstName', direction: 'asc' });
      expect(store.data()).toEqual([
        { firstName: 'Adam', age: '5' },
        { firstName: 'Beth', age: '100' },
        { firstName: 'Jane', age: '30' },
      ]);
    });

    it('flips back to descending on a third toggle', () => {
      store.toggleSort('firstName');
      store.toggleSort('firstName');
      store.toggleSort('firstName');
      expect(store.sort()).toEqual({ field: 'firstName', direction: 'desc' });
    });

    it('switching to a different column resets that column to descending', () => {
      store.toggleSort('firstName');
      store.toggleSort('firstName');
      store.toggleSort('age');
      expect(store.sort()).toEqual({ field: 'age', direction: 'desc' });
      expect(store.data()).toEqual([
        { firstName: 'Beth', age: '100' },
        { firstName: 'Jane', age: '30' },
        { firstName: 'Adam', age: '5' },
      ]);
    });

    it('resets pageNumber back to 0 when the sort changes', () => {
      store.changePageSize(1);
      store.increasePageNum();
      expect(store.pageNumber()).toBe(1);

      store.toggleSort('firstName');
      expect(store.pageNumber()).toBe(0);
    });
  });

  describe('setGlobalSearch', () => {
    beforeEach(() => {
      store.setData([
        { firstName: 'Jane', city: 'Boston' },
        { firstName: 'John', city: 'Denver' },
        { firstName: 'Janet', city: 'Boston' },
      ], false);
    });

    it('starts with an empty search term', () => {
      expect(store.globalSearch()).toBe('');
    });

    it('narrows data() to rows matching the term across any field', () => {
      store.setGlobalSearch('boston');
      expect(store.data()).toEqual([
        { firstName: 'Jane', city: 'Boston' },
        { firstName: 'Janet', city: 'Boston' },
      ]);
      expect(store.pageLimit()).toBe(1);
    });

    it('resets pageNumber back to 0 when the search term changes', () => {
      store.changePageSize(1);
      store.increasePageNum();
      expect(store.pageNumber()).toBe(1);

      store.setGlobalSearch('boston');
      expect(store.pageNumber()).toBe(0);
    });

    it('restores the unfiltered data once the search term is cleared', () => {
      store.setGlobalSearch('boston');
      store.setGlobalSearch('');
      expect(store.data().length).toBe(3);
    });

    it('combines with column filters using AND semantics', () => {
      store.setFilter('firstName', ['Jane', 'Janet']);
      store.setGlobalSearch('denver');
      expect(store.data()).toEqual([]);
    });
  });

  describe('fetchData (local, non-paginated)', () => {
    it('extracts the given section from the response', async () => {
      store.fetchData('http://api.test/x', 'items', false);
      TestBed.flushEffects();
      const req = httpMock.expectOne('http://api.test/x');
      req.flush({ items: [{ a: 1 }] });
      await appRef.whenStable();
      TestBed.flushEffects();
      expect(store.data()).toEqual([{ a: 1 }]);
    });

    it('falls back to an empty array when the requested section is missing', async () => {
      store.fetchData('http://api.test/x', 'items', false);
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/x').flush({});
      await appRef.whenStable();
      TestBed.flushEffects();
      expect(store.data()).toEqual([]);
    });

    it('uses the response directly when no section is given', async () => {
      const response = [{ a: 1 }];
      store.fetchData('http://api.test/x', undefined, false);
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/x').flush(response);
      await appRef.whenStable();
      TestBed.flushEffects();
      expect(store.data()).toEqual(response);
    });
  });

  describe('fetchData (remote, paginated)', () => {
    it('appends page/size query params derived from the store state', async () => {
      store.fetchData('http://api.test/search', 'items', true, 'size');
      TestBed.flushEffects();
      const req = httpMock.expectOne('http://api.test/search?page=0&size=10');
      req.flush({ items: [{ a: 1 }], size: 42 });
      await appRef.whenStable();
      TestBed.flushEffects();
      expect(store.data()).toEqual([{ a: 1 }]);
      expect(store.pageLimit()).toBe(5); // ceil(42/10)
    });

    it('refetches automatically when pageNumber/pageSize change', async () => {
      store.fetchData('http://api.test/search', 'items', true, 'size');
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/search?page=0&size=10').flush({ items: [], size: 100 });
      await appRef.whenStable();
      TestBed.flushEffects();

      store.changePageSize(20);
      TestBed.flushEffects();
      const req = httpMock.expectOne('http://api.test/search?page=0&size=20');
      req.flush({ items: [{ b: 2 }], size: 100 });
      await appRef.whenStable();
      TestBed.flushEffects();
      expect(store.data()).toEqual([{ b: 2 }]);
    });

    it('adds a JSON-encoded filter query param and refetches from page 0 when a filter is set', async () => {
      store.fetchData('http://api.test/search', 'items', true, 'size');
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/search?page=0&size=10').flush({ items: [], size: 100 });
      await appRef.whenStable();
      TestBed.flushEffects();

      store.changePageNumber(3);
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/search?page=3&size=10').flush({ items: [], size: 100 });
      await appRef.whenStable();
      TestBed.flushEffects();

      store.setFilter('firstName', ['Jane', 'Janet']);
      TestBed.flushEffects();
      const expectedFilter = encodeURIComponent(JSON.stringify({ firstName: ['Jane', 'Janet'] }));
      const req = httpMock.expectOne(`http://api.test/search?page=0&size=10&filter=${expectedFilter}`);
      req.flush({ items: [{ firstName: 'Jane' }], size: 2 });
      await appRef.whenStable();
      TestBed.flushEffects();
      expect(store.data()).toEqual([{ firstName: 'Jane' }]);
    });

    it('omits the filter query param once all filters are cleared', async () => {
      store.fetchData('http://api.test/search', 'items', true, 'size');
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/search?page=0&size=10').flush({ items: [], size: 100 });
      await appRef.whenStable();
      TestBed.flushEffects();

      store.setFilter('firstName', ['Jane']);
      TestBed.flushEffects();
      const withFilter = encodeURIComponent(JSON.stringify({ firstName: ['Jane'] }));
      httpMock.expectOne(`http://api.test/search?page=0&size=10&filter=${withFilter}`).flush({ items: [], size: 1 });
      await appRef.whenStable();
      TestBed.flushEffects();

      store.setFilter('firstName', []);
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/search?page=0&size=10').flush({ items: [], size: 100 });
      await appRef.whenStable();
      TestBed.flushEffects();
      expect(store.pageLimit()).toBe(10);
    });

    it('adds a JSON-encoded sort query param and refetches from page 0 when the sort changes', async () => {
      store.fetchData('http://api.test/search', 'items', true, 'size');
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/search?page=0&size=10').flush({ items: [], size: 100 });
      await appRef.whenStable();
      TestBed.flushEffects();

      store.changePageNumber(3);
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/search?page=3&size=10').flush({ items: [], size: 100 });
      await appRef.whenStable();
      TestBed.flushEffects();

      store.toggleSort('firstName');
      TestBed.flushEffects();
      const expectedSort = encodeURIComponent(JSON.stringify({ field: 'firstName', direction: 'desc' }));
      const req = httpMock.expectOne(`http://api.test/search?page=0&size=10&sort=${expectedSort}`);
      req.flush({ items: [{ firstName: 'Jane' }], size: 1 });
      await appRef.whenStable();
      TestBed.flushEffects();
      expect(store.data()).toEqual([{ firstName: 'Jane' }]);
    });
  });
});
