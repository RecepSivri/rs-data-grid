import { Component, Input, OnChanges, OnInit, SimpleChanges, TemplateRef, effect, inject } from '@angular/core';
import { NgTemplateOutlet, TitleCasePipe } from '@angular/common';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IColumn } from '../../core/models/IColumn';
import { DataGridStore } from './store/data-grid.store';
import { FilterChangeEvent, RsivriGridHeaderComponent } from './grid-header/rsivri-grid-header.component';
import { RsivriGridBodyComponent } from './grid-body/rsivri-grid-body.component';
import { RsivriGridPagerComponent } from './grid-pager/rsivri-grid-pager.component';

@Component({
  selector: 'rsivri-grid',
  standalone: true,
  imports: [RsivriGridHeaderComponent, RsivriGridBodyComponent, RsivriGridPagerComponent, NgTemplateOutlet],
  providers: [DataGridStore],
  templateUrl: './rsivri-grid.component.html',
  styleUrls: ['./rsivri-grid.component.css']
})
export class RsivriGridComponent implements OnInit, OnChanges {
  readonly store = inject(DataGridStore);
  private readonly titleCasePipe = new TitleCasePipe();

  data = this.store.data;
  allData = this.store.rawData;
  sort = this.store.sort;
  pageNumber = this.store.pageNumber;
  pageSize = this.store.pageSize;
  isLoading = this.store.isLoading;
  loadError = this.store.error;
  globalSearch = this.store.globalSearch;

  @Input() headerColumnLines: boolean = true;
  @Input() fetchUrl: string = '';
  @Input() headerRowLines: boolean = true;
  @Input() bodyRowLines: boolean = true;
  @Input() bodyColumnLines: boolean = true;
  @Input() columns: IColumn[] = [];
  @Input() tableBorder: boolean = true;
  @Input() borderRadiusTop: boolean = false;
  @Input() borderRadiusBottom: boolean = false;
  @Input() diagonalRow: boolean = false;
  @Input() pagination: boolean = false;
  @Input() showFilter: boolean = false;
  @Input() showSort: boolean = false;
  @Input() showSearch: boolean = false;
  @Input() exportExcel: boolean = false;
  @Input() exportPDF: boolean = false;
  @Input() pagingSizes: number[] = [];
  @Input() currentPagingSize: number = 10;
  @Input() dataSource: any[] = [];
  @Input() pageListSize: number = 5;
  @Input() entrySection: string | undefined = undefined;
  @Input() remoteMode: boolean = false;
  @Input() remoteModeParams?: any;
  @Input() loadingTemplate?: TemplateRef<unknown>;
  @Input() errorTemplate?: TemplateRef<unknown>;

  constructor() {
    effect(() => {
      const data = this.store.data();
      if (this.columns.length === 0) {
        const result = Object.keys(Object.assign({}, ...data));
        this.columns = result.map(item => ({ caption: item, dataField: item }));
      }
    });
  }

  onFilterChange(event: FilterChangeEvent): void {
    this.store.setFilter(event.dataField, event.values);
  }

  onSortToggle(dataField: string): void {
    this.store.toggleSort(dataField);
  }

  onGlobalSearchInput(event: Event): void {
    this.store.setGlobalSearch((event.target as HTMLInputElement).value);
  }

  private getDisplayedRows(): any[] {
    const rows = this.data() ?? [];
    if (!this.remoteModeParams && this.pagination) {
      return rows.slice(this.pageNumber() * this.pageSize(), (this.pageNumber() + 1) * this.pageSize());
    }
    return rows;
  }

  private getDisplayedCaptions(): string[] {
    return this.columns.map(column => this.titleCasePipe.transform(column.caption));
  }

  onExportExcelClick(): void {
    const rows = this.getDisplayedRows();
    const captions = this.getDisplayedCaptions();
    const mapped = rows.map(row => Object.fromEntries(
      this.columns.map((column, i) => [captions[i], row[column.dataField]])
    ));
    const worksheet = XLSX.utils.json_to_sheet(mapped);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, 'export.xlsx');
  }

  onExportPdfClick(): void {
    const rows = this.getDisplayedRows();
    const doc = new jsPDF({ orientation: 'landscape' });
    autoTable(doc, {
      head: [this.getDisplayedCaptions()],
      body: rows.map(row => this.columns.map(column => String(row[column.dataField] ?? ''))),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [119, 119, 119], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    doc.save('export.pdf');
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const reloadKeys = ['fetchUrl', 'entrySection', 'remoteMode', 'dataSource', 'remoteModeParams'];
    const shouldReload = reloadKeys.some(key => changes[key] && !changes[key].firstChange);
    if (shouldReload) {
      this.loadData();
    }
  }

  private loadData(): void {
    if (this.remoteMode) {
      const endpoint = new URL(this.remoteModeParams.endpoint);
      if (this.dataSource.length > 0) {
        this.store.setData(this.dataSource, true);
      } else {
        this.store.fetchData(endpoint.href, this.remoteModeParams.aliases.data, true, 'size');
      }
    } else {
      if (this.dataSource.length > 0) {
        this.store.setData(this.dataSource, false);
      } else {
        if (this.fetchUrl !== '') {
          this.store.fetchData(this.fetchUrl, this.entrySection, false);
        } else {
          this.store.setData(this.dataSource, false);
        }
      }
    }
  }
}
