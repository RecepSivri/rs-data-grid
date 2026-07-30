import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { RsivriGridComponent } from './rsivri-grid/rsivri-grid.component';

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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RsivriGridComponent, FormsModule, MatSlideToggleModule, MatExpansionModule, MatRadioModule, MatTabsModule, MatButtonModule, JsonPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  httpMethods: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  gridConfig: Record<string, any> = {
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

  settingsGroups: SettingsGroup[] = [
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

  jsonError: string | null = null;

  private parseLooseJson(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      // Fall through to relaxed parsing (single-quoted strings, unquoted keys).
    }
    const withDoubleQuotedStrings = raw.replace(/'((?:[^'\\]|\\.)*)'/g, (_match, inner) => {
      const unescaped = (inner as string).replace(/\\'/g, "'");
      return `"${unescaped.replace(/"/g, '\\"')}"`;
    });
    const withQuotedKeys = withDoubleQuotedStrings.replace(
      /([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g,
      '$1"$2":'
    );
    return JSON.parse(withQuotedKeys);
  }

  onGridRowAdd(row: any): void {
    console.log('Added row:', row);
  }

  onGridRowEdit(row: any): void {
    console.log('Edit row:', row);
  }

  onGridRowDelete(row: any): void {
    console.log('Deleted row:', row);
  }

  onCommitStringSetting(key: string, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    if (key === 'pagingSizes') {
      const parsed = raw.split(',').map(part => Number(part.trim())).filter(value => !Number.isNaN(value));
      this.gridConfig = { ...this.gridConfig, [key]: parsed };
      return;
    }
    this.gridConfig = { ...this.gridConfig, [key]: raw };
  }

  onCommitHeadersSetting(event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value;
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
    this.gridConfig = { ...this.gridConfig, apiHeadersRaw: raw, apiHeaders: headers };
  }

  onCommitJsonSetting(key: string, event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value.trim();
    if (raw === '') {
      this.jsonError = null;
      this.gridConfig = { ...this.gridConfig, [key]: [] };
      return;
    }
    try {
      const parsed = this.parseLooseJson(raw);
      this.jsonError = null;
      this.gridConfig = { ...this.gridConfig, [key]: Array.isArray(parsed) ? parsed : [parsed] };
    } catch {
      this.jsonError = 'Invalid JSON — change was not applied.';
    }
  }
}
