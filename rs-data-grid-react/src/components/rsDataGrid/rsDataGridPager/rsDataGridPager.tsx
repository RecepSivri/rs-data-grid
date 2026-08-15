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

  // React runs every effect in declaration order within the same commit, so
  // on mount the effect above already flips didInit.current to true
  // (synchronously) before this one ever checks it -- the guard below can
  // never actually see `false` here. It's harmless (both effects end up
  // calling the same idempotent setter with the same mount-time value, just
  // once redundantly) and kept as-is rather than restructured for a
  // cosmetic fix, but it means the early-return is dead code.
  useEffect(() => {
    /* istanbul ignore if */
    if (!didInit.current) {
      return;
    }
    changePageListSize(pageListSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageListSize]);

  useEffect(() => {
    /* istanbul ignore if */
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
    <div className="full-row row-layout-space-between-center pager-row">
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
