import {
  selectData, selectDataGrid, selectPageLimit,
  selectPageList, selectPageNum, selectPageSize
} from './data-grid.selectors';

describe('data-grid selectors', () => {
  const state = {
    dataGrid: {
      data: [{ a: 1 }],
      pager: {
        pageNumber: 2,
        pageSize: 20,
        pageList: [1, 2, 3],
        pageListSize: 3,
        pageLimit: 5,
        remotePage: false
      }
    }
  };

  it('selectDataGrid returns the dataGrid feature slice', () => {
    expect(selectDataGrid(state)).toBe(state.dataGrid);
  });

  it('selectData returns the data array', () => {
    expect(selectData(state)).toBe(state.dataGrid.data);
  });

  it('selectPageNum returns the current page number', () => {
    expect(selectPageNum(state)).toBe(2);
  });

  it('selectPageSize returns the current page size', () => {
    expect(selectPageSize(state)).toBe(20);
  });

  it('selectPageList returns the visible page list', () => {
    expect(selectPageList(state)).toBe(state.dataGrid.pager.pageList);
  });

  it('selectPageLimit returns the page limit', () => {
    expect(selectPageLimit(state)).toBe(5);
  });
});
