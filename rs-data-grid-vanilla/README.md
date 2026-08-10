# rs-data-grid-vanilla

A configurable data grid component for plain JavaScript — filtering, sorting,
pagination, inline/popup/batch editing, drag-and-drop rows/columns, and
Excel/PDF export. No framework required.

## Install

```bash
npm install rs-data-grid-vanilla
```

## Usage

```js
import { createGrid } from 'rs-data-grid-vanilla';

const grid = createGrid();
grid.render(document.getElementById('app'), {
  theme: 'light',
  fetchUrl: 'https://api.example.com/items',
  pagination: true,
  showFilter: true,
  showSort: true,
  showSearch: true,
  gridMode: 'popup',
});
```

No separate CSS import is needed — styles are bundled with the component.

Call `grid.render(container, props)` again with a new `props` object any
time you want to update the grid (e.g. after a settings change) — it diffs
against what's currently rendered. Call `grid.destroy()` to tear it down.

## Data

Provide data either by URL (`fetchUrl`, fetched with `fetchMethod`/`fetchHeaders`/`authToken`)
or directly via `dataSource`. Columns are inferred from the data's own keys
unless you pass an explicit `columns` array (`{ dataField, caption }[]`).

## Key props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `fetchUrl` / `dataSource` | `string` / `any[]` | — | Where the grid gets its rows |
| `columns` | `{ dataField, caption }[]` | inferred | Explicit column list |
| `gridMode` | `'popup' \| 'row' \| 'batch'` | `'popup'` | Add/edit interaction style |
| `pagination` | `boolean` | `false` | Enable paging |
| `showFilter` / `showSort` / `showSearch` | `boolean` | `false` | Toolbar/header features |
| `dragDropRows` / `dragDropColumns` | `boolean` | `false` | Enable drag-to-reorder |
| `exportExcel` / `exportPDF` | `boolean` | `false` | Toolbar export buttons |
| `onRowAdd` / `onRowEdit` / `onRowDelete` / `onBatchSave` | `(row) => void` | — | CRUD callbacks |

## License

MIT
