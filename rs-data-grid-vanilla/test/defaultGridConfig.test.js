import { describe, it, expect } from 'vitest';
import { defaultGridConfig } from '../src/defaultGridConfig.js';

describe('defaultGridConfig', () => {
  it('has the expected shape and values', () => {
    expect(defaultGridConfig).toEqual({
      theme: 'light',
      fetchUrl: 'http://universities.hipolabs.com/search?country=United+States',
      apiMethod: 'GET',
      apiHeaders: {},
      authToken: '',
      entrySection: '',
      remoteMode: false,
      dataSource: [],
      headerRowLines: true,
      headerColumnLines: true,
      bodyRowLines: true,
      bodyColumnLines: true,
      tableBorder: true,
      borderRadiusTop: true,
      borderRadiusBottom: false,
      diagonalRow: true,
      pagination: true,
      pagingSizes: [10, 20, 50, 70, 100],
      showFilter: true,
      showSort: true,
      showSearch: true,
      showActions: true,
      showAdd: true,
      showIndex: false,
      exportExcel: true,
      exportPDF: true,
      currentPagingSize: 10,
      pageListSize: 5,
      gridMode: 'popup',
    });
  });
});
