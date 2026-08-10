# rs-grid-angular

A configurable data grid component for Angular — filtering, sorting, pagination,
inline/popup/batch editing, drag-and-drop rows/columns, and Excel/PDF export.

## Install

```bash
npm install rs-grid-angular
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/forms`,
`@angular/material`, `@angular/cdk` (^20.x) — install them in your app if you
haven't already. Angular Material's theme CSS also needs to be included once
in your app (e.g. one of the prebuilt themes).

Your app's `ApplicationConfig` needs to provide `HttpClient` and animations
(the grid fetches data via `HttpClient` and Angular Material's dialogs need
an animations provider):

```ts
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideAnimationsAsync()],
};
```

## Usage

```ts
import { Component } from '@angular/core';
import { RsivriGridComponent } from 'rs-grid-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RsivriGridComponent],
  template: `
    <rs-grid-angular
      [theme]="'light'"
      [fetchUrl]="'https://api.example.com/items'"
      [pagination]="true"
      [showFilter]="true"
      [showSort]="true"
      [showSearch]="true"
      [gridMode]="'popup'"
    ></rs-grid-angular>
  `,
})
export class AppComponent {}
```

## Data

Provide data either by URL (`fetchUrl`, fetched with `fetchMethod`/`fetchHeaders`/`authToken`)
or directly via `dataSource`. Columns are inferred from the data's own keys
unless you pass an explicit `columns` array (`{ dataField, caption }[]`).

## Key inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `fetchUrl` / `dataSource` | `string` / `any[]` | — | Where the grid gets its rows |
| `columns` | `IColumn[]` | inferred | Explicit column list |
| `gridMode` | `'popup' \| 'row' \| 'batch'` | `'popup'` | Add/edit interaction style |
| `pagination` | `boolean` | `false` | Enable paging |
| `showFilter` / `showSort` / `showSearch` | `boolean` | `false` | Toolbar/header features |
| `dragDropRows` / `dragDropColumns` | `boolean` | `false` | Enable drag-to-reorder |
| `exportExcel` / `exportPDF` | `boolean` | `false` | Toolbar export buttons |
| `(rowAdd)` / `(rowEdit)` / `(rowDelete)` / `(batchSave)` | `EventEmitter` | — | CRUD outputs |

See `RsivriGridComponent` in the shipped type declarations for the full list.

## License

MIT
