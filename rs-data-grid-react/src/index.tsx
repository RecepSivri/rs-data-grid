import React from 'react';
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import './index.css';
import App, { defaultGridConfig } from './App';
import reportWebVitals from './reportWebVitals';

// A handful of local rows for the ?localData=true override below -- lets
// E2E tests exercise the dataSource (non-fetch) loading path, which the
// gist-backed default config never touches.
// "Local Sample Two" deliberately leaves release_date null -- real fetched
// data can have gaps like this, and the export/render paths need to handle
// it (falling back to a blank cell rather than the literal string "null").
const LOCAL_SAMPLE_DATA = [
  { id: 1, title: 'Local Sample One', genres: 'Drama', release_date: 1000000000 },
  { id: 2, title: 'Local Sample Two', genres: 'Comedy', release_date: null },
  { id: 3, title: 'Local Sample Three', genres: 'Action', release_date: 1200000000 },
];

// Query-string overrides on top of defaultGridConfig -- exists so Cypress
// can exercise configurations (batch/row CRUD mode, drag & drop, showIndex,
// smaller page sizes, etc.) that this static demo would otherwise never
// produce, without a settings UI of its own (that's root-config's sidebar).
function parseOverrides(search: string): Record<string, any> {
  const params = new URLSearchParams(search);
  const overrides: Record<string, any> = {};
  for (const [key, raw] of params) {
    if (key === 'localData') {
      if (raw === 'true') {
        overrides.dataSource = LOCAL_SAMPLE_DATA;
        overrides.fetchUrl = '';
      }
      continue;
    }
    if (key === 'emptyColumnsData') {
      // Rows that exist (so the grid isn't in its empty-dataset state) but
      // carry no fields at all -- lets E2E tests reach the "0 columns"
      // edge case in the column picker, which an empty dataset never does
      // (that shows the empty-state template before the toolbar even
      // renders).
      if (raw === 'true') {
        overrides.dataSource = [{}, {}, {}];
        overrides.fetchUrl = '';
      }
      continue;
    }
    if (key === 'blankFieldData') {
      // A real field ("tags") that's blank on every row -- the filter
      // dropdown's "No values" empty state only shows up for a column that
      // exists but has nothing to offer, which emptyColumnsData (0 columns)
      // can't reach either.
      if (raw === 'true') {
        overrides.dataSource = [
          { id: 1, title: 'Blank Tags One', tags: '' },
          { id: 2, title: 'Blank Tags Two', tags: '' },
        ];
        overrides.fetchUrl = '';
        overrides.showFilter = true;
        // Neither of these fields is in the default poster/title/genres/
        // release_date selection, so without this override "tags" would be
        // filtered out of the visible columns entirely.
        overrides.defaultVisibleColumns = ['title', 'tags'];
      }
      continue;
    }
    if (raw === 'true' || raw === 'false') {
      overrides[key] = raw === 'true';
    } else if (key === 'pagingSizes') {
      overrides[key] = raw.split(',').map(Number);
    } else if (key === 'currentPagingSize' || key === 'pageListSize') {
      overrides[key] = Number(raw);
    } else {
      overrides[key] = raw;
    }
  }
  return overrides;
}

const gridConfig = { ...defaultGridConfig, ...parseOverrides(window.location.search) };

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

let currentProps = { gridConfig, fetchNonce: 0 };

function renderApp() {
  root.render(
    <React.Fragment>
      <App gridConfig={currentProps.gridConfig} fetchNonce={currentProps.fetchNonce} />
    </React.Fragment>
  );
}

renderApp();

// Test-only hook (never part of the single-spa bundle -- that's
// single-spa-react-driven src/index.js, built separately, which doesn't
// import this file). Mirrors exactly what root-config's own update()/
// unmount() calls look like, so Cypress can exercise that lifecycle from
// the standalone page.
(window as any).__rsGridApp = {
  update(partialGridConfig: Record<string, any>, fetchNonce?: number) {
    currentProps = {
      gridConfig: { ...currentProps.gridConfig, ...partialGridConfig },
      fetchNonce: fetchNonce ?? currentProps.fetchNonce,
    };
    // root.render() outside of React's own event handling isn't guaranteed
    // to commit before this call returns -- two update() calls back to
    // back (exactly what Cypress's separately-queued commands produce) can
    // otherwise race, with the second one's dataSource-reference check
    // running against a not-yet-committed version of the first. flushSync
    // forces the commit to happen synchronously, matching what a real
    // caller pushing rapid prop updates needs.
    flushSync(renderApp);
  },
  unmount() {
    root.unmount();
  },
};

reportWebVitals();
