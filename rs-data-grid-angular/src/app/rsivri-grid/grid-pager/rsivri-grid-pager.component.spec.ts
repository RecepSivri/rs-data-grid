import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { RsivriGridPagerComponent } from './rsivri-grid-pager.component';
import {
  changePageListSize, changePageNumber, changePageSize,
  decreasePageNum, increasePageNum, lastPageNum
} from '../store/data-grid.actions';

describe('RsivriGridPagerComponent', () => {
  let component: RsivriGridPagerComponent;
  let fixture: ComponentFixture<RsivriGridPagerComponent>;
  let store: MockStore;

  const initialGridState = {
    dataGrid: {
      data: [],
      pager: {
        pageSize: 10,
        pageNumber: 0,
        pageList: [1, 2, 3, 4, 5],
        pageListSize: 5,
        pageLimit: 10,
        remotePage: false
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsivriGridPagerComponent],
      providers: [provideMockStore({ initialState: initialGridState })]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(RsivriGridPagerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should dispatch changePageListSize and changePageSize on init', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.pageListSize = 7;
    component.currentPagingSize = 25;
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(changePageListSize({ pageListSize: 7 }));
    expect(dispatchSpy).toHaveBeenCalledWith(changePageSize({ pageSize: 25 }));
  });

  it('should render nothing when pagination is false', () => {
    component.pagination = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.full-row')).toBeNull();
  });

  describe('when pagination is enabled', () => {
    beforeEach(() => {
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
      // pageNumber$ starts at 0 -> page 1 (index 1 overall, first of the 5 page cells) is selected
      expect(cells[1].classList).toContain('page-numbers-selected');
      expect(cells[2].classList).not.toContain('page-numbers-selected');
    });

    it('should mark the paging size matching the current page size as selected', () => {
      const links = pageSizeLinks();
      // pageSize$ starts at 10
      expect(links[0].classList).toContain('page-selected');
      expect(links[1].classList).not.toContain('page-selected');
    });

    it('should dispatch decreasePageNum when the previous control is clicked', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      pageNumberCells()[0].click();
      expect(dispatchSpy).toHaveBeenCalledWith(decreasePageNum());
    });

    it('should dispatch increasePageNum when the next control is clicked', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      const cells = pageNumberCells();
      cells[cells.length - 1].click();
      expect(dispatchSpy).toHaveBeenCalledWith(increasePageNum());
    });

    it('should dispatch changePageNumber(page - 1) when a page cell is clicked', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      // third page-numbers cell overall is page "2"
      pageNumberCells()[2].click();
      expect(dispatchSpy).toHaveBeenCalledWith(changePageNumber({ pageNumber: 1 }));
    });

    it('should dispatch lastPageNum when the last-page cell is clicked', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      const cells = pageNumberCells();
      cells[cells.length - 2].click();
      expect(dispatchSpy).toHaveBeenCalledWith(lastPageNum());
    });

    it('should dispatch changePageNumber(0) and changePageSize(item) when a paging size link is clicked', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      pageSizeLinks()[2].click();
      expect(dispatchSpy).toHaveBeenCalledWith(changePageNumber({ pageNumber: 0 }));
      expect(dispatchSpy).toHaveBeenCalledWith(changePageSize({ pageSize: 50 }));
    });
  });

  describe('when the visible page window already reaches the page limit', () => {
    it('should not render the last-page cell', () => {
      store.setState({
        dataGrid: {
          data: [],
          pager: {
            pageSize: 10,
            pageNumber: 5,
            pageList: [6, 7, 8, 9, 10],
            pageListSize: 5,
            pageLimit: 10,
            remotePage: false
          }
        }
      });
      component.pagination = true;
      component.pagingSizes = [10];
      component.pageListSize = 5;
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
