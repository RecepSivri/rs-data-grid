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

  it('renders the drag-header and index leading cells with border-right when enabled', () => {
    component.dragDropRows = true;
    component.showIndex = true;
    component.headerColumnLines = true;
    setColumns(twoColumns);
    const dragCell: HTMLElement = fixture.nativeElement.querySelector('.drag-header-cell');
    const indexCell: HTMLElement = fixture.nativeElement.querySelector('.index-header-cell');
    expect(dragCell.classList).toContain('border-right');
    expect(indexCell.classList).toContain('border-right');
    expect(indexCell.textContent?.trim()).toBe('#');
  });

  it('omits border-right on the leading cells when headerColumnLines is false', () => {
    component.dragDropRows = true;
    component.showIndex = true;
    component.headerColumnLines = false;
    setColumns(twoColumns);
    const dragCell: HTMLElement = fixture.nativeElement.querySelector('.drag-header-cell');
    expect(dragCell.classList).not.toContain('border-right');
  });

  it('does not render the leading cells when dragDropRows/showIndex are off', () => {
    setColumns(twoColumns);
    expect(fixture.nativeElement.querySelector('.drag-header-cell')).toBeNull();
    expect(fixture.nativeElement.querySelector('.index-header-cell')).toBeNull();
  });

  it('renders the Actions header cell when showActions is true, and omits the last border-right', () => {
    component.showActions = true;
    component.headerColumnLines = true;
    setColumns(twoColumns);
    expect(fixture.nativeElement.querySelector('.actions-header-cell')?.textContent?.trim()).toBe('Actions');
    expect(getCells()[1].classList).toContain('border-right');
  });

  it('does not render the Actions header cell when showActions is false', () => {
    setColumns(twoColumns);
    expect(fixture.nativeElement.querySelector('.actions-header-cell')).toBeNull();
  });

  describe('drag-to-reorder columns', () => {
    function dragEvent(type: string): DragEvent {
      return new DragEvent(type, { dataTransfer: new DataTransfer(), bubbles: true, cancelable: true });
    }

    it('does not render drag handles when dragDropColumns is off', () => {
      setColumns(twoColumns);
      expect(fixture.nativeElement.querySelector('.drag-handle')).toBeNull();
    });

    it('renders a drag handle per column when dragDropColumns is on', () => {
      component.dragDropColumns = true;
      setColumns(twoColumns);
      expect(fixture.nativeElement.querySelectorAll('.drag-handle').length).toBe(2);
    });

    it('sets dataTransfer.effectAllowed on dragstart', () => {
      component.dragDropColumns = true;
      setColumns(twoColumns);
      const handle: HTMLElement = fixture.nativeElement.querySelector('.drag-handle');
      expect(() => handle.dispatchEvent(dragEvent('dragstart'))).not.toThrow();
    });

    it('highlights the hovered column cell on dragover and clears it on dragleave', () => {
      component.dragDropColumns = true;
      setColumns(twoColumns);
      const cell = getCells()[0];
      cell.dispatchEvent(dragEvent('dragover'));
      fixture.detectChanges();
      expect(cell.classList).toContain('column-drag-over');
      cell.dispatchEvent(dragEvent('dragleave'));
      fixture.detectChanges();
      expect(cell.classList).not.toContain('column-drag-over');
    });

    it('dragleave on a cell that is not the current dragOverField is a no-op', () => {
      component.dragDropColumns = true;
      setColumns(twoColumns);
      const [cellA, cellB] = getCells();
      cellA.dispatchEvent(dragEvent('dragover'));
      cellB.dispatchEvent(dragEvent('dragleave'));
      fixture.detectChanges();
      expect(cellA.classList).toContain('column-drag-over');
    });

    it('drop calls columnMove with the dragged and target fields, then clears drag state', () => {
      component.dragDropColumns = true;
      setColumns(twoColumns);
      const emitted: { fromField: string; toField: string }[] = [];
      component.columnMove.subscribe(e => emitted.push(e));
      const handles = fixture.nativeElement.querySelectorAll('.drag-handle');
      const cells = getCells();
      handles[0].dispatchEvent(dragEvent('dragstart'));
      cells[1].dispatchEvent(dragEvent('drop'));
      expect(emitted).toEqual([{ fromField: 'firstName', toField: 'lastName' }]);
    });

    it('drop with no active draggedField does not emit columnMove', () => {
      component.dragDropColumns = true;
      setColumns(twoColumns);
      const emitted: unknown[] = [];
      component.columnMove.subscribe(e => emitted.push(e));
      getCells()[1].dispatchEvent(dragEvent('drop'));
      expect(emitted).toEqual([]);
    });

    it('dragend clears the dragged field so a later drop is a no-op', () => {
      component.dragDropColumns = true;
      setColumns(twoColumns);
      const emitted: unknown[] = [];
      component.columnMove.subscribe(e => emitted.push(e));
      const handles = fixture.nativeElement.querySelectorAll('.drag-handle');
      handles[0].dispatchEvent(dragEvent('dragstart'));
      handles[0].dispatchEvent(dragEvent('dragend'));
      getCells()[1].dispatchEvent(dragEvent('drop'));
      expect(emitted).toEqual([]);
    });

    it('when dragDropColumns is off, the cell dragover/dragleave/drop handlers are no-ops', () => {
      setColumns(twoColumns);
      const cell = getCells()[0];
      expect(() => {
        cell.dispatchEvent(dragEvent('dragover'));
        cell.dispatchEvent(dragEvent('dragleave'));
        cell.dispatchEvent(dragEvent('drop'));
      }).not.toThrow();
      expect(cell.classList).not.toContain('column-drag-over');
    });
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

    it('closes the dropdown when the toggle is clicked again', () => {
      component.showFilter = true;
      setColumns(twoColumns);
      const toggle = getFilterToggles()[0];
      toggle.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(toggle.classList).toContain('filter-toggle-open');
      toggle.dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.filter-panel')).toBeNull();
    });

    it('opening a second column\'s dropdown closes the first', () => {
      component.showFilter = true;
      setColumns(twoColumns);
      const toggles = getFilterToggles();
      toggles[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();
      toggles[1].dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(toggles[0].classList).not.toContain('filter-toggle-open');
      expect(toggles[1].classList).toContain('filter-toggle-open');
    });

    it('shows "No values" when the column has none among the (cross-filtered) rows', () => {
      component.showFilter = true;
      component.data = [];
      setColumns(twoColumns);
      getFilterToggles()[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.filter-empty')?.textContent?.trim()).toBe('No values');
    });

    it('excludes null/undefined/empty-string values from the options list', () => {
      component.showFilter = true;
      component.data = [{ firstName: 'A', lastName: '' }, { firstName: null, lastName: 'x' }, { firstName: undefined, lastName: 'y' }];
      setColumns(twoColumns);
      getFilterToggles()[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();
      const values = Array.from(fixture.nativeElement.querySelectorAll('.filter-option span:last-child')).map((s: any) => s.textContent);
      expect(values).toEqual(['A']);
    });

    it('excludes the current column\'s own selection when computing its own cross-filter options', () => {
      component.showFilter = true;
      component.data = [
        { firstName: 'Alice', lastName: 'Ankara' },
        { firstName: 'Bob', lastName: 'Istanbul' },
        { firstName: 'Carol', lastName: 'Ankara' },
      ];
      setColumns(twoColumns);
      // Select "Ankara" for lastName first.
      getFilterToggles()[1].dispatchEvent(new Event('click'));
      fixture.detectChanges();
      getFilterOptionCheckboxes()[0].dispatchEvent(new Event('change'));
      fixture.detectChanges();
      // Now open firstName's dropdown -- cross-filtered by lastName=Ankara (Alice, Carol).
      getFilterToggles()[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();
      const values = Array.from(fixture.nativeElement.querySelectorAll('.filter-option span:last-child')).map((s: any) => s.textContent);
      expect(values).toEqual(['Alice', 'Carol']);
    });

    it('clicking the filter-count badge clears that filter', () => {
      component.showFilter = true;
      component.data = [{ firstName: 'Jane', lastName: 'Doe' }];
      setColumns(twoColumns);
      const emitted: { dataField: string; values: string[] }[] = [];
      getFilterToggles()[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();
      getFilterOptionCheckboxes()[0].dispatchEvent(new Event('change'));
      fixture.detectChanges();
      component.filterChange.subscribe(event => emitted.push(event));
      const badge: HTMLElement = fixture.nativeElement.querySelector('.filter-count');
      expect(badge.textContent?.trim()).toBe('1');
      badge.dispatchEvent(new Event('click'));
      expect(emitted).toEqual([{ dataField: 'firstName', values: [] }]);
    });

    it('shows "Clear selection" once something is selected, and it clears the filter', () => {
      component.showFilter = true;
      component.data = [{ firstName: 'Jane', lastName: 'Doe' }];
      setColumns(twoColumns);
      const emitted: { dataField: string; values: string[] }[] = [];
      getFilterToggles()[0].dispatchEvent(new Event('click'));
      fixture.detectChanges();
      getFilterOptionCheckboxes()[0].dispatchEvent(new Event('change'));
      fixture.detectChanges();
      const clearBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.filter-clear');
      expect(clearBtn).not.toBeNull();
      component.filterChange.subscribe(event => emitted.push(event));
      clearBtn.click();
      expect(emitted).toEqual([{ dataField: 'firstName', values: [] }]);
    });

    it('a click inside the filter-dropdown does not bubble to the document close-listener', () => {
      component.showFilter = true;
      setColumns(twoColumns);
      getFilterToggles()[0].dispatchEvent(new Event('click', { bubbles: true }));
      fixture.detectChanges();
      const dropdown: HTMLElement = fixture.nativeElement.querySelector('.filter-dropdown');
      dropdown.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.filter-panel')).not.toBeNull();
    });

    it('a click outside the header (document) closes an open filter dropdown', () => {
      component.showFilter = true;
      setColumns(twoColumns);
      getFilterToggles()[0].dispatchEvent(new Event('click', { bubbles: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.filter-panel')).not.toBeNull();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.filter-panel')).toBeNull();
    });

    it('renders the leading drag/index filter-row cells with border-right when bodyColumnLines is on', () => {
      component.showFilter = true;
      component.dragDropRows = true;
      component.showIndex = true;
      component.bodyColumnLines = true;
      setColumns(twoColumns);
      const dragCell: HTMLElement = fixture.nativeElement.querySelector('.drag-header-cell.filter-cell');
      const indexCell: HTMLElement = fixture.nativeElement.querySelector('.index-header-cell.filter-cell');
      expect(dragCell.classList).toContain('border-right');
      expect(indexCell.classList).toContain('border-right');
    });

    it('omits border-right on the leading filter-row cells when bodyColumnLines is off', () => {
      component.showFilter = true;
      component.dragDropRows = true;
      component.showIndex = true;
      component.bodyColumnLines = false;
      setColumns(twoColumns);
      const dragCell: HTMLElement = fixture.nativeElement.querySelector('.drag-header-cell.filter-cell');
      expect(dragCell.classList).not.toContain('border-right');
    });

    it('renders an actions filter-cell placeholder when showActions is true', () => {
      component.showFilter = true;
      component.showActions = true;
      setColumns(twoColumns);
      expect(fixture.nativeElement.querySelector('.actions-header-cell.filter-cell')).not.toBeNull();
    });

    it('applies filter-row-border only when tableBorder is true', () => {
      component.showFilter = true;
      component.tableBorder = false;
      setColumns(twoColumns);
      expect(fixture.nativeElement.querySelector('.filter-row').classList).not.toContain('filter-row-border');
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
