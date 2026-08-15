import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderCodeViewer } from './code-viewer';
import { gridConfig } from './grid-settings';

const baseConfig: Record<string, any> = {
  theme: 'light',
  fetchUrl: 'https://api.test/movies',
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
  dragDropColumns: false,
  dragDropRows: false,
  pagination: true,
  pagingSizes: [10, 20, 50],
  currentPagingSize: 10,
  pageListSize: 5,
  showFilter: true,
  showSort: true,
  showSearch: true,
  showActions: true,
  showAdd: true,
  showGridSettings: true,
  showIndex: false,
  exportExcel: true,
  exportPDF: true,
  gridMode: 'popup',
};

function resetConfig(overrides: Record<string, any> = {}): void {
  for (const key of Object.keys(gridConfig)) {
    delete gridConfig[key];
  }
  Object.assign(gridConfig, baseConfig, overrides);
}

function makeContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

function codeText(container: HTMLElement): string {
  return container.querySelector('code')?.textContent ?? '';
}

beforeEach(() => {
  document.body.innerHTML = '';
  resetConfig();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('renderCodeViewer - unsupported/unknown tab', () => {
  it('clears the container and renders nothing for a hash with no generator', () => {
    const container = makeContainer();
    container.innerHTML = '<span>stale</span>';
    renderCodeViewer(container, '#/does-not-exist');
    expect(container.innerHTML).toBe('');
  });
});

describe('renderCodeViewer - per-framework snippet generators', () => {
  it('React: emits JSX with string props quoted and non-string props in braces', () => {
    const container = makeContainer();
    renderCodeViewer(container, '#/react');
    const text = codeText(container);
    expect(text).toContain(`import { RsDataGrid } from 'rs-data-grid-react';`);
    expect(text).toContain(`theme="light"`);
    expect(text).toContain(`fetchUrl="https://api.test/movies"`);
    expect(text).toContain(`tableBorder={true}`);
    expect(text).toContain(`pagingSizes={[10, 20, 50]}`);
    expect(container.querySelector('code')?.className).toContain('language-typescript');
  });

  it('Angular: emits an @Component with bracket-bound inputs', () => {
    const container = makeContainer();
    renderCodeViewer(container, '#/angular');
    const text = codeText(container);
    expect(text).toContain(`import { RsivriGridComponent } from 'rs-grid-angular';`);
    expect(text).toContain(`[theme]="'light'"`);
    expect(text).toContain(`[tableBorder]="true"`);
  });

  it('Vue: emits template attributes, kebab-casing prop names except exportPDF', () => {
    const container = makeContainer();
    renderCodeViewer(container, '#/vue');
    const text = codeText(container);
    expect(text).toContain(`import { RsDataGrid } from 'rs-data-grid-vue';`);
    expect(text).toContain(`theme="light"`);
    expect(text).toContain(`:table-border="true"`);
    // exportPDF is deliberately kept camelCase (not kebab-cased to
    // export-p-d-f) -- see the special-case comment in vueSnippet.
    expect(text).toContain(`:exportPDF="true"`);
    expect(container.querySelector('code')?.className).toContain('language-xml');
  });

  it('Vanilla: emits a plain object literal passed to grid.render', () => {
    const container = makeContainer();
    renderCodeViewer(container, '#/vanilla');
    const text = codeText(container);
    expect(text).toContain(`import { createGrid } from 'rs-data-grid-vanilla';`);
    expect(text).toContain(`theme: 'light',`);
    expect(container.querySelector('code')?.className).toContain('language-javascript');
  });

  it('jQuery: emits a plain object literal passed to grid.render', () => {
    const container = makeContainer();
    renderCodeViewer(container, '#/jquery');
    const text = codeText(container);
    expect(text).toContain(`import { createGrid } from 'rs-data-grid-jquery';`);
    expect(text).toContain(`theme: 'light',`);
  });
});

describe('relevantEntries filtering rules', () => {
  it('shows fetchUrl-related keys and omits dataSource when dataSource is empty', () => {
    resetConfig({ dataSource: [] });
    const container = makeContainer();
    renderCodeViewer(container, '#/react');
    const text = codeText(container);
    expect(text).toContain('fetchUrl=');
    expect(text).not.toContain('dataSource=');
  });

  it('shows dataSource and omits fetch-only keys when dataSource is non-empty', () => {
    resetConfig({ dataSource: [{ id: 1 }] });
    const container = makeContainer();
    renderCodeViewer(container, '#/react');
    const text = codeText(container);
    expect(text).toContain('dataSource=');
    expect(text).not.toContain('fetchUrl=');
    expect(text).not.toContain('apiMethod=');
    expect(text).not.toContain('authToken=');
    expect(text).not.toContain('entrySection=');
  });

  it('omits authToken/entrySection when falsy, includes them when set', () => {
    resetConfig({ authToken: '', entrySection: '' });
    let container = makeContainer();
    renderCodeViewer(container, '#/react');
    expect(codeText(container)).not.toContain('authToken=');
    expect(codeText(container)).not.toContain('entrySection=');

    resetConfig({ authToken: 'secret-token', entrySection: 'items' });
    container = makeContainer();
    renderCodeViewer(container, '#/react');
    const text = codeText(container);
    expect(text).toContain('authToken="secret-token"');
    expect(text).toContain('entrySection="items"');
  });

  it('omits apiHeaders when empty, includes it (renamed to fetchHeaders) when non-empty', () => {
    resetConfig({ apiHeaders: {} });
    let container = makeContainer();
    renderCodeViewer(container, '#/react');
    expect(codeText(container)).not.toContain('fetchHeaders=');

    resetConfig({ apiHeaders: { 'X-Test': '1' } });
    container = makeContainer();
    renderCodeViewer(container, '#/react');
    expect(codeText(container)).toContain(`fetchHeaders={{ 'X-Test': '1' }}`);
  });

  it('omits remoteMode when false, includes it when true', () => {
    resetConfig({ remoteMode: false });
    let container = makeContainer();
    renderCodeViewer(container, '#/react');
    expect(codeText(container)).not.toContain('remoteMode=');

    resetConfig({ remoteMode: true });
    container = makeContainer();
    renderCodeViewer(container, '#/react');
    expect(codeText(container)).toContain('remoteMode={true}');
  });
});

describe('jsLiteral formatting', () => {
  it('escapes backslashes and single quotes in string values', () => {
    resetConfig({ authToken: `back\\slash and 'quote'` });
    const container = makeContainer();
    renderCodeViewer(container, '#/vanilla');
    expect(codeText(container)).toContain(`authToken: 'back\\\\slash and \\'quote\\'',`);
  });

  it('recursively formats nested arrays and objects', () => {
    resetConfig({ apiHeaders: { a: '1', b: '2' } });
    const container = makeContainer();
    renderCodeViewer(container, '#/vanilla');
    expect(codeText(container)).toContain(`fetchHeaders: { 'a': '1', 'b': '2' },`);
  });
});

describe('copy button', () => {
  it('copies the code to the clipboard and shows a "Copied" state that resets after a timeout', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const container = makeContainer();
    renderCodeViewer(container, '#/react');
    const button = container.querySelector('.code-copy-button') as HTMLButtonElement;
    expect(button.textContent).toContain('Copy');

    button.click();
    expect(writeText).toHaveBeenCalledWith(codeTextRaw(container));
    await Promise.resolve();
    await Promise.resolve();
    expect(button.textContent).toContain('Copied');
    expect(button.classList).toContain('code-copy-button-done');

    vi.advanceTimersByTime(1500);
    expect(button.textContent).toContain('Copy');
    expect(button.classList).not.toContain('code-copy-button-done');
  });

  it('clears a pending reset timer when clicked again before it fires', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const container = makeContainer();
    renderCodeViewer(container, '#/react');
    const button = container.querySelector('.code-copy-button') as HTMLButtonElement;

    button.click();
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(500);
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(1000);
    // Still within the second click's own 1500ms window -- the first timer's reset was cleared.
    expect(button.textContent).toContain('Copied');
    vi.advanceTimersByTime(500);
    expect(button.textContent).toContain('Copy');
  });

  function codeTextRaw(container: HTMLElement): string {
    // The exact string passed to writeText is the *pre-highlight* generated
    // source, same content as the rendered code block's own text.
    return container.querySelector('code')!.textContent!;
  }
});
