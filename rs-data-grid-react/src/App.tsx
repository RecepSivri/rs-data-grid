import { useRef, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Switch from '@mui/material/Switch';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import './App.scss';
import { RsDataGrid, RsDataGridHandle } from './components/rsDataGrid/rsDataGrid';

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

const initialGridConfig: Record<string, any> = {
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
  exportExcel: true,
  exportPDF: true,
  currentPagingSize: 10,
  pageListSize: 5,
  gridMode: 'popup',
};

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

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#8a8d90' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#8a8d90' },
};

const radioSx = {
  color: '#8a8d90',
  '&.Mui-checked': { color: '#8a8d90' },
};

function App() {
  const gridRef = useRef<RsDataGridHandle>(null);
  const [gridConfig, setGridConfig] = useState<Record<string, any>>(initialGridConfig);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dataTab, setDataTab] = useState(0);

  const onGridRowAdd = (row: any) => console.log('Added row:', row);
  const onGridRowEdit = (row: any) => console.log('Edit row:', row);
  const onGridRowDelete = (row: any) => console.log('Deleted row:', row);

  const onCommitStringSetting = (key: string, raw: string) => {
    if (key === 'pagingSizes') {
      const parsed = raw
        .split(',')
        .map(part => Number(part.trim()))
        .filter(value => !Number.isNaN(value));
      setGridConfig(prev => ({ ...prev, [key]: parsed }));
      return;
    }
    setGridConfig(prev => ({ ...prev, [key]: raw }));
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
    setGridConfig(prev => ({ ...prev, apiHeadersRaw: raw, apiHeaders: headers }));
  };

  const onCommitJsonSetting = (key: string, raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      setJsonError(null);
      setGridConfig(prev => ({ ...prev, [key]: [] }));
      return;
    }
    try {
      const parsed = parseLooseJson(trimmed);
      setJsonError(null);
      setGridConfig(prev => ({ ...prev, [key]: Array.isArray(parsed) ? parsed : [parsed] }));
    } catch {
      setJsonError('Invalid JSON — change was not applied.');
    }
  };

  const renderSettingControl = (setting: GridSetting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <Switch
            sx={switchSx}
            checked={!!gridConfig[setting.key]}
            onChange={e => setGridConfig(prev => ({ ...prev, [setting.key]: e.target.checked }))}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className="settings-input"
            value={gridConfig[setting.key]}
            onChange={e => setGridConfig(prev => ({ ...prev, [setting.key]: Number(e.target.value) }))}
          />
        );
      case 'json':
        return (
          <textarea
            className="settings-textarea"
            defaultValue={JSON.stringify(gridConfig[setting.key], null, 2)}
            onBlur={e => onCommitJsonSetting(setting.key, e.target.value)}
          />
        );
      case 'radio':
        return (
          <RadioGroup
            row
            value={gridConfig[setting.key]}
            onChange={e => setGridConfig(prev => ({ ...prev, [setting.key]: e.target.value }))}
          >
            {setting.options?.map(option => (
              <FormControlLabel key={option.value} value={option.value} control={<Radio sx={radioSx} size="small" />} label={option.label} />
            ))}
          </RadioGroup>
        );
      default:
        return (
          <input
            key={gridConfig[setting.key]}
            type="text"
            className="settings-input"
            defaultValue={gridConfig[setting.key]}
            onKeyUp={e => {
              if (e.key === 'Enter') {
                onCommitStringSetting(setting.key, (e.target as HTMLInputElement).value);
              }
            }}
          />
        );
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'row', margin: 0 }}>
      <div className="app-sidenav">
        <div className="sidenav-title">Grid Settings</div>
        <div className="settings-accordion">
          <Accordion className="no-scroll-panel">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <span className="panel-title">Data Management</span>
            </AccordionSummary>
            <AccordionDetails>
              <Tabs className="data-source-tabs" value={dataTab} onChange={(_e, value) => setDataTab(value)}>
                <Tab label="API" />
                <Tab label="JSON" />
              </Tabs>
              {dataTab === 0 && (
                <div className="settings-tab-content">
                  <div className="settings-row settings-row-column">
                    <label className="settings-label">Request</label>
                    <div className="postman-row">
                      <select
                        className="settings-input settings-method-select"
                        value={gridConfig.apiMethod}
                        onChange={e => setGridConfig(prev => ({ ...prev, apiMethod: e.target.value }))}
                      >
                        {httpMethods.map(method => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="settings-input settings-input-wide"
                        value={gridConfig.fetchUrl}
                        onChange={e => onCommitStringSetting('fetchUrl', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="settings-row settings-row-column">
                    <label className="settings-label">Headers</label>
                    <textarea
                      className="settings-textarea settings-textarea-short"
                      placeholder="Content-Type: application/json"
                      value={gridConfig.apiHeadersRaw}
                      onChange={e => onCommitHeadersSetting(e.target.value)}
                    />
                  </div>
                  <div className="settings-row settings-row-column">
                    <label className="settings-label">Auth Token (Bearer)</label>
                    <input
                      type="text"
                      className="settings-input settings-input-wide"
                      value={gridConfig.authToken}
                      onChange={e => onCommitStringSetting('authToken', e.target.value)}
                    />
                  </div>
                  <div className="settings-row settings-row-column">
                    <label className="settings-label">Entry Section</label>
                    <input
                      type="text"
                      className="settings-input settings-input-wide"
                      placeholder="e.g. data or data.items or data.arr[0]"
                      value={gridConfig.entrySection}
                      onChange={e => onCommitStringSetting('entrySection', e.target.value)}
                    />
                  </div>
                  <div className="settings-row">
                    <button type="button" className="settings-fetch-button" onClick={() => gridRef.current?.fetchNow()}>
                      Fetch
                    </button>
                  </div>
                </div>
              )}
              {dataTab === 1 && (
                <div className="settings-tab-content">
                  <div className="settings-row settings-row-column">
                    <label className="settings-label">Data Source (JSON)</label>
                    <textarea
                      className="settings-textarea"
                      defaultValue={JSON.stringify(gridConfig.dataSource, null, 2)}
                      onBlur={e => onCommitJsonSetting('dataSource', e.target.value)}
                    />
                    {jsonError && <div className="settings-error">{jsonError}</div>}
                  </div>
                </div>
              )}
            </AccordionDetails>
          </Accordion>
          {settingsGroups.map(group => (
            <Accordion key={group.title}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <span className="panel-title">
                  {group.title}
                  {group.title === 'Grid Mode' && (
                    <span className="panel-title-muted">({gridConfig.gridMode === 'batch' ? 'Batch' : 'Popup'})</span>
                  )}
                </span>
              </AccordionSummary>
              <AccordionDetails>
                {group.settings.map(setting => (
                  <div key={setting.key}>
                    <div className={'settings-row' + (setting.type === 'json' || setting.type === 'radio' ? ' settings-row-column' : '')}>
                      <label className="settings-label">{setting.label}</label>
                      {renderSettingControl(setting)}
                    </div>
                    {setting.type === 'json' && jsonError && <div className="settings-error">{jsonError}</div>}
                  </div>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      </div>
      <div style={{ width: '80%' }}>
        <RsDataGrid
          ref={gridRef}
          fetchUrl={gridConfig.fetchUrl}
          fetchMethod={gridConfig.apiMethod}
          fetchHeaders={gridConfig.apiHeaders}
          authToken={gridConfig.authToken}
          entrySection={gridConfig.entrySection}
          remoteMode={gridConfig.remoteMode}
          dataSource={gridConfig.dataSource}
          headerRowLines={gridConfig.headerRowLines}
          headerColumnLines={gridConfig.headerColumnLines}
          showFilter={gridConfig.showFilter}
          showSort={gridConfig.showSort}
          showSearch={gridConfig.showSearch}
          showActions={gridConfig.showActions}
          showAdd={gridConfig.showAdd}
          gridMode={gridConfig.gridMode}
          exportExcel={gridConfig.exportExcel}
          exportPDF={gridConfig.exportPDF}
          onRowAdd={onGridRowAdd}
          onRowEdit={onGridRowEdit}
          onRowDelete={onGridRowDelete}
          bodyRowLines={gridConfig.bodyRowLines}
          bodyColumnLines={gridConfig.bodyColumnLines}
          tableBorder={gridConfig.tableBorder}
          borderRadiusTop={gridConfig.borderRadiusTop}
          borderRadiusBottom={gridConfig.borderRadiusBottom}
          diagonalRow={gridConfig.diagonalRow}
          pagination={gridConfig.pagination}
          pagingSizes={gridConfig.pagingSizes}
          currentPagingSize={gridConfig.currentPagingSize}
          pageListSize={gridConfig.pageListSize}
        />
      </div>
    </div>
  );
}

export default App;
