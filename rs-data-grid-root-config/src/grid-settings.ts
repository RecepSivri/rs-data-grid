export interface RadioOption {
  value: string;
  label: string;
}

export interface GridSetting {
  key: string;
  label: string;
  type: 'boolean' | 'string' | 'number' | 'json' | 'radio';
  options?: RadioOption[];
}

export interface SettingsGroup {
  title: string;
  settings: GridSetting[];
}

export const httpMethods: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const gridConfig: Record<string, any> = {
  theme: 'light',
  fetchUrl: 'http://universities.hipolabs.com/search?country=United+States',
  apiMethod: 'GET',
  apiHeadersRaw: '',
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
};

export let fetchNonce = 0;
export let jsonError: string | null = null;

export const settingsGroups: SettingsGroup[] = [
  {
    title: 'Grid Mode',
    settings: [
      {
        key: 'gridMode',
        label: 'Mode',
        type: 'radio',
        options: [
          { value: 'popup', label: 'Popup' },
          { value: 'row', label: 'Row' },
          { value: 'batch', label: 'Batch' },
        ],
      },
    ],
  },
  {
    title: 'Appearance',
    settings: [
      { key: 'tableBorder', label: 'Table Border', type: 'boolean' },
      { key: 'headerRowLines', label: 'Header Row Lines', type: 'boolean' },
      { key: 'headerColumnLines', label: 'Header Column Lines', type: 'boolean' },
      { key: 'bodyRowLines', label: 'Body Row Lines', type: 'boolean' },
      { key: 'bodyColumnLines', label: 'Body Column Lines', type: 'boolean' },
      { key: 'borderRadiusTop', label: 'Border Radius Top', type: 'boolean' },
      { key: 'borderRadiusBottom', label: 'Border Radius Bottom', type: 'boolean' },
      { key: 'diagonalRow', label: 'Diagonal Row', type: 'boolean' },
      { key: 'showIndex', label: 'Show Index', type: 'boolean' },
    ],
  },
  {
    title: 'Pagination',
    settings: [
      { key: 'pagination', label: 'Pagination', type: 'boolean' },
      { key: 'remoteMode', label: 'Remote Mode', type: 'boolean' },
      { key: 'currentPagingSize', label: 'Current Paging Size', type: 'number' },
      { key: 'pageListSize', label: 'Page List Size', type: 'number' },
      { key: 'pagingSizes', label: 'Paging Sizes', type: 'string' },
    ],
  },
  {
    title: 'Toolbar Features',
    settings: [
      { key: 'showFilter', label: 'Show Filter', type: 'boolean' },
      { key: 'showSort', label: 'Show Sort', type: 'boolean' },
      { key: 'showSearch', label: 'Show Search', type: 'boolean' },
      { key: 'showActions', label: 'Show Row Actions', type: 'boolean' },
      { key: 'showAdd', label: 'Show Add Button', type: 'boolean' },
      { key: 'exportExcel', label: 'Export Excel', type: 'boolean' },
      { key: 'exportPDF', label: 'Export PDF', type: 'boolean' },
    ],
  },
];

// Re-renders the sidebar (to reflect state changes like jsonError) and pushes
// the latest gridConfig/fetchNonce into whichever framework tab is currently
// mounted, via the root parcel's `update()` lifecycle (root-config.ts wires
// this hook up to the active parcel -- single-spa only calls `update` on
// parcels, never on plain registerApplication apps).
let requestRerender: (() => void) | null = null;
let requestUpdate: (() => void) | null = null;
export function setRerenderHook(fn: () => void): void {
  requestRerender = fn;
}
export function setUpdateHook(fn: () => void): void {
  requestUpdate = fn;
}

function notifyChange(): void {
  requestUpdate?.();
  requestRerender?.();
}

function parseLooseJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    // Fall through to relaxed parsing (single-quoted strings, unquoted keys).
  }
  const withDoubleQuotedStrings = raw.replace(/'((?:[^'\\]|\\.)*)'/g, (_match, inner) => {
    const unescaped = (inner as string).replace(/\\'/g, "'");
    return `"${unescaped.replace(/"/g, '\\"')}"`;
  });
  const withQuotedKeys = withDoubleQuotedStrings.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":');
  return JSON.parse(withQuotedKeys);
}

export function setSetting(key: string, value: any): void {
  gridConfig[key] = value;
  notifyChange();
}

export function commitStringSetting(key: string, raw: string): void {
  if (key === 'pagingSizes') {
    const parsed = raw
      .split(',')
      .map(part => Number(part.trim()))
      .filter(value => !Number.isNaN(value));
    setSetting(key, parsed);
    return;
  }
  setSetting(key, raw);
}

export function commitHeadersSetting(raw: string): void {
  const headers: Record<string, string> = {};
  raw.split('\n').forEach(line => {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      return;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      headers[key] = value;
    }
  });
  gridConfig.apiHeadersRaw = raw;
  gridConfig.apiHeaders = headers;
  notifyChange();
}

export function commitJsonSetting(key: string, raw: string): void {
  const trimmed = raw.trim();
  if (trimmed === '') {
    jsonError = null;
    setSetting(key, []);
    return;
  }
  try {
    const parsed = parseLooseJson(trimmed);
    jsonError = null;
    setSetting(key, Array.isArray(parsed) ? parsed : [parsed]);
  } catch {
    jsonError = 'Invalid JSON — change was not applied.';
    notifyChange();
  }
}

export function triggerFetch(): void {
  fetchNonce += 1;
  notifyChange();
}

export function onGridRowAdd(row: any): void {
  console.log('Added row:', row);
}
export function onGridRowEdit(row: any): void {
  console.log('Edit row:', row);
}
export function onGridRowDelete(row: any): void {
  console.log('Deleted row:', row);
}
export function onGridBatchSave(payload: { added: any[]; updated: { original: any; updated: any }[] }): void {
  console.log('Batch save:', payload);
}

export function getCustomProps() {
  // gridConfig is mutated in place, so hand out a fresh shallow copy each
  // call — otherwise Angular signals / React / Vue reactivity (which key off
  // reference identity) won't detect that anything changed.
  return {
    gridConfig: { ...gridConfig },
    fetchNonce,
    onRowAdd: onGridRowAdd,
    onRowEdit: onGridRowEdit,
    onRowDelete: onGridRowDelete,
    onBatchSave: onGridBatchSave,
  };
}
