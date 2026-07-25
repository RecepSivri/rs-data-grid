import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { RsivriGridComponent } from './rsivri-grid/rsivri-grid.component';

interface GridSetting {
  key: string;
  label: string;
  type: 'boolean' | 'string' | 'number' | 'json';
}

interface SettingsGroup {
  title: string;
  settings: GridSetting[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RsivriGridComponent, FormsModule, MatSlideToggleModule, MatExpansionModule, JsonPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  gridConfig: Record<string, any> = {
    fetchUrl: 'http://universities.hipolabs.com/search?country=United+States',
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
    showFilter: true,
    showSort: true,
    showSearch: true,
    exportExcel: true,
    exportPDF: true,
    currentPagingSize: 10,
    pageListSize: 5,
  };

  settingsGroups: SettingsGroup[] = [
    {
      title: 'Data',
      settings: [
        { key: 'fetchUrl', label: 'Fetch URL', type: 'string' },
        { key: 'remoteMode', label: 'Remote Mode', type: 'boolean' },
        { key: 'entrySection', label: 'Entry Section', type: 'string' },
        { key: 'dataSource', label: 'Data Source (JSON)', type: 'json' },
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
        { key: 'currentPagingSize', label: 'Current Paging Size', type: 'number' },
        { key: 'pageListSize', label: 'Page List Size', type: 'number' },
      ],
    },
    {
      title: 'Features',
      settings: [
        { key: 'showFilter', label: 'Show Filter', type: 'boolean' },
        { key: 'showSort', label: 'Show Sort', type: 'boolean' },
        { key: 'showSearch', label: 'Show Search', type: 'boolean' },
        { key: 'exportExcel', label: 'Export Excel', type: 'boolean' },
        { key: 'exportPDF', label: 'Export PDF', type: 'boolean' },
      ],
    },
  ];

  jsonError: string | null = null;

  onCommitStringSetting(key: string, event: Event): void {
    this.gridConfig = { ...this.gridConfig, [key]: (event.target as HTMLInputElement).value };
  }

  onCommitJsonSetting(key: string, event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value.trim();
    if (raw === '') {
      this.jsonError = null;
      this.gridConfig = { ...this.gridConfig, [key]: [] };
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      this.jsonError = null;
      this.gridConfig = { ...this.gridConfig, [key]: Array.isArray(parsed) ? parsed : [parsed] };
    } catch {
      this.jsonError = 'Invalid JSON — change was not applied.';
    }
  }
}
