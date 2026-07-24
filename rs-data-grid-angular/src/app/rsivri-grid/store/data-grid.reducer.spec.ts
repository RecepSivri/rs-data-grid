import { dataGridReducer, initialState } from './data-grid.reducer';
import { AppState } from './data-grid.state';
import {
  changePageListSize, changePageNumber, changePageSize,
  decreasePageNum, increasePageNum, lastPageNum, setData
} from './data-grid.actions';

function stateWith(pager: Partial<AppState['pager']>, data: any[] = []): AppState {
  return {
    data: data as [],
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

describe('dataGridReducer', () => {
  it('returns the initial state for an unknown action', () => {
    const state = dataGridReducer(undefined, { type: 'noop' } as any);
    expect(state).toEqual(initialState);
  });

  describe('setData', () => {
    it('computes pageLimit/pageList for local data when pageListSize <= pageLimit', () => {
      const data = new Array(23).fill({});
      const state = dataGridReducer(stateWith({ pageSize: 10, pageListSize: 3 }), setData({ data, remote: false }));
      expect(state.data).toBe(data);
      expect(state.pager.pageLimit).toBe(3); // ceil(23/10)
      expect(state.pager.pageList).toEqual([1, 2, 3]);
      expect(state.pager.remotePage).toBeFalse();
    });

    it('clamps pageList length to pageLimit when pageListSize > pageLimit', () => {
      const data = new Array(5).fill({});
      const state = dataGridReducer(stateWith({ pageSize: 10, pageListSize: 5 }), setData({ data, remote: false }));
      expect(state.pager.pageLimit).toBe(1); // ceil(5/10)
      expect(state.pager.pageList).toEqual([1]);
    });

    it('marks remotePage and derives pageLimit from remoteDatasize when remote and a size is given', () => {
      const state = dataGridReducer(
        stateWith({ pageSize: 10, pageListSize: 5 }),
        setData({ data: [], remote: true, remoteDatasize: 42 })
      );
      expect(state.pager.remotePage).toBeTrue();
      expect((state.pager as any).remoteDataSize).toBe(42);
      expect(state.pager.pageLimit).toBe(5); // ceil(42/10)
    });

    it('falls back to pageLimit 0 when remote and no size is given', () => {
      const state = dataGridReducer(
        stateWith({ pageSize: 10, pageListSize: 5 }),
        setData({ data: [], remote: true })
      );
      expect(state.pager.remotePage).toBeTrue();
      expect(state.pager.pageLimit).toBe(0);
    });
  });

  it('changePageSize recomputes pageLimit and pageList from the new page size', () => {
    const data = new Array(30).fill({});
    const state = dataGridReducer(stateWith({ pageListSize: 5 }, data), changePageSize({ pageSize: 6 }));
    expect(state.pager.pageSize).toBe(6);
    expect(state.pager.pageLimit).toBe(5); // ceil(30/6)
    expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
  });

  it('changePageListSize recomputes pageList using the current pageLimit', () => {
    const state = dataGridReducer(stateWith({ pageLimit: 10 }), changePageListSize({ pageListSize: 3 }));
    expect(state.pager.pageListSize).toBe(3);
    expect(state.pager.pageList).toEqual([1, 2, 3]);
  });

  describe('changePageNumber', () => {
    it('jumps directly to page 0 without touching pageList', () => {
      const state = dataGridReducer(stateWith({ pageList: [1, 2, 3, 4, 5] }), changePageNumber({ pageNumber: 0 }));
      expect(state.pager.pageNumber).toBe(0);
      expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
    });

    it('jumps directly to the last page without touching pageList', () => {
      const state = dataGridReducer(
        stateWith({ pageList: [1, 2, 3, 4, 5], pageLimit: 10 }),
        changePageNumber({ pageNumber: 9 })
      );
      expect(state.pager.pageNumber).toBe(9);
      expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
    });

    it('slides the visible window forward and clamps it to pageLimit near the end', () => {
      const state = dataGridReducer(
        stateWith({ pageList: [4, 5, 6, 7, 8], pageListSize: 5, pageLimit: 10 }),
        changePageNumber({ pageNumber: 7 })
      );
      expect(state.pager.pageNumber).toBe(7);
      expect(state.pager.pageList).toEqual([8, 9, 10]);
    });

    it('slides the visible window backward to the start of the range', () => {
      const state = dataGridReducer(
        stateWith({ pageList: [5, 6, 7, 8, 9], pageListSize: 5, pageLimit: 10 }),
        changePageNumber({ pageNumber: 4 })
      );
      expect(state.pager.pageNumber).toBe(4);
      expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
    });

    it('slides the visible window backward mid-range without hitting the start clamp', () => {
      const state = dataGridReducer(
        stateWith({ pageList: [7, 8, 9, 10, 11], pageListSize: 5, pageLimit: 12 }),
        changePageNumber({ pageNumber: 6 })
      );
      expect(state.pager.pageNumber).toBe(6);
      expect(state.pager.pageList).toEqual([3, 4, 5, 6, 7]);
    });

    it('updates only the page number when the current window is unaffected', () => {
      const state = dataGridReducer(
        stateWith({ pageList: [1, 2, 3, 4, 5], pageListSize: 5, pageLimit: 10 }),
        changePageNumber({ pageNumber: 2 })
      );
      expect(state.pager.pageNumber).toBe(2);
      expect(state.pager.pageList).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('increasePageNum', () => {
    it('stays on the last page once pageLimit - 1 is reached', () => {
      const state = dataGridReducer(
        stateWith({ pageNumber: 9, pageLimit: 10, pageList: [1, 2, 3, 4, 5], pageListSize: 5 }),
        increasePageNum()
      );
      expect(state.pager.pageNumber).toBe(9);
    });

    it('increments the page number when not on the last page', () => {
      const state = dataGridReducer(
        stateWith({ pageNumber: 3, pageLimit: 10, pageList: [1, 2, 3, 4, 5], pageListSize: 5 }),
        increasePageNum()
      );
      expect(state.pager.pageNumber).toBe(4);
    });
  });

  describe('decreasePageNum', () => {
    it('stays on page 0 once already there', () => {
      const state = dataGridReducer(
        stateWith({ pageNumber: 0, pageLimit: 10, pageList: [1, 2, 3, 4, 5], pageListSize: 5 }),
        decreasePageNum()
      );
      expect(state.pager.pageNumber).toBe(0);
    });

    it('decrements the page number when not on the first page', () => {
      const state = dataGridReducer(
        stateWith({ pageNumber: 4, pageLimit: 10, pageList: [1, 2, 3, 4, 5], pageListSize: 5 }),
        decreasePageNum()
      );
      expect(state.pager.pageNumber).toBe(3);
    });
  });

  it('lastPageNum jumps to the final page and rebuilds the visible window', () => {
    const state = dataGridReducer(
      stateWith({ pageLimit: 10, pageListSize: 5, pageList: [1, 2, 3, 4, 5] }),
      lastPageNum()
    );
    expect(state.pager.pageNumber).toBe(9);
    expect(state.pager.pageList).toEqual([6, 7, 8, 9, 10]);
  });
});
