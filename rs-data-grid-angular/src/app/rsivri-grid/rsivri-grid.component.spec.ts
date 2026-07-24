import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { RsivriGridComponent } from './rsivri-grid.component';
import { fetchData, setData } from './store/data-grid.actions';
import { selectData } from './store/data-grid.selectors';

describe('RsivriGridComponent', () => {
  let component: RsivriGridComponent;
  let fixture: ComponentFixture<RsivriGridComponent>;
  let store: MockStore;

  const initialGridState = {
    dataGrid: {
      data: [],
      pager: {
        pageSize: 10,
        pageNumber: 0,
        pageList: [1, 2, 3, 4, 5],
        pageListSize: 5,
        pageLimit: 0,
        remotePage: false
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsivriGridComponent],
      providers: [provideMockStore({ initialState: initialGridState })]
    }).compileComponents();

    store = TestBed.inject(MockStore);
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
    it('dispatches setData(remote:false) when a dataSource is provided', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.dataSource = [{ a: 1 }];
      component.ngOnInit();
      expect(dispatchSpy).toHaveBeenCalledWith(setData({ data: component.dataSource, remote: false }));
    });

    it('dispatches fetchData(remote:false) when dataSource is empty and fetchUrl is set', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.dataSource = [];
      component.fetchUrl = 'http://example.com/api';
      component.entrySection = 'items';
      component.ngOnInit();
      expect(dispatchSpy).toHaveBeenCalledWith(fetchData({
        url: 'http://example.com/api',
        section: 'items',
        remote: false
      }));
    });

    it('dispatches setData with an empty array when dataSource and fetchUrl are both empty', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.dataSource = [];
      component.fetchUrl = '';
      component.ngOnInit();
      expect(dispatchSpy).toHaveBeenCalledWith(setData({ data: [], remote: false }));
    });
  });

  describe('ngOnInit in remote mode (remoteMode = true)', () => {
    it('dispatches setData(remote:true) when a dataSource is provided', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.remoteMode = true;
      component.dataSource = [{ a: 1 }];
      component.remoteModeParams = { endpoint: 'http://api.test/search', aliases: { data: 'items' } };
      component.ngOnInit();
      expect(dispatchSpy).toHaveBeenCalledWith(setData({ data: component.dataSource, remote: true }));
    });

    it('dispatches fetchData(remote:true) when dataSource is empty', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.remoteMode = true;
      component.dataSource = [];
      component.remoteModeParams = { endpoint: 'http://api.test/search', aliases: { data: 'items' } };
      component.ngOnInit();
      expect(dispatchSpy).toHaveBeenCalledWith(fetchData({
        url: 'http://api.test/search',
        section: 'items',
        remote: true,
        totalSection: 'size'
      }));
    });

    it('re-dispatches fetchData with page/size query params whenever the pager state changes', () => {
      component.remoteMode = true;
      component.dataSource = [];
      component.remoteModeParams = { endpoint: 'http://api.test/search', aliases: { data: 'items' } };
      component.ngOnInit();

      const dispatchSpy = spyOn(store, 'dispatch');
      store.setState({
        dataGrid: {
          data: [],
          pager: { ...initialGridState.dataGrid.pager, pageNumber: 2, pageSize: 20 }
        }
      });

      expect(dispatchSpy).toHaveBeenCalledWith(fetchData({
        url: 'http://api.test/search?page=2&size=20',
        section: 'items',
        remote: true,
        totalSection: 'size'
      }));
    });
  });

  describe('initializeColumnAsync', () => {
    it('derives columns from the emitted data when none are provided', () => {
      component.columns = [];
      store.overrideSelector(selectData, [{ name: 'A', age: 1 }, { city: 'X' }]);
      store.refreshState();

      component.ngOnInit();

      expect(component.columns).toEqual([
        { caption: 'name', dataField: 'name' },
        { caption: 'age', dataField: 'age' },
        { caption: 'city', dataField: 'city' }
      ]);
    });

    it('keeps explicitly provided columns untouched', () => {
      const explicitColumns = [{ caption: 'Name', dataField: 'name' }];
      component.columns = explicitColumns;
      store.overrideSelector(selectData, [{ name: 'A' }]);
      store.refreshState();

      component.ngOnInit();

      expect(component.columns).toBe(explicitColumns);
    });
  });
});
