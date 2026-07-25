import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RsivriGridPagerComponent } from './rsivri-grid-pager.component';
import { DataGridStore } from '../store/data-grid.store';

describe('RsivriGridPagerComponent', () => {
  let component: RsivriGridPagerComponent;
  let fixture: ComponentFixture<RsivriGridPagerComponent>;
  let store: DataGridStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsivriGridPagerComponent],
      providers: [DataGridStore, provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    store = TestBed.inject(DataGridStore);
    fixture = TestBed.createComponent(RsivriGridPagerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should call changePageListSize and changePageSize on init', () => {
    const listSizeSpy = spyOn(store, 'changePageListSize').and.callThrough();
    const pageSizeSpy = spyOn(store, 'changePageSize').and.callThrough();
    component.pageListSize = 7;
    component.currentPagingSize = 25;
    fixture.detectChanges();
    expect(listSizeSpy).toHaveBeenCalledWith(7);
    expect(pageSizeSpy).toHaveBeenCalledWith(25);
  });

  it('should render nothing when pagination is false', () => {
    component.pagination = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.full-row')).toBeNull();
  });

  describe('when pagination is enabled', () => {
    beforeEach(() => {
      store.setData(new Array(100).fill({}), false); // pageLimit = 10 with the default pageSize (10)
      component.pagination = true;
      component.pagingSizes = [10, 20, 50];
      component.pageListSize = 5;
      fixture.detectChanges();
    });

    function pageNumberCells(): HTMLElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('.page-numbers'));
    }

    function pageSizeLinks(): HTMLElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('.pager-size'));
    }

    it('should render prev/next controls, one cell per page and the last-page cell', () => {
      // decrease(<) + 5 pages [1..5] + last-page(10, since 1+5<=10) + increase(>)
      const cells = pageNumberCells();
      expect(cells.length).toBe(8);
      expect(cells[0].textContent?.trim()).toBe('<');
      expect(cells[cells.length - 1].textContent?.trim()).toBe('>');
      expect(cells[cells.length - 2].textContent?.trim()).toBe('10');
    });

    it('should render one link per paging size', () => {
      const links = pageSizeLinks();
      expect(links.length).toBe(3);
      expect(links.map(l => l.textContent?.trim())).toEqual(['10', '20', '50']);
    });

    it('should mark the page matching the current page number as selected', () => {
      const cells = pageNumberCells();
      // pageNumber starts at 0 -> page 1 (index 1 overall, first of the 5 page cells) is selected
      expect(cells[1].classList).toContain('page-numbers-selected');
      expect(cells[2].classList).not.toContain('page-numbers-selected');
    });

    it('should mark the paging size matching the current page size as selected', () => {
      const links = pageSizeLinks();
      // pageSize starts at 10
      expect(links[0].classList).toContain('page-selected');
      expect(links[1].classList).not.toContain('page-selected');
    });

    it('should call decreasePageNum when the previous control is clicked', () => {
      const spy = spyOn(store, 'decreasePageNum').and.callThrough();
      pageNumberCells()[0].click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call increasePageNum when the next control is clicked', () => {
      const spy = spyOn(store, 'increasePageNum').and.callThrough();
      const cells = pageNumberCells();
      cells[cells.length - 1].click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call changePageNumber(page - 1) when a page cell is clicked', () => {
      const spy = spyOn(store, 'changePageNumber').and.callThrough();
      // third page-numbers cell overall is page "2"
      pageNumberCells()[2].click();
      expect(spy).toHaveBeenCalledWith(1);
    });

    it('should call lastPageNum when the last-page cell is clicked', () => {
      const spy = spyOn(store, 'lastPageNum').and.callThrough();
      const cells = pageNumberCells();
      cells[cells.length - 2].click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call changePageNumber(0) and changePageSize(item) when a paging size link is clicked', () => {
      const pageNumberSpy = spyOn(store, 'changePageNumber').and.callThrough();
      const pageSizeSpy = spyOn(store, 'changePageSize').and.callThrough();
      pageSizeLinks()[2].click();
      expect(pageNumberSpy).toHaveBeenCalledWith(0);
      expect(pageSizeSpy).toHaveBeenCalledWith(50);
    });
  });

  describe('when the visible page window already reaches the page limit', () => {
    it('should not render the last-page cell', () => {
      component.pagination = true;
      component.pagingSizes = [10];
      component.pageListSize = 5;
      fixture.detectChanges(); // runs ngOnInit (changePageListSize/changePageSize against empty data)

      store.setData(new Array(100).fill({}), false); // pageLimit = 10
      store.lastPageNum(); // pageNumber = 9, pageList = [6..10]
      fixture.detectChanges();

      // decrease(<) + 5 pages [6..10] + increase(>), no separate last-page cell
      const cells: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.page-numbers'));
      expect(cells.length).toBe(7);
      expect(cells[cells.length - 1].textContent?.trim()).toBe('>');
      expect(cells[cells.length - 2].textContent?.trim()).toBe('10');
    });
  });

  describe('writeAS', () => {
    it('returns false when the last visible page would exceed the page limit', () => {
      expect(component.writeAS(6, 5, 10)).toBeFalse();
    });

    it('returns true when the last visible page reaches or stays below the page limit', () => {
      expect(component.writeAS(5, 5, 10)).toBeTrue();
      expect(component.writeAS(1, 5, 10)).toBeTrue();
    });
  });
});
