import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { RsivriGridHeaderComponent } from './rsivri-grid-header.component';
import { IColumn } from '../../models/IColumn';

describe('RsivriGridHeaderComponent', () => {
  let component: RsivriGridHeaderComponent;
  let fixture: ComponentFixture<RsivriGridHeaderComponent>;

  const twoColumns: IColumn[] = [
    { caption: 'first name', dataField: 'firstName' },
    { caption: 'LAST NAME', dataField: 'lastName' },
  ];

  const threeColumns: IColumn[] = [
    { caption: 'a', dataField: 'a' },
    { caption: 'b', dataField: 'b' },
    { caption: 'c', dataField: 'c' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RsivriGridHeaderComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(RsivriGridHeaderComponent);
    component = fixture.componentInstance;
  });

  function setColumns(columns: IColumn[]): void {
    component.columns = columns;
    fixture.detectChanges();
  }

  function getHost(): HTMLElement {
    return fixture.nativeElement.querySelector('.full-row.row-layout-space-between-center');
  }

  function getCells(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.content-style'));
  }

  function getFilterToggles(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.filter-toggle'));
  }

  function getFilterOptionCheckboxes(): HTMLInputElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.filter-panel input[type="checkbox"]'));
  }

  function getSortToggles(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.sort-toggle'));
  }

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should have the expected default input values', () => {
    expect(component.columns).toEqual([]);
    expect(component.headerRowLines).toBeTrue();
    expect(component.headerColumnLines).toBeTrue();
    expect(component.tableBorder).toBeTrue();
    expect(component.borderRadiusTop).toBeTrue();
    expect(component.showFilter).toBeFalse();
    expect(component.showSort).toBeFalse();
    expect(component.sort).toEqual({ field: null, direction: null });
  });

  it('should render no column cells when columns is empty', () => {
    fixture.detectChanges();
    expect(getCells().length).toBe(0);
  });

  it('should render one cell per column with a titlecased caption', () => {
    setColumns(twoColumns);
    const cells = getCells();
    expect(cells.length).toBe(2);
    expect(cells[0].textContent?.trim()).toBe('First Name');
    expect(cells[1].textContent?.trim()).toBe('Last Name');
  });

  it('should apply border-header class when tableBorder is true', () => {
    component.tableBorder = true;
    fixture.detectChanges();
    expect(getHost().classList).toContain('border-header');
  });

  it('should not apply border-header class when tableBorder is false', () => {
    component.tableBorder = false;
    fixture.detectChanges();
    expect(getHost().classList).not.toContain('border-header');
  });

  it('should apply border-area-small class when borderRadiusTop is true', () => {
    component.borderRadiusTop = true;
    fixture.detectChanges();
    expect(getHost().classList).toContain('border-area-small');
  });

  it('should not apply border-area-small class when borderRadiusTop is false', () => {
    component.borderRadiusTop = false;
    fixture.detectChanges();
    expect(getHost().classList).not.toContain('border-area-small');
  });

  it('should apply border-right class to every column except the last when headerColumnLines is true', () => {
    component.headerColumnLines = true;
    setColumns(threeColumns);
    const cells = getCells();
    expect(cells[0].classList).toContain('border-right');
    expect(cells[1].classList).toContain('border-right');
    expect(cells[2].classList).not.toContain('border-right');
  });

  it('should not apply border-right class to any column when headerColumnLines is false', () => {
    component.headerColumnLines = false;
    setColumns(threeColumns);
    for (const cell of getCells()) {
      expect(cell.classList).not.toContain('border-right');
    }
  });

  it('should not apply border-right class when there is only a single column', () => {
    component.headerColumnLines = true;
    setColumns([{ caption: 'only', dataField: 'only' }]);
    const cells = getCells();
    expect(cells.length).toBe(1);
    expect(cells[0].classList).not.toContain('border-right');
  });

  describe('filtering', () => {
    it('renders no filter row when showFilter is not set (defaults to false)', () => {
      setColumns(twoColumns);
      expect(getFilterToggles().length).toBe(0);
    });

    it('renders one filter dropdown toggle per column, titlecased, when showFilter is true', () => {
      component.showFilter = true;
      setColumns(twoColumns);
      const toggles = getFilterToggles();
      expect(toggles.length).toBe(2);
      expect(toggles[0].textContent).toContain('First Name');
      expect(toggles[1].textContent).toContain('Last Name');
    });

    it('renders no filter row when showFilter is explicitly false', () => {
      component.showFilter = false;
      setColumns(twoColumns);
      expect(getFilterToggles().length).toBe(0);
    });

    it('renders no filter row when there are no columns', () => {
      component.showFilter = true;
      fixture.detectChanges();
      expect(getFilterToggles().length).toBe(0);
    });

    it('does not render a dropdown panel until the toggle is clicked', () => {
      component.showFilter = true;
      setColumns(twoColumns);
      expect(fixture.nativeElement.querySelector('.filter-panel')).toBeNull();
    });

    it('opens the dropdown with one checkbox per distinct value in that column', () => {
      component.showFilter = true;
      component.data = [
        { firstName: 'Jane', lastName: 'Doe' },
        { firstName: 'John', lastName: 'Smith' },
        { firstName: 'Jane', lastName: 'Doe' },
      ];
      setColumns(twoColumns);

      getFilterToggles()[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();

      expect(getFilterOptionCheckboxes().length).toBe(2);
    });

    it('emits filterChange with the dataField and the accumulated selected values when options are checked', () => {
      component.showFilter = true;
      component.data = [
        { firstName: 'Jane', lastName: 'Doe' },
        { firstName: 'John', lastName: 'Smith' },
      ];
      setColumns(twoColumns);
      const emitted: { dataField: string; values: string[] }[] = [];
      component.filterChange.subscribe(event => emitted.push(event));

      getFilterToggles()[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();

      const checkboxes = getFilterOptionCheckboxes();
      checkboxes[0].dispatchEvent(new Event('change'));
      checkboxes[1].dispatchEvent(new Event('change'));

      expect(emitted).toEqual([
        { dataField: 'firstName', values: ['Jane'] },
        { dataField: 'firstName', values: ['Jane', 'John'] },
      ]);
    });

    it('unchecking a selected value removes it from the emitted values', () => {
      component.showFilter = true;
      component.data = [{ firstName: 'Jane', lastName: 'Doe' }];
      setColumns(twoColumns);
      const emitted: { dataField: string; values: string[] }[] = [];

      getFilterToggles()[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();

      const checkbox = getFilterOptionCheckboxes()[0];
      checkbox.dispatchEvent(new Event('change'));
      component.filterChange.subscribe(event => emitted.push(event));
      checkbox.dispatchEvent(new Event('change'));

      expect(emitted).toEqual([{ dataField: 'firstName', values: [] }]);
    });
  });

  describe('sorting', () => {
    it('renders no sort toggle when showSort is not set (defaults to false)', () => {
      setColumns(twoColumns);
      expect(getSortToggles().length).toBe(0);
    });

    it('renders one sort toggle per column when showSort is true', () => {
      component.showSort = true;
      setColumns(twoColumns);
      expect(getSortToggles().length).toBe(2);
    });

    it('emits sortToggle with the clicked column dataField', () => {
      component.showSort = true;
      setColumns(twoColumns);
      const emitted: string[] = [];
      component.sortToggle.subscribe(dataField => emitted.push(dataField));

      getSortToggles()[1].dispatchEvent(new Event('click'));

      expect(emitted).toEqual(['lastName']);
    });

    it('marks the active column\'s toggle and reflects its direction', () => {
      component.showSort = true;
      component.sort = { field: 'lastName', direction: 'asc' };
      setColumns(twoColumns);
      const toggles = getSortToggles();

      expect(toggles[0].classList).not.toContain('sort-toggle-active');
      expect(toggles[1].classList).toContain('sort-toggle-active');
    });
  });
});
