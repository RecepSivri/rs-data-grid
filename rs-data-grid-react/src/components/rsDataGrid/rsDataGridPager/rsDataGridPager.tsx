import { useEffect, useRef } from 'react';
import { DataGridStoreApi } from '../store/useDataGridStore';
import './rsDataGridPager.scss';

export interface RsDataGridPagerProps {
  pagination: boolean;
  pagingSizes: number[];
  currentPagingSize: number;
  pageListSize: number;
  store: DataGridStoreApi;
}

export const RsDataGridPager = ({ pagination, pagingSizes, currentPagingSize, pageListSize, store }: RsDataGridPagerProps) => {
  const { pageSize, pageNumber, pageList, pageLimit, changePageListSize, changePageSize, changePageNumber, increasePageNum, decreasePageNum, lastPageNum } = store;

  const didInit = useRef(false);
  useEffect(() => {
    changePageListSize(pageListSize);
    changePageSize(currentPagingSize);
    didInit.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didInit.current) {
      return;
    }
    changePageListSize(pageListSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageListSize]);

  useEffect(() => {
    if (!didInit.current) {
      return;
    }
    changePageNumber(0);
    changePageSize(currentPagingSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPagingSize]);

  const changeCurrentPaginationSize = (val: number) => {
    changePageNumber(0);
    changePageSize(val);
  };

  const setpage = (index: number) => changePageNumber(index);
  const increasePager = () => increasePageNum();
  const decreasePager = () => decreasePageNum();
  const lastPage = () => lastPageNum();

  const writeAS = (pageFirstItem: any, listSize: any, limit: any) => pageFirstItem + listSize > limit ? false : true;

  if (!pagination) {
    return null;
  }

  return (
    <div className="full-row row-layout-space-between-center">
      <div className="row-layout-start page-number-background">
        <div className="page-numbers" onClick={decreasePager}>{'<'}</div>
        {pageList.map(page => (
          <div
            key={page}
            className={'page-numbers' + (pageNumber === page - 1 ? ' page-numbers-selected' : '')}
            onClick={() => setpage(page - 1)}
          >
            {page}
          </div>
        ))}
        {writeAS(pageList?.[0], pageListSize, pageLimit) && (
          <div className="page-numbers" onClick={lastPage}>
            {pageLimit}
          </div>
        )}
        <div className="page-numbers" onClick={increasePager}>{'>'}</div>
      </div>
      <div className="row-layout">
        {pagingSizes.map(item => (
          <button
            key={item}
            type="button"
            className={'pager-size' + (item === pageSize ? ' page-selected' : '')}
            onClick={() => changeCurrentPaginationSize(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};
