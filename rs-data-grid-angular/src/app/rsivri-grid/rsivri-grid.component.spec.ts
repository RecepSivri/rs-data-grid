import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RsivriGridComponent } from './rsivri-grid.component';
import { RsivriGridHeaderComponent } from './grid-header/rsivri-grid-header.component';

describe('RsivriGridComponent', () => {
  let component: RsivriGridComponent;
  let fixture: ComponentFixture<RsivriGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsivriGridComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(RsivriGridComponent);
    component = fixture.componentInstance;
  });

  it('should create and render its header/body/pager children', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('rsivri-grid-hedaer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('rsivri-grid-body')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('rsivri-grid-pager')).toBeTruthy();
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
      expect(fetchDataSpy).toHaveBeenCalledWith('http://example.com/api', 'items', false);
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
      expect(fetchDataSpy).toHaveBeenCalledWith('http://api.test/search', 'items', true, 'size');
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
  });

  describe('filtering', () => {
    it('forwards a header filterChange event to store.setFilter', () => {
      const setFilterSpy = spyOn(component.store, 'setFilter');
      component.onFilterChange({ dataField: 'name', values: ['Jane'] });
      expect(setFilterSpy).toHaveBeenCalledWith('name', ['Jane']);
    });

    it('passes the filtering input through to the header child', () => {
      component.filtering = false;
      fixture.detectChanges();
      const header = fixture.debugElement.query(By.directive(RsivriGridHeaderComponent));
      expect((header.componentInstance as RsivriGridHeaderComponent).filtering).toBeFalse();
    });
  });
});
