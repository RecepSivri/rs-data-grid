import {
  gridConfig,
  settingsGroups,
  httpMethods,
  jsonError,
  commitStringSetting,
  commitHeadersSetting,
  commitJsonSetting,
  setSetting,
  triggerFetch,
  setRerenderHook,
  GridSetting,
} from './grid-settings';

const openPanels = new Set<string>();
let activeDataTab: 'api' | 'json' = 'api';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildDataManagementPanel(): HTMLDetailsElement {
  const panel = el('details', 'settings-panel');
  panel.open = openPanels.has('Data Management');
  panel.addEventListener('toggle', () => {
    if (panel.open) openPanels.add('Data Management');
    else openPanels.delete('Data Management');
  });

  const summary = el('summary', 'panel-title', 'Data Management');
  panel.appendChild(summary);

  const body = el('div', 'settings-panel-body');

  const tabs = el('div', 'data-source-tabs');
  const apiTabBtn = el('button', 'tab-btn' + (activeDataTab === 'api' ? ' tab-btn-active' : ''), 'API');
  apiTabBtn.type = 'button';
  const jsonTabBtn = el('button', 'tab-btn' + (activeDataTab === 'json' ? ' tab-btn-active' : ''), 'JSON');
  jsonTabBtn.type = 'button';
  apiTabBtn.addEventListener('click', () => {
    activeDataTab = 'api';
    rerender();
  });
  jsonTabBtn.addEventListener('click', () => {
    activeDataTab = 'json';
    rerender();
  });
  tabs.append(apiTabBtn, jsonTabBtn);
  body.appendChild(tabs);

  if (activeDataTab === 'api') {
    const tabContent = el('div', 'settings-tab-content');

    const requestRow = el('div', 'settings-row settings-row-column');
    requestRow.appendChild(el('label', 'settings-label', 'Request'));
    const postmanRow = el('div', 'postman-row');
    const methodSelect = el('select', 'settings-input settings-method-select');
    for (const method of httpMethods) {
      const option = el('option', undefined, method);
      option.value = method;
      if (method === gridConfig.apiMethod) option.selected = true;
      methodSelect.appendChild(option);
    }
    methodSelect.addEventListener('change', () => setSetting('apiMethod', methodSelect.value));
    const urlInput = el('input', 'settings-input settings-input-wide') as HTMLInputElement;
    urlInput.type = 'text';
    urlInput.value = gridConfig.fetchUrl;
    urlInput.addEventListener('change', () => commitStringSetting('fetchUrl', urlInput.value));
    postmanRow.append(methodSelect, urlInput);
    requestRow.appendChild(postmanRow);
    tabContent.appendChild(requestRow);

    const headersRow = el('div', 'settings-row settings-row-column');
    headersRow.appendChild(el('label', 'settings-label', 'Headers'));
    const headersTextarea = el('textarea', 'settings-textarea settings-textarea-short') as HTMLTextAreaElement;
    headersTextarea.placeholder = 'Content-Type: application/json';
    headersTextarea.value = gridConfig.apiHeadersRaw;
    headersTextarea.addEventListener('change', () => commitHeadersSetting(headersTextarea.value));
    headersRow.appendChild(headersTextarea);
    tabContent.appendChild(headersRow);

    const authRow = el('div', 'settings-row settings-row-column');
    authRow.appendChild(el('label', 'settings-label', 'Auth Token (Bearer)'));
    const authInput = el('input', 'settings-input settings-input-wide') as HTMLInputElement;
    authInput.type = 'text';
    authInput.value = gridConfig.authToken;
    authInput.addEventListener('change', () => commitStringSetting('authToken', authInput.value));
    authRow.appendChild(authInput);
    tabContent.appendChild(authRow);

    const entryRow = el('div', 'settings-row settings-row-column');
    entryRow.appendChild(el('label', 'settings-label', 'Entry Section'));
    const entryInput = el('input', 'settings-input settings-input-wide') as HTMLInputElement;
    entryInput.type = 'text';
    entryInput.placeholder = 'e.g. data or data.items or data.arr[0]';
    entryInput.value = gridConfig.entrySection;
    entryInput.addEventListener('change', () => commitStringSetting('entrySection', entryInput.value));
    entryRow.appendChild(entryInput);
    tabContent.appendChild(entryRow);

    const fetchRow = el('div', 'settings-row');
    const fetchBtn = el('button', 'settings-fetch-button', 'Fetch');
    fetchBtn.type = 'button';
    fetchBtn.addEventListener('click', () => triggerFetch());
    fetchRow.appendChild(fetchBtn);
    tabContent.appendChild(fetchRow);

    body.appendChild(tabContent);
  } else {
    const tabContent = el('div', 'settings-tab-content');
    const dataRow = el('div', 'settings-row settings-row-column');
    dataRow.appendChild(el('label', 'settings-label', 'Data Source (JSON)'));
    const dataTextarea = el('textarea', 'settings-textarea') as HTMLTextAreaElement;
    dataTextarea.value = JSON.stringify(gridConfig.dataSource, null, 2);
    dataTextarea.addEventListener('change', () => commitJsonSetting('dataSource', dataTextarea.value));
    dataRow.appendChild(dataTextarea);
    if (jsonError) {
      dataRow.appendChild(el('div', 'settings-error', jsonError));
    }
    tabContent.appendChild(dataRow);
    body.appendChild(tabContent);
  }

  panel.appendChild(body);
  return panel;
}

function buildSettingControl(setting: GridSetting): HTMLElement {
  switch (setting.type) {
    case 'boolean': {
      const label = el('label', 'switch');
      const input = el('input') as HTMLInputElement;
      input.type = 'checkbox';
      input.checked = !!gridConfig[setting.key];
      input.addEventListener('change', () => setSetting(setting.key, input.checked));
      const track = el('span', 'switch-track');
      label.append(input, track);
      return label;
    }
    case 'number': {
      const input = el('input', 'settings-input') as HTMLInputElement;
      input.type = 'number';
      input.value = String(gridConfig[setting.key]);
      input.addEventListener('change', () => setSetting(setting.key, Number(input.value)));
      return input;
    }
    case 'json': {
      const textarea = el('textarea', 'settings-textarea') as HTMLTextAreaElement;
      textarea.value = JSON.stringify(gridConfig[setting.key], null, 2);
      textarea.addEventListener('change', () => commitJsonSetting(setting.key, textarea.value));
      return textarea;
    }
    case 'radio': {
      const group = el('div', 'settings-radio-group');
      for (const option of setting.options ?? []) {
        const label = el('label', 'settings-radio-option');
        const input = el('input') as HTMLInputElement;
        input.type = 'radio';
        input.name = setting.key;
        input.value = option.value;
        input.checked = gridConfig[setting.key] === option.value;
        input.addEventListener('change', () => setSetting(setting.key, option.value));
        label.append(input, document.createTextNode(option.label));
        group.appendChild(label);
      }
      return group;
    }
    default: {
      const input = el('input', 'settings-input') as HTMLInputElement;
      input.type = 'text';
      input.value = gridConfig[setting.key];
      input.addEventListener('keyup', event => {
        if (event.key === 'Enter') commitStringSetting(setting.key, input.value);
      });
      input.addEventListener('blur', () => commitStringSetting(setting.key, input.value));
      return input;
    }
  }
}

function buildGroupPanel(title: string, settings: GridSetting[]): HTMLDetailsElement {
  const panel = el('details', 'settings-panel');
  panel.open = openPanels.has(title);
  panel.addEventListener('toggle', () => {
    if (panel.open) openPanels.add(title);
    else openPanels.delete(title);
  });

  const summary = el('summary', 'panel-title');
  summary.appendChild(document.createTextNode(title));
  if (title === 'Grid Mode') {
    const modeLabel = gridConfig.gridMode === 'batch' ? 'Batch' : gridConfig.gridMode === 'row' ? 'Row' : 'Popup';
    summary.appendChild(el('span', 'panel-title-muted', ` (${modeLabel})`));
  }
  panel.appendChild(summary);

  const body = el('div', 'settings-panel-body');
  for (const setting of settings) {
    const row = el('div', 'settings-row' + (setting.type === 'json' || setting.type === 'radio' ? ' settings-row-column' : ''));
    row.appendChild(el('label', 'settings-label', setting.label));
    row.appendChild(buildSettingControl(setting));
    body.appendChild(row);
    if (setting.type === 'json' && jsonError) {
      body.appendChild(el('div', 'settings-error', jsonError));
    }
  }
  panel.appendChild(body);
  return panel;
}

let containerRef: HTMLElement | null = null;

function rerender(): void {
  if (!containerRef) return;
  containerRef.innerHTML = '';
  containerRef.appendChild(el('div', 'sidenav-title', 'Grid Settings'));
  const accordion = el('div', 'settings-accordion');
  accordion.appendChild(buildDataManagementPanel());
  for (const group of settingsGroups) {
    accordion.appendChild(buildGroupPanel(group.title, group.settings));
  }
  containerRef.appendChild(accordion);
}

export function renderSidebar(container: HTMLElement): void {
  containerRef = container;
  container.className = 'app-sidenav';
  setRerenderHook(rerender);
  window.addEventListener('hashchange', rerender);
  rerender();

  // Off-canvas drawer on narrow screens (see the max-width media query in
  // style.css): toggle button opens/closes it, backdrop click or picking a
  // tab closes it again.
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const backdrop = document.getElementById('sidebar-backdrop');
  const closeDrawer = () => {
    container.classList.remove('app-sidenav-open');
    backdrop?.classList.remove('visible');
  };
  const openDrawer = () => {
    container.classList.add('app-sidenav-open');
    backdrop?.classList.add('visible');
  };
  toggleBtn?.addEventListener('click', () => {
    container.classList.contains('app-sidenav-open') ? closeDrawer() : openDrawer();
  });
  backdrop?.addEventListener('click', closeDrawer);
  window.addEventListener('hashchange', closeDrawer);
}
