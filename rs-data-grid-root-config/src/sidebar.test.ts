import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// root-config.ts has heavy import-time side effects (single-spa mounting,
// script injection, hashchange listeners) that are irrelevant to sidebar
// rendering and are covered separately in root-config.test.ts. Mock it here
// so sidebar.ts's `getActiveTabLabel` import is fully test-controlled.
vi.mock('./root-config', () => ({
  getActiveTabLabel: vi.fn(() => 'React'),
}));

let sidebarMod: typeof import('./sidebar');
let gridSettingsMod: typeof import('./grid-settings');
let rootConfigMod: typeof import('./root-config');

async function freshImports() {
  vi.resetModules();
  gridSettingsMod = await import('./grid-settings');
  rootConfigMod = await import('./root-config');
  sidebarMod = await import('./sidebar');
}

function makeContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

function detailsFor(container: HTMLElement, summaryText: string): HTMLDetailsElement {
  const details = Array.from(container.querySelectorAll('details')).find(d =>
    d.querySelector('summary')?.textContent?.startsWith(summaryText)
  );
  if (!details) throw new Error(`No <details> panel found with summary starting "${summaryText}"`);
  return details as HTMLDetailsElement;
}

beforeEach(async () => {
  document.body.innerHTML = '';
  await freshImports();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderSidebar - overall structure', () => {
  it('sets the container class and title', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    expect(container.className).toBe('app-sidenav');
    expect(container.querySelector('.sidenav-title')?.textContent).toBe('Grid Settings');
  });

  it('builds one accordion panel per settings group plus Data Management and Code Snippet', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const summaries = Array.from(container.querySelectorAll('.settings-accordion > details > summary')).map(
      s => s.textContent
    );
    expect(summaries).toEqual([
      'Data Management',
      'Grid Mode (Popup)',
      'Appearance',
      'Pagination',
      'Toolbar Features',
      'Code Snippet',
    ]);
  });

  it('all panels start closed when openPanels is empty', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const allDetails = container.querySelectorAll('details');
    expect(allDetails.length).toBeGreaterThan(0);
    allDetails.forEach(d => expect((d as HTMLDetailsElement).open).toBe(false));
  });
});

describe('Data Management panel', () => {
  it('defaults to the API sub-tab with request/headers/auth/entry/fetch fields', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Data Management');
    const apiBtn = panel.querySelector('.tab-btn') as HTMLButtonElement;
    expect(apiBtn.textContent).toBe('API');
    expect(apiBtn.className).toContain('tab-btn-active');

    expect(panel.querySelector('.settings-method-select')).toBeTruthy();
    expect(panel.querySelector('.settings-fetch-button')).toBeTruthy();
    expect(panel.querySelectorAll('.settings-label')[0].textContent).toBe('Request');
    expect(panel.querySelector('.settings-textarea-short')).toBeTruthy(); // headers textarea
  });

  it('populates the method select with httpMethods and marks the current apiMethod selected', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Data Management');
    const select = panel.querySelector('.settings-method-select') as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.value);
    expect(options).toEqual(gridSettingsMod.httpMethods);
    expect(select.value).toBe(gridSettingsMod.gridConfig.apiMethod);
  });

  it('changing the method select calls setSetting("apiMethod", value)', () => {
    const setSettingSpy = vi.spyOn(gridSettingsMod, 'setSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Data Management');
    const select = panel.querySelector('.settings-method-select') as HTMLSelectElement;
    select.value = 'POST';
    select.dispatchEvent(new Event('change'));
    expect(setSettingSpy).toHaveBeenCalledWith('apiMethod', 'POST');
    expect(gridSettingsMod.gridConfig.apiMethod).toBe('POST');
  });

  it('changing the URL input calls commitStringSetting("fetchUrl", value)', () => {
    const spy = vi.spyOn(gridSettingsMod, 'commitStringSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Data Management');
    const urlInput = panel.querySelector('.settings-input-wide') as HTMLInputElement;
    urlInput.value = 'https://new.example.com';
    urlInput.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('fetchUrl', 'https://new.example.com');
  });

  it('changing the headers textarea calls commitHeadersSetting', () => {
    const spy = vi.spyOn(gridSettingsMod, 'commitHeadersSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Data Management');
    const textarea = panel.querySelector('.settings-textarea-short') as HTMLTextAreaElement;
    textarea.value = 'X-Test: 1';
    textarea.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('X-Test: 1');
  });

  it('changing the auth token input calls commitStringSetting("authToken", value)', () => {
    const spy = vi.spyOn(gridSettingsMod, 'commitStringSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Data Management');
    const inputs = Array.from(panel.querySelectorAll('.settings-input-wide')) as HTMLInputElement[];
    const authInput = inputs[1];
    authInput.value = 'secret-token';
    authInput.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('authToken', 'secret-token');
  });

  it('changing the entry section input calls commitStringSetting("entrySection", value)', () => {
    const spy = vi.spyOn(gridSettingsMod, 'commitStringSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Data Management');
    const inputs = Array.from(panel.querySelectorAll('.settings-input-wide')) as HTMLInputElement[];
    const entryInput = inputs[2];
    entryInput.value = 'data.items';
    entryInput.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('entrySection', 'data.items');
  });

  it('clicking Fetch calls triggerFetch', () => {
    const spy = vi.spyOn(gridSettingsMod, 'triggerFetch');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Data Management');
    const fetchBtn = panel.querySelector('.settings-fetch-button') as HTMLButtonElement;
    fetchBtn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('switches to the JSON sub-tab and shows the data-source textarea', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Data Management');
    const jsonBtn = panel.querySelectorAll('.tab-btn')[1] as HTMLButtonElement;
    expect(jsonBtn.textContent).toBe('JSON');
    jsonBtn.click();

    panel = detailsFor(container, 'Data Management');
    const apiBtn = panel.querySelectorAll('.tab-btn')[0] as HTMLButtonElement;
    const jsonBtnAfter = panel.querySelectorAll('.tab-btn')[1] as HTMLButtonElement;
    expect(apiBtn.className).not.toContain('tab-btn-active');
    expect(jsonBtnAfter.className).toContain('tab-btn-active');

    const dataTextarea = panel.querySelector('.settings-textarea') as HTMLTextAreaElement;
    expect(dataTextarea).toBeTruthy();
    expect(dataTextarea.value).toBe(JSON.stringify(gridSettingsMod.gridConfig.dataSource, null, 2));
    // API-only fields should no longer be present
    expect(panel.querySelector('.settings-method-select')).toBeNull();
  });

  it('switching back to the API sub-tab restores the API fields', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Data Management');
    (panel.querySelectorAll('.tab-btn')[1] as HTMLButtonElement).click();
    panel = detailsFor(container, 'Data Management');
    (panel.querySelectorAll('.tab-btn')[0] as HTMLButtonElement).click();
    panel = detailsFor(container, 'Data Management');
    expect(panel.querySelector('.settings-method-select')).toBeTruthy();
  });

  it('changing the JSON data-source textarea calls commitJsonSetting("dataSource", value)', () => {
    const spy = vi.spyOn(gridSettingsMod, 'commitJsonSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Data Management');
    (panel.querySelectorAll('.tab-btn')[1] as HTMLButtonElement).click();
    panel = detailsFor(container, 'Data Management');
    const dataTextarea = panel.querySelector('.settings-textarea') as HTMLTextAreaElement;
    dataTextarea.value = '[1,2]';
    dataTextarea.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('dataSource', '[1,2]');
  });

  it('shows the jsonError message under the JSON tab when set', () => {
    gridSettingsMod.commitJsonSetting('dataSource', '{{{invalid');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Data Management');
    (panel.querySelectorAll('.tab-btn')[1] as HTMLButtonElement).click();
    panel = detailsFor(container, 'Data Management');
    const error = panel.querySelector('.settings-error');
    expect(error?.textContent).toBe('Invalid JSON — change was not applied.');
  });

  it('does not render a jsonError message under the JSON tab when unset', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Data Management');
    (panel.querySelectorAll('.tab-btn')[1] as HTMLButtonElement).click();
    panel = detailsFor(container, 'Data Management');
    expect(panel.querySelector('.settings-error')).toBeNull();
  });

  it('opening/closing the Data Management <details> updates openPanels (toggle listener)', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Data Management');
    panel.open = true;
    panel.dispatchEvent(new Event('toggle'));

    // trigger a rerender via an unrelated action and confirm the panel stays open
    (panel.querySelectorAll('.tab-btn')[1] as HTMLButtonElement).click();
    panel = detailsFor(container, 'Data Management');
    expect(panel.open).toBe(true);

    panel.open = false;
    panel.dispatchEvent(new Event('toggle'));
    (panel.querySelectorAll('.tab-btn')[0] as HTMLButtonElement).click();
    panel = detailsFor(container, 'Data Management');
    expect(panel.open).toBe(false);
  });
});

describe('boolean controls', () => {
  it('renders a checked checkbox reflecting gridConfig, and toggling calls setSetting', () => {
    const setSettingSpy = vi.spyOn(gridSettingsMod, 'setSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Appearance');
    const rows = Array.from(panel.querySelectorAll('.settings-row'));
    const tableBorderRow = rows.find(r => r.querySelector('.settings-label')?.textContent === 'Table Border')!;
    const checkbox = tableBorderRow.querySelector('input[type=checkbox]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true); // tableBorder defaults to true

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    expect(setSettingSpy).toHaveBeenCalledWith('tableBorder', false);
    expect(gridSettingsMod.gridConfig.tableBorder).toBe(false);
  });

  it('reflects a false default (showIndex) as unchecked', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Appearance');
    const rows = Array.from(panel.querySelectorAll('.settings-row'));
    const showIndexRow = rows.find(r => r.querySelector('.settings-label')?.textContent === 'Show Index')!;
    const checkbox = showIndexRow.querySelector('input[type=checkbox]') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });
});

describe('number controls', () => {
  it('renders the current numeric value and toggling calls setSetting with a Number', () => {
    const setSettingSpy = vi.spyOn(gridSettingsMod, 'setSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Pagination');
    const rows = Array.from(panel.querySelectorAll('.settings-row'));
    const row = rows.find(r => r.querySelector('.settings-label')?.textContent === 'Current Paging Size')!;
    const input = row.querySelector('input[type=number]') as HTMLInputElement;
    expect(input.value).toBe('10');

    input.value = '25';
    input.dispatchEvent(new Event('change'));

    expect(setSettingSpy).toHaveBeenCalledWith('currentPagingSize', 25);
    expect(gridSettingsMod.gridConfig.currentPagingSize).toBe(25);
  });
});

describe('string (default) controls - pagingSizes', () => {
  it('commits on blur via commitStringSetting', () => {
    const spy = vi.spyOn(gridSettingsMod, 'commitStringSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Pagination');
    const rows = Array.from(panel.querySelectorAll('.settings-row'));
    const row = rows.find(r => r.querySelector('.settings-label')?.textContent === 'Paging Sizes')!;
    const input = row.querySelector('.settings-input') as HTMLInputElement;
    input.value = '5,15,25';
    input.dispatchEvent(new Event('blur'));
    expect(spy).toHaveBeenCalledWith('pagingSizes', '5,15,25');
  });

  it('commits on Enter keyup via commitStringSetting', () => {
    const spy = vi.spyOn(gridSettingsMod, 'commitStringSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Pagination');
    const rows = Array.from(panel.querySelectorAll('.settings-row'));
    const row = rows.find(r => r.querySelector('.settings-label')?.textContent === 'Paging Sizes')!;
    const input = row.querySelector('.settings-input') as HTMLInputElement;
    input.value = '1,2,3';
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    expect(spy).toHaveBeenCalledWith('pagingSizes', '1,2,3');
  });

  it('does NOT commit on a non-Enter keyup', () => {
    const spy = vi.spyOn(gridSettingsMod, 'commitStringSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Pagination');
    const rows = Array.from(panel.querySelectorAll('.settings-row'));
    const row = rows.find(r => r.querySelector('.settings-label')?.textContent === 'Paging Sizes')!;
    const input = row.querySelector('.settings-input') as HTMLInputElement;
    input.value = '1,2,3';
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('radio controls (Grid Mode)', () => {
  it('renders one radio per option with the current value checked', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Grid Mode');
    const radios = Array.from(panel.querySelectorAll('input[type=radio]')) as HTMLInputElement[];
    expect(radios.map(r => r.value)).toEqual(['popup', 'row', 'batch']);
    expect(radios.find(r => r.value === 'popup')?.checked).toBe(true);
    expect(radios.find(r => r.value === 'row')?.checked).toBe(false);
  });

  it('selecting a different radio calls setSetting with the option value', () => {
    const setSettingSpy = vi.spyOn(gridSettingsMod, 'setSetting');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Grid Mode');
    const radios = Array.from(panel.querySelectorAll('input[type=radio]')) as HTMLInputElement[];
    const rowRadio = radios.find(r => r.value === 'row')!;
    rowRadio.checked = true;
    rowRadio.dispatchEvent(new Event('change'));
    expect(setSettingSpy).toHaveBeenCalledWith('gridMode', 'row');
  });

  it.each([
    ['batch', 'Batch'],
    ['row', 'Row'],
    ['popup', 'Popup'],
  ])('shows "%s" as "%s" in the Grid Mode summary', (mode, label) => {
    gridSettingsMod.setSetting('gridMode', mode);
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Grid Mode');
    expect(panel.querySelector('summary')?.textContent).toBe(`Grid Mode (${label})`);
  });
});

describe('Code Snippet panel', () => {
  it('shows the snippet matching the active tab label', () => {
    vi.mocked(rootConfigMod.getActiveTabLabel).mockReturnValue('Angular');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Code Snippet');
    const code = panel.querySelector('pre > code');
    expect(code?.textContent).toContain('rsivri-grid');
  });

  it('renders an empty snippet when the active tab label has no matching snippet', () => {
    vi.mocked(rootConfigMod.getActiveTabLabel).mockReturnValue('Unknown Tab');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const panel = detailsFor(container, 'Code Snippet');
    const code = panel.querySelector('pre > code');
    expect(code?.textContent).toBe('');
  });

  it('updates the snippet after a hashchange-triggered rerender', () => {
    vi.mocked(rootConfigMod.getActiveTabLabel).mockReturnValue('React');
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Code Snippet');
    expect(panel.querySelector('pre > code')?.textContent).toContain('RsDataGrid');

    vi.mocked(rootConfigMod.getActiveTabLabel).mockReturnValue('Vue');
    window.dispatchEvent(new Event('hashchange'));

    panel = detailsFor(container, 'Code Snippet');
    expect(panel.querySelector('pre > code')?.textContent).toContain('RsDataGrid.vue');
  });
});

describe('rerender wiring', () => {
  it('does nothing when rerender is invoked before renderSidebar sets a container', () => {
    // Registering the rerender hook happens inside renderSidebar, so exercising
    // this guard means calling the hook directly before any container exists.
    // We reach it via the hashchange listener registered by a previous test's
    // module instance being gone (fresh module here) -- so nothing is wired
    // yet, and dispatching hashchange must not throw.
    expect(() => window.dispatchEvent(new Event('hashchange'))).not.toThrow();
  });

  it('rebuilds the DOM (fresh nodes) on hashchange', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    const before = container.querySelector('.settings-accordion');
    window.dispatchEvent(new Event('hashchange'));
    const after = container.querySelector('.settings-accordion');
    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
  });

  it('openPanels persists open state for a group panel across rerenders', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Appearance');
    panel.open = true;
    panel.dispatchEvent(new Event('toggle'));

    window.dispatchEvent(new Event('hashchange'));

    panel = detailsFor(container, 'Appearance');
    expect(panel.open).toBe(true);

    panel.open = false;
    panel.dispatchEvent(new Event('toggle'));
    window.dispatchEvent(new Event('hashchange'));
    panel = detailsFor(container, 'Appearance');
    expect(panel.open).toBe(false);
  });

  it('openPanels persists open state for the Code Snippet panel across rerenders', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Code Snippet');
    panel.open = true;
    panel.dispatchEvent(new Event('toggle'));
    window.dispatchEvent(new Event('hashchange'));
    panel = detailsFor(container, 'Code Snippet');
    expect(panel.open).toBe(true);
  });

  it('closing the Code Snippet panel removes it from openPanels (toggle-close branch)', () => {
    const container = makeContainer();
    sidebarMod.renderSidebar(container);
    let panel = detailsFor(container, 'Code Snippet');
    panel.open = true;
    panel.dispatchEvent(new Event('toggle'));
    window.dispatchEvent(new Event('hashchange'));
    panel = detailsFor(container, 'Code Snippet');
    expect(panel.open).toBe(true);

    panel.open = false;
    panel.dispatchEvent(new Event('toggle'));
    window.dispatchEvent(new Event('hashchange'));
    panel = detailsFor(container, 'Code Snippet');
    expect(panel.open).toBe(false);
  });
});

describe('json-type and options-less radio settings (schema edge cases)', () => {
  it('renders a JSON textarea control and shows jsonError beneath it when settingsGroups includes a json-type setting', async () => {
    vi.resetModules();
    let jsonErrorOverride: string | null = 'Invalid JSON — change was not applied.';
    vi.doMock('./grid-settings', async () => {
      const actual = await vi.importActual<typeof import('./grid-settings')>('./grid-settings');
      return {
        ...actual,
        get jsonError() {
          return jsonErrorOverride;
        },
        settingsGroups: [
          ...actual.settingsGroups,
          {
            title: 'Extra',
            settings: [
              { key: 'dataSource', label: 'Raw JSON', type: 'json' },
              { key: 'gridMode', label: 'No Options Radio', type: 'radio' },
            ],
          },
        ],
      };
    });
    const gs = await import('./grid-settings');
    const commitJsonSpy = vi.spyOn(gs, 'commitJsonSetting');
    const sb = await import('./sidebar');

    const container = makeContainer();
    sb.renderSidebar(container);
    const panel = detailsFor(container, 'Extra');

    const rows = Array.from(panel.querySelectorAll('.settings-row'));
    const jsonRow = rows.find(r => r.querySelector('.settings-label')?.textContent === 'Raw JSON')!;
    expect(jsonRow.className).toContain('settings-row-column');
    const textarea = jsonRow.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe(JSON.stringify(gs.gridConfig.dataSource, null, 2));

    textarea.value = '[9]';
    textarea.dispatchEvent(new Event('change'));
    expect(commitJsonSpy).toHaveBeenCalledWith('dataSource', '[9]');

    // jsonError should render inside the panel body for the json-type row
    const errorNodes = Array.from(panel.querySelectorAll('.settings-error'));
    expect(errorNodes.length).toBeGreaterThan(0);

    // radio row with no options renders an empty group without throwing
    const noOptionsRow = rows.find(r => r.querySelector('.settings-label')?.textContent === 'No Options Radio')!;
    const radioGroup = noOptionsRow.querySelector('.settings-radio-group');
    expect(radioGroup?.children.length).toBe(0);

    vi.doUnmock('./grid-settings');
  });
});
