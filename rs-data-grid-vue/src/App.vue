<script setup lang="ts">
import { reactive, ref } from 'vue';
import RsDataGrid from './components/rsDataGrid/RsDataGrid.vue';

interface RadioOption {
  value: string;
  label: string;
}

interface GridSetting {
  key: string;
  label: string;
  type: 'boolean' | 'string' | 'number' | 'json' | 'radio';
  options?: RadioOption[];
}

interface SettingsGroup {
  title: string;
  settings: GridSetting[];
}

const httpMethods: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const gridConfig = reactive<Record<string, any>>({
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
});

const settingsGroups: SettingsGroup[] = [
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

const parseLooseJson = (raw: string): any => {
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
};

const gridRef = ref<InstanceType<typeof RsDataGrid> | null>(null);
const jsonError = ref<string | null>(null);
const dataTab = ref(0);

const onGridRowAdd = (row: any) => console.log('Added row:', row);
const onGridRowEdit = (row: any) => console.log('Edit row:', row);
const onGridRowDelete = (row: any) => console.log('Deleted row:', row);
const onGridBatchSave = (payload: { added: any[]; updated: { original: any; updated: any }[] }) => console.log('Batch save:', payload);

const onCommitStringSetting = (key: string, raw: string) => {
  if (key === 'pagingSizes') {
    gridConfig[key] = raw
      .split(',')
      .map(part => Number(part.trim()))
      .filter(value => !Number.isNaN(value));
    return;
  }
  gridConfig[key] = raw;
};

const onCommitHeadersSetting = (raw: string) => {
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
};

const onCommitJsonSetting = (key: string, raw: string) => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    jsonError.value = null;
    gridConfig[key] = [];
    return;
  }
  try {
    const parsed = parseLooseJson(trimmed);
    jsonError.value = null;
    gridConfig[key] = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    jsonError.value = 'Invalid JSON — change was not applied.';
  }
};

const onStringSettingKeyup = (key: string, event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    onCommitStringSetting(key, (event.target as HTMLInputElement).value);
  }
};
</script>

<template>
  <div style="width: 100%; min-height: 100vh; display: flex; flex-direction: row; margin: 0">
    <div class="app-sidenav">
      <div class="sidenav-title">Grid Settings</div>
      <v-expansion-panels class="settings-accordion" multiple variant="accordion">
        <v-expansion-panel class="no-scroll-panel">
          <v-expansion-panel-title>
            <span class="panel-title">Data Management</span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-tabs v-model="dataTab" class="data-source-tabs" density="compact">
              <v-tab :value="0">API</v-tab>
              <v-tab :value="1">JSON</v-tab>
            </v-tabs>
            <v-window v-model="dataTab">
              <v-window-item :value="0">
                <div class="settings-tab-content">
                  <div class="settings-row settings-row-column">
                    <label class="settings-label">Request</label>
                    <div class="postman-row">
                      <select class="settings-input settings-method-select" v-model="gridConfig.apiMethod">
                        <option v-for="method in httpMethods" :key="method" :value="method">{{ method }}</option>
                      </select>
                      <input
                        type="text"
                        class="settings-input settings-input-wide"
                        :value="gridConfig.fetchUrl"
                        @input="onCommitStringSetting('fetchUrl', ($event.target as HTMLInputElement).value)"
                      />
                    </div>
                  </div>
                  <div class="settings-row settings-row-column">
                    <label class="settings-label">Headers</label>
                    <textarea
                      class="settings-textarea settings-textarea-short"
                      placeholder="Content-Type: application/json"
                      :value="gridConfig.apiHeadersRaw"
                      @input="onCommitHeadersSetting(($event.target as HTMLTextAreaElement).value)"
                    ></textarea>
                  </div>
                  <div class="settings-row settings-row-column">
                    <label class="settings-label">Auth Token (Bearer)</label>
                    <input
                      type="text"
                      class="settings-input settings-input-wide"
                      :value="gridConfig.authToken"
                      @input="onCommitStringSetting('authToken', ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="settings-row settings-row-column">
                    <label class="settings-label">Entry Section</label>
                    <input
                      type="text"
                      class="settings-input settings-input-wide"
                      placeholder="e.g. data or data.items or data.arr[0]"
                      :value="gridConfig.entrySection"
                      @input="onCommitStringSetting('entrySection', ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="settings-row">
                    <button type="button" class="settings-fetch-button" @click="gridRef?.fetchNow()">Fetch</button>
                  </div>
                </div>
              </v-window-item>
              <v-window-item :value="1">
                <div class="settings-tab-content">
                  <div class="settings-row settings-row-column">
                    <label class="settings-label">Data Source (JSON)</label>
                    <textarea
                      class="settings-textarea"
                      :value="JSON.stringify(gridConfig.dataSource, null, 2)"
                      @change="onCommitJsonSetting('dataSource', ($event.target as HTMLTextAreaElement).value)"
                    ></textarea>
                    <div v-if="jsonError" class="settings-error">{{ jsonError }}</div>
                  </div>
                </div>
              </v-window-item>
            </v-window>
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel v-for="group in settingsGroups" :key="group.title">
          <v-expansion-panel-title>
            <span class="panel-title">
              {{ group.title }}
              <span v-if="group.title === 'Grid Mode'" class="panel-title-muted">({{ gridConfig.gridMode === 'batch' ? 'Batch' : gridConfig.gridMode === 'row' ? 'Row' : 'Popup' }})</span>
            </span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <template v-for="setting in group.settings" :key="setting.key">
              <div class="settings-row" :class="{ 'settings-row-column': setting.type === 'json' || setting.type === 'radio' }">
                <label class="settings-label">{{ setting.label }}</label>
                <v-switch v-if="setting.type === 'boolean'" v-model="gridConfig[setting.key]" color="grey" hide-details density="compact"></v-switch>
                <input v-else-if="setting.type === 'number'" type="number" class="settings-input" v-model.number="gridConfig[setting.key]" />
                <textarea
                  v-else-if="setting.type === 'json'"
                  class="settings-textarea"
                  :value="JSON.stringify(gridConfig[setting.key], null, 2)"
                  @change="onCommitJsonSetting(setting.key, ($event.target as HTMLTextAreaElement).value)"
                ></textarea>
                <v-radio-group v-else-if="setting.type === 'radio'" v-model="gridConfig[setting.key]" inline hide-details density="compact">
                  <v-radio
                    v-for="option in setting.options"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                    color="grey"
                  ></v-radio>
                </v-radio-group>
                <input
                  v-else
                  type="text"
                  class="settings-input"
                  :value="gridConfig[setting.key]"
                  @keyup="onStringSettingKeyup(setting.key, $event)"
                />
              </div>
              <div v-if="setting.type === 'json' && jsonError" class="settings-error">{{ jsonError }}</div>
            </template>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <div style="width: 80%">
      <RsDataGrid
        ref="gridRef"
        :fetch-url="gridConfig.fetchUrl"
        :fetch-method="gridConfig.apiMethod"
        :fetch-headers="gridConfig.apiHeaders"
        :auth-token="gridConfig.authToken"
        :entry-section="gridConfig.entrySection"
        :remote-mode="gridConfig.remoteMode"
        :data-source="gridConfig.dataSource"
        :header-row-lines="gridConfig.headerRowLines"
        :header-column-lines="gridConfig.headerColumnLines"
        :show-filter="gridConfig.showFilter"
        :show-sort="gridConfig.showSort"
        :show-search="gridConfig.showSearch"
        :show-actions="gridConfig.showActions"
        :show-add="gridConfig.showAdd"
        :show-index="gridConfig.showIndex"
        :grid-mode="gridConfig.gridMode"
        :export-excel="gridConfig.exportExcel"
        :exportPDF="gridConfig.exportPDF"
        :body-row-lines="gridConfig.bodyRowLines"
        :body-column-lines="gridConfig.bodyColumnLines"
        :table-border="gridConfig.tableBorder"
        :border-radius-top="gridConfig.borderRadiusTop"
        :border-radius-bottom="gridConfig.borderRadiusBottom"
        :diagonal-row="gridConfig.diagonalRow"
        :pagination="gridConfig.pagination"
        :paging-sizes="gridConfig.pagingSizes"
        :current-paging-size="gridConfig.currentPagingSize"
        :page-list-size="gridConfig.pageListSize"
        @row-add="onGridRowAdd"
        @row-edit="onGridRowEdit"
        @row-delete="onGridRowDelete"
        @batch-save="onGridBatchSave"
      />
    </div>
  </div>
</template>

<style scoped src="./App.scss"></style>
