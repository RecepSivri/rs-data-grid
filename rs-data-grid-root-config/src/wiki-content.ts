// Content for the "Wiki" tab -- one page per framework, organized to mirror
// the sidebar's own accordion sections 1:1 (Data Management / Grid Mode /
// Appearance / Pagination / Toolbar Features) so a reader can go "I'm
// looking at this panel in the sidebar -- what does it actually do?" and
// find the matching section immediately.

export type FrameworkKey = 'react' | 'angular' | 'vue' | 'vanilla' | 'jquery';

export interface WikiProp {
  key: string;
  type: string;
  description: string;
}

export interface WikiSection {
  title: string;
  intro: string;
  props: WikiProp[];
}

// Shared across all five frameworks -- the props themselves, their types,
// and what they do are identical everywhere; only the binding syntax differs
// (rendered separately per framework, see propSyntax() below).
export const WIKI_SECTIONS: WikiSection[] = [
  {
    title: 'Data Management',
    intro:
      'Controls where the grid gets its rows from -- either a URL it fetches itself, or an array you pass in directly. The sidebar\'s Data Management panel has two tabs (API / JSON) that map straight onto these two modes.',
    props: [
      { key: 'fetchUrl', type: 'string', description: 'Endpoint the grid fetches on mount. Ignored if dataSource is non-empty.' },
      { key: 'fetchMethod', type: 'string', description: "HTTP method for the fetch (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)." },
      { key: 'fetchHeaders', type: 'Record<string, string>', description: 'Extra request headers, e.g. { "Content-Type": "application/json" }.' },
      { key: 'authToken', type: 'string', description: 'If set, sent as an Authorization: Bearer <token> header.' },
      { key: 'entrySection', type: 'string', description: 'Dot/bracket path into the response body where the row array actually lives, e.g. data, data.items, or data.arr[0]. Leave empty if the response IS the array.' },
      { key: 'dataSource', type: 'any[]', description: 'Pass rows directly instead of fetching. Takes priority over fetchUrl.' },
      { key: 'onRowAdd / onRowEdit / onRowDelete / onBatchSave', type: '(row) => void', description: 'Fired after each CRUD action commits, with the affected row (or the full added/updated diff for batch mode).' },
    ],
  },
  {
    title: 'Grid Mode',
    intro: 'One prop controls the entire add/edit interaction style for the grid.',
    props: [
      { key: 'gridMode', type: "'popup' | 'row' | 'batch'", description: "popup: Add/Edit open in a modal dialog. row: inline single-row editing with a confirm step per save. batch: every row becomes editable at once; a single commit collects every changed/added row into one diff, no per-row confirm." },
    ],
  },
  {
    title: 'Appearance',
    intro: 'Purely visual toggles -- none of these affect what data loads or how CRUD behaves.',
    props: [
      { key: 'theme', type: "'light' | 'dark'", description: 'Overall color scheme.' },
      { key: 'tableBorder', type: 'boolean', description: 'Outer border/rounded corners around the whole grid.' },
      { key: 'headerRowLines', type: 'boolean', description: 'Horizontal divider under the header row.' },
      { key: 'headerColumnLines', type: 'boolean', description: 'Vertical dividers between header cells.' },
      { key: 'bodyRowLines', type: 'boolean', description: 'Horizontal dividers between body rows.' },
      { key: 'bodyColumnLines', type: 'boolean', description: 'Vertical dividers between body cells.' },
      { key: 'borderRadiusTop', type: 'boolean', description: 'Rounds the top-left/top-right corners (needs tableBorder).' },
      { key: 'borderRadiusBottom', type: 'boolean', description: 'Rounds the bottom-left/bottom-right corners (needs tableBorder).' },
      { key: 'diagonalRow', type: 'boolean', description: 'Alternating (zebra-striped) row background.' },
      { key: 'showIndex', type: 'boolean', description: 'Adds a leading row-number column.' },
      { key: 'dragDropColumns', type: 'boolean', description: 'Lets a user drag column headers to reorder them at runtime.' },
      { key: 'dragDropRows', type: 'boolean', description: 'Lets a user drag rows by their handle to reorder them at runtime.' },
    ],
  },
  {
    title: 'Pagination',
    intro: 'Paging is off by default (all rows render at once); turning it on splits rows across pages.',
    props: [
      { key: 'pagination', type: 'boolean', description: 'Enables paging.' },
      { key: 'currentPagingSize', type: 'number', description: 'Rows per page.' },
      { key: 'pageListSize', type: 'number', description: 'How many page-number buttons show at once in the pager (a sliding window, not the total page count).' },
      { key: 'pagingSizes', type: 'number[]', description: 'The page-size choices offered in the pager\'s own dropdown, e.g. [10, 20, 50].' },
    ],
  },
  {
    title: 'Toolbar Features',
    intro: 'Each toggle shows or hides one control in the toolbar row above the grid (search box, action icons, Add/Grid-Settings/export buttons).',
    props: [
      { key: 'showFilter', type: 'boolean', description: 'Per-column filter dropdown in the header.' },
      { key: 'showSort', type: 'boolean', description: 'Click-to-sort on column headers.' },
      { key: 'showSearch', type: 'boolean', description: 'Global search box in the toolbar, matches across every column.' },
      { key: 'showActions', type: 'boolean', description: 'Edit/delete icon column on each row.' },
      { key: 'showAdd', type: 'boolean', description: '"+" button in the toolbar to add a new row (behavior depends on gridMode).' },
      { key: 'showGridSettings', type: 'boolean', description: 'Gear icon that opens the Grid Settings dialog -- pick which columns show and drag to reorder them. The selection persists across page reloads (localStorage) and automatically resets back to "show everything" whenever the underlying data actually changes (a new fetch or a new dataSource), since a saved selection can reference fields the new data doesn\'t have.' },
      { key: 'exportExcel', type: 'boolean', description: 'Toolbar button that exports the currently displayed rows (respecting filter/search/sort/page) to an .xlsx file.' },
      { key: 'exportPDF', type: 'boolean', description: 'Toolbar button that exports the currently displayed rows to a .pdf file.' },
    ],
  },
];

export interface FrameworkWikiMeta {
  displayName: string;
  npmPackage: string;
  npmUrl: string;
  install: string;
  peerNote?: string;
}

export const FRAMEWORK_WIKI_META: Record<FrameworkKey, FrameworkWikiMeta> = {
  react: {
    displayName: 'React',
    npmPackage: 'rs-data-grid-react',
    npmUrl: 'https://www.npmjs.com/package/rs-data-grid-react',
    install: 'npm install rs-data-grid-react',
    peerNote: 'Peer dependencies: react ^18.2.0, react-dom ^18.2.0.',
  },
  angular: {
    displayName: 'Angular',
    npmPackage: 'rs-grid-angular',
    npmUrl: 'https://www.npmjs.com/package/rs-grid-angular',
    install: 'npm install rs-grid-angular',
    peerNote: 'Peer dependencies: @angular/core, @angular/common, @angular/forms, @angular/material, @angular/cdk (^20.x). Your app must also provide HttpClient (provideHttpClient()) and an animations provider (provideAnimationsAsync()) for the Material dialogs.',
  },
  vue: {
    displayName: 'Vue',
    npmPackage: 'rs-data-grid-vue',
    npmUrl: 'https://www.npmjs.com/package/rs-data-grid-vue',
    install: 'npm install rs-data-grid-vue',
    peerNote: 'Peer dependencies: vue ^3.5.40, vuetify ^4.1.7. Vuetify must be registered as an app-level plugin (app.use(createVuetify())) -- the grid renders through your app\'s own Vuetify instance.',
  },
  vanilla: {
    displayName: 'Vanilla JS',
    npmPackage: 'rs-data-grid-vanilla',
    npmUrl: 'https://www.npmjs.com/package/rs-data-grid-vanilla',
    install: 'npm install rs-data-grid-vanilla',
    peerNote: 'No framework dependency -- plain JS/DOM.',
  },
  jquery: {
    displayName: 'jQuery',
    npmPackage: 'rs-data-grid-jquery',
    npmUrl: 'https://www.npmjs.com/package/rs-data-grid-jquery',
    install: 'npm install rs-data-grid-jquery',
    peerNote: 'Peer dependency: jquery ^3.7.1.',
  },
};

// How one prop key renders as an actual binding, per framework -- mirrors
// the exact same per-framework formatting rules as code-viewer.ts's
// generators (kebab-case for Vue except exportPDF, bracket syntax for
// Angular, plain object keys for vanilla/jQuery).
function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function propSyntax(framework: FrameworkKey, key: string): string {
  // Multi-name entries (e.g. "onRowAdd / onRowEdit / ...") are documentation
  // labels, not real binding targets -- render them as-is.
  if (key.includes('/')) {
    return key;
  }
  switch (framework) {
    case 'react':
      return `${key}={...}`;
    case 'angular':
      return key.startsWith('on') ? `(${key.slice(2, 3).toLowerCase()}${key.slice(3)})="..."` : `[${key}]="..."`;
    case 'vue': {
      const attr = key === 'exportPDF' ? key : toKebabCase(key);
      return key.startsWith('on') ? `@${toKebabCase(key.slice(2, 3).toLowerCase() + key.slice(3))}="..."` : `:${attr}="..."`;
    }
    case 'vanilla':
    case 'jquery':
      return `${key}: ...`;
  }
}
