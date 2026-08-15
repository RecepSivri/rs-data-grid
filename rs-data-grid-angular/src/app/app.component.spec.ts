import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { singleSpaPropsSubject } from '../single-spa/single-spa-props';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  function createWithProps(props: Record<string, any> = {}): void {
    singleSpaPropsSubject.next(props as any);
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();
  });

  it('should create', () => {
    createWithProps({ gridConfig: { dataSource: [] } });
    expect(component).toBeTruthy();
  });

  describe('gridConfig', () => {
    it('falls back to the built-in defaultGridConfig when no gridConfig prop is given', () => {
      createWithProps({});
      expect(component.gridConfig()['fetchUrl']).toContain('gist.githubusercontent.com');
      expect(component.gridConfig()['gridMode']).toBe('popup');
    });

    it('uses the provided gridConfig prop instead of the default', () => {
      createWithProps({ gridConfig: { theme: 'dark', dataSource: [{ id: 1 }], gridMode: 'batch' } });
      expect(component.gridConfig()['dataSource']).toEqual([{ id: 1 }]);
      expect(component.gridConfig()['gridMode']).toBe('batch');
    });
  });

  describe('background style', () => {
    it('renders a light background for the light theme', () => {
      createWithProps({ gridConfig: { theme: 'light', dataSource: [] } });
      const root: HTMLElement = fixture.nativeElement.querySelector('div');
      expect(root.style.background).toContain('255, 255, 255');
    });

    it('renders a dark background for the dark theme', () => {
      createWithProps({ gridConfig: { theme: 'dark', dataSource: [] } });
      const root: HTMLElement = fixture.nativeElement.querySelector('div');
      expect(root.style.background).toContain('28, 30, 33');
    });
  });

  describe('fetchNonce -> imperative fetchNow', () => {
    it('does not call fetchNow when fetchNonce is undefined', () => {
      createWithProps({ gridConfig: { dataSource: [] } });
      const fetchNowSpy = spyOn(component.grid()!, 'fetchNow');
      expect(fetchNowSpy).not.toHaveBeenCalled();
    });

    it('does not call fetchNow on the first defined fetchNonce (swallowed by design)', () => {
      createWithProps({ gridConfig: { dataSource: [] } });
      const fetchNowSpy = spyOn(component.grid()!, 'fetchNow');
      singleSpaPropsSubject.next({ gridConfig: { dataSource: [] }, fetchNonce: 1 } as any);
      fixture.detectChanges();
      expect(fetchNowSpy).not.toHaveBeenCalled();
    });

    it('calls fetchNow on the next fetchNonce change after the first', () => {
      createWithProps({ gridConfig: { dataSource: [] } });
      singleSpaPropsSubject.next({ gridConfig: { dataSource: [] }, fetchNonce: 1 } as any);
      fixture.detectChanges();
      const fetchNowSpy = spyOn(component.grid()!, 'fetchNow');
      singleSpaPropsSubject.next({ gridConfig: { dataSource: [] }, fetchNonce: 2 } as any);
      fixture.detectChanges();
      expect(fetchNowSpy).toHaveBeenCalledTimes(1);
      singleSpaPropsSubject.next({ gridConfig: { dataSource: [] }, fetchNonce: 3 } as any);
      fixture.detectChanges();
      expect(fetchNowSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('event forwarding', () => {
    it('forwards onRowAdd/onRowEdit/onRowDelete/onBatchSave to the corresponding singleSpaProps callback', () => {
      const onRowAdd = jasmine.createSpy('onRowAdd');
      const onRowEdit = jasmine.createSpy('onRowEdit');
      const onRowDelete = jasmine.createSpy('onRowDelete');
      const onBatchSave = jasmine.createSpy('onBatchSave');
      createWithProps({ gridConfig: { dataSource: [] }, onRowAdd, onRowEdit, onRowDelete, onBatchSave });

      component.onRowAdd({ id: 1 });
      component.onRowEdit({ id: 2 });
      component.onRowDelete({ id: 3 });
      component.onBatchSave({ added: [], updated: [] });

      expect(onRowAdd).toHaveBeenCalledWith({ id: 1 });
      expect(onRowEdit).toHaveBeenCalledWith({ id: 2 });
      expect(onRowDelete).toHaveBeenCalledWith({ id: 3 });
      expect(onBatchSave).toHaveBeenCalledWith({ added: [], updated: [] });
    });

    it('is a harmless no-op when no callback props are provided', () => {
      createWithProps({ gridConfig: { dataSource: [] } });
      expect(() => {
        component.onRowAdd({ id: 1 });
        component.onRowEdit({ id: 2 });
        component.onRowDelete({ id: 3 });
        component.onBatchSave({ added: [], updated: [] });
      }).not.toThrow();
    });
  });
});
