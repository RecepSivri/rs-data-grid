import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApplicationRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpTestingController } from '@angular/common/http/testing';
import { RsivriGridComponent } from './rsivri-grid.component';
import { RsivriGridHeaderComponent } from './grid-header/rsivri-grid-header.component';

@Component({
  standalone: true,
  imports: [RsivriGridComponent],
  template: `
    <rs-grid-angular [dataSource]="dataSource" [fetchUrl]="fetchUrl" [loadingTemplate]="useCustom ? loadingTpl : undefined"></rs-grid-angular>
    <ng-template #loadingTpl>Custom Loading</ng-template>
  `
})
class LoadingTemplateHostComponent {
  dataSource: any[] = [];
  fetchUrl = '';
  useCustom = false;
}

@Component({
  standalone: true,
  imports: [RsivriGridComponent],
  template: `
    <rs-grid-angular [dataSource]="dataSource" [fetchUrl]="fetchUrl" [errorTemplate]="useCustom ? errorTpl : undefined"></rs-grid-angular>
    <ng-template #errorTpl let-err>Custom Error: {{ err.message }}</ng-template>
  `
})
class ErrorTemplateHostComponent {
  dataSource: any[] = [];
  fetchUrl = '';
  useCustom = false;
}

@Component({
  standalone: true,
  imports: [RsivriGridComponent],
  template: `
    <rs-grid-angular [dataSource]="dataSource" [emptyTemplate]="useCustom ? emptyTpl : undefined"></rs-grid-angular>
    <ng-template #emptyTpl>Nothing here</ng-template>
  `
})
class EmptyTemplateHostComponent {
  dataSource: any[] = [];
  useCustom = false;
}

describe('RsivriGridComponent', () => {
  let component: RsivriGridComponent;
  let fixture: ComponentFixture<RsivriGridComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  function afterClosedReturning(value: any) {
    return { afterClosed: () => of(value), componentInstance: { selectedChange: { subscribe: () => ({ unsubscribe: () => {} }) } } } as any;
  }

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [RsivriGridComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: dialogSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RsivriGridComponent);
    component = fixture.componentInstance;
  });

  function toolbarButton(label: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`.export-button[aria-label="${label}"]`);
  }

  function dataRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('rsivri-grid-body .column-layout > div'));
  }

  it('should create and render its header/body/pager children', () => {
    component.dataSource = [{ a: 1 }];
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('rsivri-grid-hedaer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('rsivri-grid-body')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('rsivri-grid-pager')).toBeTruthy();
  });

  it('shows the empty-state message when there is no data to display', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.grid-state-empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('rsivri-grid-hedaer')).toBeNull();
  });

  describe('ngOnInit in local mode (remoteMode = false)', () => {
    it('calls setData(remote:false) when a dataSource is provided', () => {
      const setDataSpy = spyOn(component.store, 'setData');
      component.dataSource = [{ a: 1 }];
      component.ngOnInit();
      expect(setDataSpy).toHaveBeenCalledWith(component.dataSource, false);
    });

    it('calls fetchData(remote:false) when dataSource is empty and fetchUrl is set', () => {
      const fetchDataSpy = spyOn(component.store, 'fetchData');
      component.dataSource = [];
      component.fetchUrl = 'http://example.com/api';
      component.entrySection = 'items';
      component.ngOnInit();
      expect(fetchDataSpy).toHaveBeenCalledWith('http://example.com/api', 'items', false, undefined, 'GET', undefined);
    });

    it('includes an Authorization header derived from authToken and any custom fetchHeaders', () => {
      const fetchDataSpy = spyOn(component.store, 'fetchData');
      component.dataSource = [];
      component.fetchUrl = 'http://example.com/api';
      component.entrySection = 'items';
      component.fetchMethod = 'POST';
      component.fetchHeaders = { 'X-Custom': '1' };
      component.authToken = 'secret';
      component.ngOnInit();
      expect(fetchDataSpy).toHaveBeenCalledWith(
        'http://example.com/api', 'items', false, undefined, 'POST', { 'X-Custom': '1', Authorization: 'Bearer secret' }
      );
    });

    it('builds an Authorization-only header set when fetchHeaders is explicitly undefined', () => {
      const fetchDataSpy = spyOn(component.store, 'fetchData');
      component.dataSource = [];
      component.fetchUrl = 'http://example.com/api';
      component.fetchHeaders = undefined as any;
      component.authToken = 'secret';
      component.ngOnInit();
      expect(fetchDataSpy).toHaveBeenCalledWith(
        'http://example.com/api', undefined, false, undefined, 'GET', { Authorization: 'Bearer secret' }
      );
    });

    it('calls setData with an empty array when dataSource and fetchUrl are both empty', () => {
      const setDataSpy = spyOn(component.store, 'setData');
      component.dataSource = [];
      component.fetchUrl = '';
      component.ngOnInit();
      expect(setDataSpy).toHaveBeenCalledWith([], false);
    });
  });

  describe('ngOnInit in remote mode (remoteMode = true)', () => {
    it('calls setData(remote:true) when a dataSource is provided', () => {
      const setDataSpy = spyOn(component.store, 'setData');
      component.remoteMode = true;
      component.dataSource = [{ a: 1 }];
      component.remoteModeParams = { endpoint: 'http://api.test/search', aliases: { data: 'items' } };
      component.ngOnInit();
      expect(setDataSpy).toHaveBeenCalledWith(component.dataSource, true);
    });

    it('calls fetchData(remote:true) with page/size support when dataSource is empty', () => {
      const fetchDataSpy = spyOn(component.store, 'fetchData');
      component.remoteMode = true;
      component.dataSource = [];
      component.remoteModeParams = { endpoint: 'http://api.test/search', aliases: { data: 'items' } };
      component.ngOnInit();
      expect(fetchDataSpy).toHaveBeenCalledWith('http://api.test/search', 'items', true, 'size', 'GET', undefined);
    });
  });

  describe('column auto-detection (data -> columns effect)', () => {
    it('derives columns from the store data when none are provided', () => {
      component.columns = [];
      fixture.detectChanges();

      component.store.setData([{ name: 'A', age: 1 }, { city: 'X' }], false);
      fixture.detectChanges();

      expect(component.columns).toEqual([
        { caption: 'name', dataField: 'name' },
        { caption: 'age', dataField: 'age' },
        { caption: 'city', dataField: 'city' }
      ]);
    });

    it('keeps explicitly provided columns untouched', () => {
      const explicitColumns = [{ caption: 'Name', dataField: 'name' }];
      component.columns = explicitColumns;
      fixture.detectChanges();

      component.store.setData([{ name: 'A' }], false);
      fixture.detectChanges();

      expect(component.columns).toBe(explicitColumns);
    });

    it('drops fields no longer present and appends genuinely new fields at the end, honoring drag order', () => {
      component.columns = [];
      fixture.detectChanges();
      component.store.setData([{ name: 'A', age: 1 }], false);
      fixture.detectChanges();

      component.onColumnMove({ fromField: 'age', toField: 'name' });
      fixture.detectChanges();
      expect(component.columns.map(c => c.dataField)).toEqual(['age', 'name']);

      component.store.setData([{ age: 2, genre: 'x' }], false);
      fixture.detectChanges();
      expect(component.columns.map(c => c.dataField)).toEqual(['age', 'genre']);
    });
  });

  describe('filtering', () => {
    it('forwards a header filterChange event to store.setFilter', () => {
      const setFilterSpy = spyOn(component.store, 'setFilter');
      component.onFilterChange({ dataField: 'name', values: ['Jane'] });
      expect(setFilterSpy).toHaveBeenCalledWith('name', ['Jane']);
    });

    it('passes the showFilter input through to the header child', () => {
      component.showFilter = true;
      component.dataSource = [{ a: 1 }];
      fixture.detectChanges();
      const header = fixture.debugElement.query(By.directive(RsivriGridHeaderComponent));
      expect((header.componentInstance as RsivriGridHeaderComponent).showFilter).toBeTrue();
    });

    it('shows the inline "No matching rows" state when a filter leaves nothing, without unmounting the header', () => {
      component.dataSource = [{ name: 'Alice' }];
      component.showFilter = true;
      fixture.detectChanges();
      component.store.setFilter('name', ['nonexistent']);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.grid-state-empty-inline')?.textContent?.trim()).toBe('No matching rows.');
      expect(fixture.nativeElement.querySelector('rsivri-grid-hedaer')).not.toBeNull();
    });
  });

  describe('sorting', () => {
    it('forwards a header sortToggle event to store.toggleSort', () => {
      const toggleSortSpy = spyOn(component.store, 'toggleSort');
      component.onSortToggle('name');
      expect(toggleSortSpy).toHaveBeenCalledWith('name');
    });
  });

  describe('column drag-reorder (onColumnMove)', () => {
    beforeEach(() => {
      component.columns = [
        { caption: 'a', dataField: 'a' },
        { caption: 'b', dataField: 'b' },
        { caption: 'c', dataField: 'c' },
      ];
      component.dataSource = [{ a: 1, b: 2, c: 3 }];
      fixture.detectChanges();
    });

    it('reorders columns, moving forward', () => {
      component.onColumnMove({ fromField: 'a', toField: 'c' });
      expect(component.columns.map(c => c.dataField)).toEqual(['b', 'c', 'a']);
    });

    it('reorders columns, moving backward', () => {
      component.onColumnMove({ fromField: 'c', toField: 'a' });
      expect(component.columns.map(c => c.dataField)).toEqual(['c', 'a', 'b']);
    });

    it('is a no-op when fromField === toField', () => {
      const before = component.columns;
      component.onColumnMove({ fromField: 'a', toField: 'a' });
      expect(component.columns).toBe(before);
    });

    it('is a no-op when either field is not found', () => {
      const before = component.columns;
      component.onColumnMove({ fromField: 'missing', toField: 'a' });
      expect(component.columns).toBe(before);
    });
  });

  describe('row drag-and-drop (onRowMove)', () => {
    it('forwards to store.moveRow', () => {
      const moveRowSpy = spyOn(component.store, 'moveRow');
      const a = { id: 1 };
      const b = { id: 2 };
      component.onRowMove({ fromRow: a, toRow: b });
      expect(moveRowSpy).toHaveBeenCalledWith(a, b);
    });
  });

  describe('toolbar visibility', () => {
    it('is omitted entirely when every toolbar feature is off and gridMode is not batch', () => {
      component.dataSource = [{ a: 1 }];
      component.showSearch = false;
      component.exportExcel = false;
      component.exportPDF = false;
      component.showAdd = false;
      component.showGridSettings = false;
      component.gridMode = 'popup';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.grid-toolbar')).toBeNull();
    });

    it('is shown for gridMode batch alone, even with every other flag off', () => {
      component.dataSource = [{ a: 1 }];
      component.showSearch = false;
      component.exportExcel = false;
      component.exportPDF = false;
      component.showAdd = false;
      component.showGridSettings = false;
      component.gridMode = 'batch';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.grid-toolbar')).not.toBeNull();
      expect(toolbarButton('Save batch changes')).not.toBeNull();
    });

    it('the search input reflects globalSearch() and updates the store on input', () => {
      component.dataSource = [{ name: 'Alice' }, { name: 'Bob' }];
      component.showSearch = true;
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector('.global-search-input');
      expect(input.value).toBe('');
      input.value = 'ali';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(input.value).toBe('ali');
      expect(dataRows().length).toBe(1);
    });
  });

  describe('export', () => {
    const data = [{ name: 'Alice', age: 30 }];

    it('exports the currently displayed rows to Excel with title-cased captions', () => {
      // xlsx/jspdf are static ES imports (not DI-injectable), so unlike the
      // Vitest-based framework packages in this repo, Karma/Jasmine can't
      // easily mock them -- this exercises the real library end-to-end.
      component.dataSource = data;
      component.exportExcel = true;
      fixture.detectChanges();
      expect(() => toolbarButton('Export to Excel').click()).not.toThrow();
    });

    it('exports the currently displayed rows to PDF, stringifying a null field as empty', () => {
      component.dataSource = [{ name: 'Alice', age: null }];
      component.exportPDF = true;
      fixture.detectChanges();
      expect(() => toolbarButton('Export to PDF').click()).not.toThrow();
    });
  });

  describe('Grid Settings', () => {
    beforeEach(() => {
      component.columns = [
        { caption: 'a', dataField: 'a' },
        { caption: 'b', dataField: 'b' },
      ];
      component.dataSource = [{ a: 1, b: 2 }];
      component.showGridSettings = true;
    });

    it('opens the dialog with the current columns/selection, and applies a selectedChange emission', () => {
      let selectedChangeHandler: (next: string[]) => void = () => {};
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(undefined),
        componentInstance: { selectedChange: { subscribe: (fn: any) => { selectedChangeHandler = fn; return { unsubscribe: () => {} }; } } },
      } as any);
      fixture.detectChanges();
      toolbarButton('Grid settings').click();
      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.mostRecent().args[1] as any;
      expect(callArgs.data).toEqual({ columns: component.columns, selected: [] });

      selectedChangeHandler(['a']);
      expect(component.selectedColumnFields).toEqual(['a']);
      expect(localStorage.getItem('rs-data-grid-selected-columns')).toBe(JSON.stringify(['a']));
    });

    it('shows the badge dot once a selection is active', () => {
      let selectedChangeHandler: (next: string[]) => void = () => {};
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(undefined),
        componentInstance: { selectedChange: { subscribe: (fn: any) => { selectedChangeHandler = fn; return { unsubscribe: () => {} }; } } },
      } as any);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.grid-settings-badge-dot')).toBeNull();
      toolbarButton('Grid settings').click();
      selectedChangeHandler(['a']);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.grid-settings-badge-dot')).not.toBeNull();
    });

    it('getVisibleColumns filters/orders by the selection, ignoring unknown fields, and caches the result', () => {
      let selectedChangeHandler: (next: string[]) => void = () => {};
      dialogSpy.open.and.returnValue({
        afterClosed: () => of(undefined),
        componentInstance: { selectedChange: { subscribe: (fn: any) => { selectedChangeHandler = fn; return { unsubscribe: () => {} }; } } },
      } as any);
      fixture.detectChanges();
      toolbarButton('Grid settings').click();
      selectedChangeHandler(['b', 'unknown', 'a']);
      const first = component.getVisibleColumns();
      expect(first.map(c => c.dataField)).toEqual(['b', 'a']);
      const second = component.getVisibleColumns();
      expect(second).toBe(first); // cache hit, same reference
    });

    it('seeds the initial selection from defaultVisibleColumns on a fresh visit', () => {
      localStorage.removeItem('rs-data-grid-selected-columns');
      component.defaultVisibleColumns = ['a'];
      component.ngOnInit();
      expect(component.selectedColumnFields).toEqual(['a']);
    });

    it('restores a persisted selection on init', () => {
      localStorage.setItem('rs-data-grid-selected-columns', JSON.stringify(['b']));
      component.ngOnInit();
      expect(component.selectedColumnFields).toEqual(['b']);
    });

    it('ignores corrupted (non-array) persisted JSON and falls back to the fallback', () => {
      localStorage.setItem('rs-data-grid-selected-columns', JSON.stringify({ not: 'an array' }));
      component.defaultVisibleColumns = ['a'];
      component.ngOnInit();
      expect(component.selectedColumnFields).toEqual(['a']);
    });

    it('ignores unparseable persisted JSON and falls back to the fallback', () => {
      localStorage.setItem('rs-data-grid-selected-columns', 'not valid json {{{');
      component.defaultVisibleColumns = ['a'];
      component.ngOnInit();
      expect(component.selectedColumnFields).toEqual(['a']);
    });

    afterEach(() => localStorage.removeItem('rs-data-grid-selected-columns'));
  });

  describe('add row', () => {
    it('popup mode: opens EditRowDialog, and on a truthy result adds the row and emits rowAdd', () => {
      const newRow = { name: 'Zed' };
      dialogSpy.open.and.returnValue({ afterClosed: () => of(newRow) } as any);
      const addRowSpy = spyOn(component.store, 'addRow');
      const emitted: any[] = [];
      component.rowAdd.subscribe(r => emitted.push(r));
      component.dataSource = [{ name: 'Alice' }];
      component.showAdd = true;
      component.gridMode = 'popup';
      fixture.detectChanges();

      toolbarButton('Add row').click();
      expect(dialogSpy.open).toHaveBeenCalled();
      expect(addRowSpy).toHaveBeenCalledWith(newRow);
      expect(emitted).toEqual([newRow]);
    });

    it('popup mode: a falsy dialog result adds nothing', () => {
      dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
      const addRowSpy = spyOn(component.store, 'addRow');
      component.dataSource = [{ name: 'Alice' }];
      component.showAdd = true;
      component.gridMode = 'popup';
      fixture.detectChanges();
      toolbarButton('Add row').click();
      expect(addRowSpy).not.toHaveBeenCalled();
    });

    it('row mode: delegates to the body\'s own startAddingRow instead of opening a dialog', () => {
      component.dataSource = [{ name: 'Alice' }];
      component.showAdd = true;
      component.gridMode = 'row';
      fixture.detectChanges();
      const startSpy = spyOn(component.bodyRef!, 'startAddingRow');
      toolbarButton('Add row').click();
      expect(startSpy).toHaveBeenCalled();
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('batch mode: delegates to the body\'s own addBatchRow instead of opening a dialog', () => {
      component.dataSource = [{ name: 'Alice' }];
      component.showAdd = true;
      component.gridMode = 'batch';
      fixture.detectChanges();
      const addSpy = spyOn(component.bodyRef!, 'addBatchRow');
      toolbarButton('Add row').click();
      expect(addSpy).toHaveBeenCalled();
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('edit row (popup mode via body rowEdit output)', () => {
    it('opens EditRowDialog with the row; on a truthy result updates the store and emits rowEdit', () => {
      const row = { name: 'Alice' };
      const updated = { name: 'Alicia' };
      dialogSpy.open.and.returnValue({ afterClosed: () => of(updated) } as any);
      const updateRowSpy = spyOn(component.store, 'updateRow');
      const emitted: any[] = [];
      component.rowEdit.subscribe(r => emitted.push(r));

      component.onRowEdit(row);

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(updateRowSpy).toHaveBeenCalledWith(row, updated);
      expect(emitted).toEqual([updated]);
    });

    it('a falsy dialog result changes nothing', () => {
      dialogSpy.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
      const updateRowSpy = spyOn(component.store, 'updateRow');
      component.onRowEdit({ name: 'Alice' });
      expect(updateRowSpy).not.toHaveBeenCalled();
    });
  });

  describe('delete row (via body rowDelete output)', () => {
    it('opens ConfirmDialog; on confirm removes the row and emits rowDelete', () => {
      const row = { name: 'Alice' };
      dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
      const removeRowSpy = spyOn(component.store, 'removeRow');
      const emitted: any[] = [];
      component.rowDelete.subscribe(r => emitted.push(r));

      component.onRowDelete(row);

      expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
        data: { title: 'Confirm delete', message: 'Are you sure you want to delete this row?' }
      }));
      expect(removeRowSpy).toHaveBeenCalledWith(row);
      expect(emitted).toEqual([row]);
    });

    it('declining the confirmation deletes nothing', () => {
      dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);
      const removeRowSpy = spyOn(component.store, 'removeRow');
      component.onRowDelete({ name: 'Alice' });
      expect(removeRowSpy).not.toHaveBeenCalled();
    });

    it('opens with the dark panel class when theme is dark', () => {
      dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as any);
      component.theme = 'dark';
      component.onRowDelete({ name: 'Alice' });
      expect(dialogSpy.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({ panelClass: 'rg-dialog-dark' }));
    });
  });

  describe('batch mode wiring', () => {
    it('onBatchRowSave updates the store and emits rowEdit', () => {
      const updateRowSpy = spyOn(component.store, 'updateRow');
      const emitted: any[] = [];
      component.rowEdit.subscribe(r => emitted.push(r));
      const payload = { original: { id: 1 }, updated: { id: 1, name: 'x' } };
      component.onBatchRowSave(payload);
      expect(updateRowSpy).toHaveBeenCalledWith(payload.original, payload.updated);
      expect(emitted).toEqual([payload.updated]);
    });

    it('onBatchRowAdd adds the row and emits rowAdd', () => {
      const addRowSpy = spyOn(component.store, 'addRow');
      const emitted: any[] = [];
      component.rowAdd.subscribe(r => emitted.push(r));
      component.onBatchRowAdd({ id: 2 });
      expect(addRowSpy).toHaveBeenCalledWith({ id: 2 });
      expect(emitted).toEqual([{ id: 2 }]);
    });

    it('onBatchCommit updates every dirty row, adds every new row, and emits batchSave once', () => {
      const updateRowSpy = spyOn(component.store, 'updateRow');
      const addRowSpy = spyOn(component.store, 'addRow');
      const emitted: any[] = [];
      component.batchSave.subscribe(p => emitted.push(p));
      const payload = {
        added: [{ id: 3 }],
        updated: [{ original: { id: 1 }, updated: { id: 1, name: 'x' } }],
      };
      component.onBatchCommit(payload);
      expect(updateRowSpy).toHaveBeenCalledWith(payload.updated[0].original, payload.updated[0].updated);
      expect(addRowSpy).toHaveBeenCalledWith({ id: 3 });
      expect(emitted).toEqual([payload]);
    });

    it('onSaveBatchClick delegates to the body\'s own saveBatch', () => {
      component.dataSource = [{ a: 1 }];
      component.gridMode = 'batch';
      fixture.detectChanges();
      const saveSpy = spyOn(component.bodyRef!, 'saveBatch');
      toolbarButton('Save batch changes').click();
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('pagination (getPagedData)', () => {
    it('slices rows client-side by page when pagination is on and remoteModeParams is not set', () => {
      const rows = Array.from({ length: 15 }, (_, i) => ({ id: i }));
      component.dataSource = rows;
      component.pagination = true;
      component.currentPagingSize = 10;
      fixture.detectChanges();
      expect(dataRows().length).toBe(10);
    });

    it('does not slice when remoteModeParams is set, even with pagination on', () => {
      const rows = Array.from({ length: 15 }, (_, i) => ({ id: i }));
      component.dataSource = rows;
      component.pagination = true;
      component.currentPagingSize = 10;
      component.remoteModeParams = { endpoint: 'http://x', aliases: { data: 'items' } };
      fixture.detectChanges();
      expect(dataRows().length).toBe(15);
    });

    it('shows every row when pagination is off', () => {
      component.dataSource = [{ id: 1 }, { id: 2 }];
      component.pagination = false;
      fixture.detectChanges();
      expect(dataRows().length).toBe(2);
    });

    it('reuses the cached page slice when nothing relevant changed', () => {
      component.dataSource = Array.from({ length: 15 }, (_, i) => ({ id: i }));
      component.pagination = true;
      component.currentPagingSize = 10;
      fixture.detectChanges();
      const first = component.getPagedData();
      const second = component.getPagedData();
      expect(second).toBe(first);
    });
  });

  describe('ngOnChanges (dataSource reload semantics)', () => {
    it('does not reload on the first dataSource change (firstChange)', () => {
      const setDataSpy = spyOn(component.store, 'setData');
      component.ngOnChanges({ dataSource: { firstChange: true } as any });
      expect(setDataSpy).not.toHaveBeenCalled();
    });

    it('reloads and resets the Grid Settings selection on a later dataSource change', () => {
      component.dataSource = [{ a: 1 }];
      const setDataSpy = spyOn(component.store, 'setData');
      (component as any).setSelectedColumnFields(['a']);
      component.ngOnChanges({ dataSource: { firstChange: false } as any });
      expect(setDataSpy).toHaveBeenCalledWith(component.dataSource, false);
      expect(component.selectedColumnFields).toEqual([]);
    });

    it('does nothing when dataSource is not among the changes', () => {
      const setDataSpy = spyOn(component.store, 'setData');
      component.ngOnChanges({ theme: { firstChange: false } as any });
      expect(setDataSpy).not.toHaveBeenCalled();
    });
  });

  describe('fetchNow', () => {
    it('resets the Grid Settings selection and reloads', () => {
      component.dataSource = [{ a: 1 }];
      const setDataSpy = spyOn(component.store, 'setData');
      (component as any).setSelectedColumnFields(['a']);
      component.fetchNow();
      expect(component.selectedColumnFields).toEqual([]);
      expect(setDataSpy).toHaveBeenCalledWith(component.dataSource, false);
    });
  });

  describe('loading / error / empty templates', () => {
    let httpMock: HttpTestingController;

    beforeEach(() => {
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('shows the default loading state when no loadingTemplate is given', () => {
      const hostFixture = TestBed.createComponent(LoadingTemplateHostComponent);
      hostFixture.componentInstance.fetchUrl = 'http://api.test/loading-default';
      hostFixture.detectChanges();
      TestBed.flushEffects();
      hostFixture.detectChanges();
      expect(hostFixture.nativeElement.querySelector('.grid-state-loading')?.textContent?.trim()).toBe('Loading...');
      httpMock.expectOne('http://api.test/loading-default').flush([]);
    });

    it('shows a custom loadingTemplate instead of the default when provided', () => {
      const hostFixture = TestBed.createComponent(LoadingTemplateHostComponent);
      hostFixture.componentInstance.fetchUrl = 'http://api.test/loading-custom';
      hostFixture.componentInstance.useCustom = true;
      hostFixture.detectChanges();
      TestBed.flushEffects();
      hostFixture.detectChanges();
      expect(hostFixture.nativeElement.textContent).toContain('Custom Loading');
      expect(hostFixture.nativeElement.querySelector('.grid-state-loading')).toBeNull();
      httpMock.expectOne('http://api.test/loading-custom').flush([]);
    });

    it('shows the default error state when no errorTemplate is given', async () => {
      const hostFixture = TestBed.createComponent(ErrorTemplateHostComponent);
      hostFixture.componentInstance.fetchUrl = 'http://api.test/error-default';
      hostFixture.detectChanges();
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/error-default').flush('oops', { status: 500, statusText: 'server error' });
      await TestBed.inject(ApplicationRef).whenStable();
      TestBed.flushEffects();
      hostFixture.detectChanges();
      expect(hostFixture.nativeElement.querySelector('.grid-state-error')).not.toBeNull();
    });

    it('shows a custom errorTemplate instead of the default when provided', async () => {
      const hostFixture = TestBed.createComponent(ErrorTemplateHostComponent);
      hostFixture.componentInstance.fetchUrl = 'http://api.test/error-custom';
      hostFixture.componentInstance.useCustom = true;
      hostFixture.detectChanges();
      TestBed.flushEffects();
      httpMock.expectOne('http://api.test/error-custom').flush('oops', { status: 500, statusText: 'server error' });
      await TestBed.inject(ApplicationRef).whenStable();
      TestBed.flushEffects();
      hostFixture.detectChanges();
      expect(hostFixture.nativeElement.textContent).toContain('Custom Error:');
      expect(hostFixture.nativeElement.querySelector('.grid-state-error')).toBeNull();
    });

    it('shows the default empty state when no emptyTemplate is given', () => {
      const hostFixture = TestBed.createComponent(EmptyTemplateHostComponent);
      hostFixture.detectChanges();
      expect(hostFixture.nativeElement.querySelector('.grid-state-empty')?.textContent?.trim()).toBe('No data to display.');
    });

    it('shows a custom emptyTemplate instead of the default when provided', () => {
      const hostFixture = TestBed.createComponent(EmptyTemplateHostComponent);
      hostFixture.componentInstance.useCustom = true;
      hostFixture.detectChanges();
      expect(hostFixture.nativeElement.textContent).toContain('Nothing here');
      expect(hostFixture.nativeElement.querySelector('.grid-state-empty')).toBeNull();
    });
  });

  describe('theming', () => {
    it('applies border-area-small when tableBorder is on, and sets data-rg-theme from the theme input', () => {
      component.dataSource = [{ a: 1 }];
      component.tableBorder = true;
      component.theme = 'dark';
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement.querySelector('[data-rg-theme]');
      expect(root.classList).toContain('border-area-small');
      expect(root.getAttribute('data-rg-theme')).toBe('dark');
    });

    it('omits border-area-small when tableBorder is off', () => {
      component.dataSource = [{ a: 1 }];
      component.tableBorder = false;
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement.querySelector('[data-rg-theme]');
      expect(root.classList).not.toContain('border-area-small');
    });
  });
});
