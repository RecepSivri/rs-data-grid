// Port of rsDataGridPager.tsx. Purely presentational except for the
// init/prop-change-driven store calls, which mirror React's two useEffects
// (init-once, then react to pageListSize/currentPagingSize prop changes) via
// closure-held "last seen" comparisons instead of a dependency array.
import { el, clear } from '../domUtil.js';
import './rsDataGridPager.css';

export function createPager() {
  let didInit = false;
  let lastPageListSize;
  let lastCurrentPagingSize;

  function render(container, props) {
    const { pagination, pagingSizes, currentPagingSize, pageListSize, store } = props;

    if (!didInit) {
      didInit = true;
      lastPageListSize = pageListSize;
      lastCurrentPagingSize = currentPagingSize;
      store.changePageListSize(pageListSize);
      store.changePageSize(currentPagingSize);
      return;
    }

    if (pageListSize !== lastPageListSize) {
      lastPageListSize = pageListSize;
      store.changePageListSize(pageListSize);
      return;
    }

    if (currentPagingSize !== lastCurrentPagingSize) {
      lastCurrentPagingSize = currentPagingSize;
      store.changePageNumber(0);
      store.changePageSize(currentPagingSize);
      return;
    }

    clear(container);
    if (!pagination) {
      return;
    }

    const { pageSize, pageNumber, pageList, pageLimit } = store.getSnapshot();
    const writeAS = (pageFirstItem, listSize, limit) => !(pageFirstItem + listSize > limit);

    const pageNumberEls = pageList.map(page =>
      el('div', {
        className: 'page-numbers' + (pageNumber === page - 1 ? ' page-numbers-selected' : ''),
        text: String(page),
        on: { click: () => store.changePageNumber(page - 1) },
      })
    );

    const leftGroupChildren = [
      el('div', { className: 'page-numbers', text: '<', on: { click: () => store.decreasePageNum() } }),
      ...pageNumberEls,
    ];
    if (writeAS(pageList?.[0], pageListSize, pageLimit)) {
      leftGroupChildren.push(el('div', { className: 'page-numbers', text: String(pageLimit), on: { click: () => store.lastPageNum() } }));
    }
    leftGroupChildren.push(el('div', { className: 'page-numbers', text: '>', on: { click: () => store.increasePageNum() } }));

    const sizeButtons = pagingSizes.map(item =>
      el('button', {
        className: 'pager-size' + (item === pageSize ? ' page-selected' : ''),
        text: String(item),
        attrs: { type: 'button' },
        on: {
          click: () => {
            store.changePageNumber(0);
            store.changePageSize(item);
          },
        },
      })
    );

    container.appendChild(
      el('div', {
        className: 'full-row row-layout-space-between-center pager-row',
        children: [
          el('div', { className: 'row-layout-start page-number-background', children: leftGroupChildren }),
          el('div', { className: 'row-layout', children: sizeButtons }),
        ],
      })
    );
  }

  return { render };
}
