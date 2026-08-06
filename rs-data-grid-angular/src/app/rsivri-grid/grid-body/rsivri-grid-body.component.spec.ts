import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { RsivriGridBodyComponent } from './rsivri-grid-body.component';
import { IColumn } from '../../../core/models/IColumn';

describe('RsivriGridBodyComponent', () => {
  let component: RsivriGridBodyComponent;
  let fixture: ComponentFixture<RsivriGridBodyComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const columns: IColumn[] = [
    { caption: 'first name', dataField: 'firstName' },
    { caption: 'age', dataField: 'age' },
  ];

  function afterClosedReturning(value: any) {
    return { afterClosed: () => of(value) } as any;
  }

  // Flushes the microtask queue. Needed after fixture.detectChanges() before either
  // (a) re-checking a class/attribute binding that was updated by a plain property
  // mutation on an already-rendered node, or (b) reading the live DOM `.value` of an
  // [(ngModel)]-bound input, since NgModel writes the view value asynchronously
  // (FormsModule defers it via a resolved-promise microtask).
  async function settle(): Promise<void> {
    await fixture.whenStable();
  }

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [RsivriGridBodyComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialog, useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RsivriGridBodyComponent);
    component = fixture.componentInstance;
  });

  function getCells(root: Element = fixture.nativeElement): HTMLElement[] {
    return Array.from(root.querySelectorAll('.section-style'));
  }

  function getInputs(root: Element = fixture.nativeElement): HTMLInputElement[] {
    return Array.from(root.querySelectorAll('.inline-edit-input'));
  }

  function getActionButtons(root: Element = fixture.nativeElement): HTMLButtonElement[] {
    return Array.from(root.querySelectorAll('.row-action-button'));
  }

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('default (popup) display mode', () => {
    const rows = [
      { firstName: 'Jane', age: 30 },
      { firstName: 'John', age: 40 },
    ];

    it('renders one row and cell per item, with the raw field values', () => {
      component.columns = columns;
      component.data = rows;
      fixture.detectChanges();

      const cells = getCells();
      expect(cells.length).toBe(4);
      expect(cells[0].textContent?.trim()).toBe('Jane');
      expect(cells[1].textContent?.trim()).toBe('30');
      expect(cells[2].textContent?.trim()).toBe('John');
      expect(cells[3].textContent?.trim()).toBe('40');
    });

    it('renders no action buttons and no index column by default', () => {
      component.columns = columns;
      component.data = rows;
      fixture.detectChanges();
      expect(getActionButtons().length).toBe(0);
      expect(fixture.nativeElement.querySelector('.index-cell')).toBeNull();
    });

    it('renders the row index offset by indexOffset when showIndex is true', () => {
      component.columns = columns;
      component.data = rows;
      component.showIndex = true;
      component.indexOffset = 10;
      fixture.detectChanges();
      const indexCells: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.index-cell'));
      expect(indexCells.map(c => c.textContent?.trim())).toEqual(['11', '12']);
    });

    it('emits rowEdit (not the row-edit form) when the edit button is clicked in popup mode', () => {
      component.columns = columns;
      component.data = rows;
      component.showActions = true;
      component.gridMode = 'popup';
      fixture.detectChanges();

      const emitted: any[] = [];
      component.rowEdit.subscribe(row => emitted.push(row));

      getActionButtons()[0].click();

      expect(emitted).toEqual([rows[0]]);
      expect(component.editingRow).toBeNull();
    });

    it('emits rowDelete with the item when the delete button is clicked', () => {
      component.columns = columns;
      component.data = rows;
      component.showActions = true;
      fixture.detectChanges();

      const emitted: any[] = [];
      component.rowDelete.subscribe(row => emitted.push(row));

      // edit + delete per row -> delete is the 2nd button of the first row
      getActionButtons()[1].click();

      expect(emitted).toEqual([rows[0]]);
    });

    it('applies border-right to every action-cell column except the last, when bodyColumnLines is true', () => {
      component.columns = columns;
      component.data = [rows[0]];
      component.bodyColumnLines = true;
      component.showActions = false;
      fixture.detectChanges();
      const cells = getCells();
      expect(cells[0].classList).toContain('border-right');
      expect(cells[1].classList).not.toContain('border-right');
    });

    it('extends border-right to the last column when showActions is true', () => {
      component.columns = columns;
      component.data = [rows[0]];
      component.bodyColumnLines = true;
      component.showActions = true;
      fixture.detectChanges();
      const cells = getCells();
      expect(cells[1].classList).toContain('border-right');
    });

    it('applies no border-right classes when bodyColumnLines is false', () => {
      component.columns = columns;
      component.data = [rows[0]];
      component.bodyColumnLines = false;
      component.showActions = true;
      fixture.detectChanges();
      for (const cell of getCells()) {
        expect(cell.classList).not.toContain('border-right');
      }
    });
  });

  describe('row style/background classes', () => {
    const rows = [{ firstName: 'A' }, { firstName: 'B' }];
    const oneColumn: IColumn[] = [{ caption: 'first name', dataField: 'firstName' }];

    // Direct children of the template's own root (`.column-layout.full-row`), i.e. the
    // per-row host divs -- not the component's host element itself.
    function rowHosts(): HTMLElement[] {
      const root = fixture.nativeElement.querySelector('.column-layout.full-row') as HTMLElement;
      return Array.from(root.querySelectorAll(':scope > .full-row'));
    }

    it('marks the last row row-style-bottom when tableBorder is true', () => {
      component.columns = oneColumn;
      component.data = rows;
      component.tableBorder = true;
      component.bodyRowLines = false;
      fixture.detectChanges();
      const hosts = rowHosts();
      expect(hosts[0].classList).not.toContain('row-style-bottom');
      expect(hosts[1].classList).toContain('row-style-bottom');
    });

    it('marks non-last rows row-style-bottom when bodyRowLines is true (even if tableBorder is true)', () => {
      component.columns = oneColumn;
      component.data = rows;
      component.tableBorder = true;
      component.bodyRowLines = true;
      fixture.detectChanges();
      const hosts = rowHosts();
      expect(hosts[0].classList).toContain('row-style-bottom');
      expect(hosts[1].classList).toContain('row-style-bottom');
    });

    it('applies no row-style-bottom anywhere when both tableBorder and bodyRowLines are false', () => {
      component.columns = oneColumn;
      component.data = rows;
      component.tableBorder = false;
      component.bodyRowLines = false;
      fixture.detectChanges();
      for (const host of rowHosts()) {
        expect(host.classList).not.toContain('row-style-bottom');
      }
    });

    it('applies row-style only when tableBorder is true', async () => {
      component.columns = oneColumn;
      component.data = rows;
      component.tableBorder = true;
      fixture.detectChanges();
      expect(rowHosts()[0].classList).toContain('row-style');

      component.tableBorder = false;
      await settle();
      fixture.detectChanges();
      expect(rowHosts()[0].classList).not.toContain('row-style');
    });

    it('marks the last row border-area-small only when borderRadiusBottom is true', async () => {
      component.columns = oneColumn;
      component.data = rows;
      component.borderRadiusBottom = true;
      fixture.detectChanges();
      const hosts = rowHosts();
      expect(hosts[0].classList).not.toContain('border-area-small');
      expect(hosts[1].classList).toContain('border-area-small');

      component.borderRadiusBottom = false;
      await settle();
      fixture.detectChanges();
      expect(rowHosts()[1].classList).not.toContain('border-area-small');
    });

    it('applies row-background to odd rows only when diagonalRow is true', () => {
      component.columns = oneColumn;
      component.data = [{ firstName: 'A' }, { firstName: 'B' }, { firstName: 'C' }];
      component.diagonalRow = true;
      fixture.detectChanges();
      const hosts = rowHosts();
      expect(hosts[0].classList).not.toContain('row-background');
      expect(hosts[1].classList).toContain('row-background');
      expect(hosts[2].classList).not.toContain('row-background');
    });

    it('applies no row-background to odd rows when diagonalRow is false', () => {
      component.columns = oneColumn;
      component.data = rows;
      component.diagonalRow = false;
      fixture.detectChanges();
      expect(rowHosts()[1].classList).not.toContain('row-background');
    });
  });

  describe('row-mode inline editing', () => {
    const rows = [{ firstName: 'Jane', age: null as any }];

    beforeEach(() => {
      component.columns = columns;
      component.data = rows;
      component.showActions = true;
      component.gridMode = 'row';
      fixture.detectChanges();
    });

    it('does not emit rowEdit and instead opens an inline edit row when the edit button is clicked', async () => {
      const emitted: any[] = [];
      component.rowEdit.subscribe(row => emitted.push(row));

      getActionButtons()[0].click();
      await settle();
      fixture.detectChanges();

      expect(emitted).toEqual([]);
      expect(component.editingRow).toBe(rows[0]);
      // null becomes '' in the draft
      expect(component.editDraft).toEqual({ firstName: 'Jane', age: '' });
      expect(getInputs().length).toBe(2);
      expect(getInputs()[0].value).toBe('Jane');
    });

    it('confirms and emits batchRowSave with the merged row on save, then exits edit mode', async () => {
      dialogSpy.open.and.returnValue(afterClosedReturning(true));
      getActionButtons()[0].click();
      await settle();
      fixture.detectChanges();

      component.editDraft['firstName'] = 'Janet';
      const emitted: { original: any; updated: any }[] = [];
      component.batchRowSave.subscribe(payload => emitted.push(payload));

      const saveButton = fixture.nativeElement.querySelector('.row-action-save') as HTMLButtonElement;
      saveButton.click();

      expect(dialogSpy.open).toHaveBeenCalled();
      // editDraft always carries a (possibly empty-string) value for every column, so the
      // merged row's `age` comes from the draft ('' -- the stringified form of the original
      // null), not from the original row's raw null.
      expect(emitted).toEqual([{ original: rows[0], updated: { firstName: 'Janet', age: '' } }]);
      expect(component.editingRow).toBeNull();
    });

    it('does not emit or exit edit mode when the confirm dialog is dismissed', async () => {
      dialogSpy.open.and.returnValue(afterClosedReturning(false));
      getActionButtons()[0].click();
      await settle();
      fixture.detectChanges();

      const emitted: any[] = [];
      component.batchRowSave.subscribe(payload => emitted.push(payload));

      const saveButton = fixture.nativeElement.querySelector('.row-action-save') as HTMLButtonElement;
      saveButton.click();

      expect(emitted).toEqual([]);
      expect(component.editingRow).toBe(rows[0]);
    });

    it('exits edit mode without emitting when cancel is clicked', async () => {
      getActionButtons()[0].click();
      await settle();
      fixture.detectChanges();

      const cancelButton = fixture.nativeElement.querySelectorAll('.actions-cell .row-action-button')[1] as HTMLButtonElement;
      cancelButton.click();
      await settle();
      fixture.detectChanges();

      expect(component.editingRow).toBeNull();
      expect(getInputs().length).toBe(0);
    });
  });

  describe('adding a row (row mode "add" form)', () => {
    beforeEach(() => {
      component.columns = columns;
      component.data = [];
      component.showActions = true;
    });

    it('renders nothing extra when isAddingRow is false', () => {
      fixture.detectChanges();
      expect(getInputs().length).toBe(0);
    });

    it('startAddingRow shows one empty input per column', () => {
      component.startAddingRow();
      fixture.detectChanges();
      expect(component.isAddingRow).toBeTrue();
      expect(component.addDraft).toEqual({ firstName: '', age: '' });
      const inputs = getInputs();
      expect(inputs.length).toBe(2);
      expect(inputs[0].value).toBe('');
    });

    it('shows an index cell placeholder in the add row when showIndex is true', () => {
      component.showIndex = true;
      component.startAddingRow();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.index-cell')).toBeTruthy();
    });

    it('confirms and emits batchRowAdd with the entered draft, then closes the form', () => {
      dialogSpy.open.and.returnValue(afterClosedReturning(true));
      component.startAddingRow();
      fixture.detectChanges();
      component.addDraft['firstName'] = 'New';
      component.addDraft['age'] = '5';

      const emitted: any[] = [];
      component.batchRowAdd.subscribe(row => emitted.push(row));

      const saveButton = fixture.nativeElement.querySelector('.row-action-save') as HTMLButtonElement;
      saveButton.click();

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(emitted).toEqual([{ firstName: 'New', age: '5' }]);
      expect(component.isAddingRow).toBeFalse();
    });

    it('does not emit or close the form when the confirm dialog is dismissed', () => {
      dialogSpy.open.and.returnValue(afterClosedReturning(false));
      component.startAddingRow();
      fixture.detectChanges();

      const emitted: any[] = [];
      component.batchRowAdd.subscribe(row => emitted.push(row));

      const saveButton = fixture.nativeElement.querySelector('.row-action-save') as HTMLButtonElement;
      saveButton.click();

      expect(emitted).toEqual([]);
      expect(component.isAddingRow).toBeTrue();
    });

    it('closes the form without emitting when cancel is clicked', () => {
      component.startAddingRow();
      fixture.detectChanges();

      const cancelButton = fixture.nativeElement.querySelector('.actions-cell .row-action-button:not(.row-action-save)') as HTMLButtonElement;
      cancelButton.click();
      fixture.detectChanges();

      expect(component.isAddingRow).toBeFalse();
      expect(getInputs().length).toBe(0);
    });

    it('applies border-right to add-row cells per column/showActions rules, respecting bodyColumnLines', async () => {
      component.bodyColumnLines = true;
      component.showActions = true;
      component.startAddingRow();
      fixture.detectChanges();
      const cells = getCells();
      expect(cells[0].classList).toContain('border-right');
      expect(cells[1].classList).toContain('border-right'); // last column, but showActions is true

      component.bodyColumnLines = false;
      await settle();
      fixture.detectChanges();
      for (const cell of getCells()) {
        expect(cell.classList).not.toContain('border-right');
      }
    });
  });

  describe('batch mode', () => {
    let rowA: any;
    let rowB: any;

    beforeEach(() => {
      rowA = { firstName: 'Jane', age: 30 };
      rowB = { firstName: 'John', age: null };
      component.columns = columns;
      component.gridMode = 'batch';
      component.showActions = true;
    });

    it('syncs one editable draft per row, converting null/undefined to empty strings', async () => {
      component.data = [rowA, rowB];
      component.ngOnChanges({ data: {} as any });
      fixture.detectChanges();
      await settle();

      expect(component.batchDrafts).toEqual([
        { firstName: 'Jane', age: '30' },
        { firstName: 'John', age: '' },
      ]);
      const inputs = getInputs();
      expect(inputs.length).toBe(4);
      expect(inputs[0].value).toBe('Jane');
    });

    it('does not sync drafts when gridMode is not batch', () => {
      component.gridMode = 'popup';
      component.data = [rowA];
      const spy = spyOn<any>(component, 'syncBatchDrafts');
      component.ngOnChanges({ data: {} as any });
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not sync drafts when none of data/columns/gridMode are in the change set', () => {
      component.data = [rowA];
      const spy = spyOn<any>(component, 'syncBatchDrafts');
      component.ngOnChanges({} as any);
      expect(spy).not.toHaveBeenCalled();
    });

    it('syncs when only columns changes', () => {
      component.data = [rowA];
      const spy = spyOn<any>(component, 'syncBatchDrafts').and.callThrough();
      component.ngOnChanges({ columns: {} as any });
      expect(spy).toHaveBeenCalled();
    });

    it('syncs when only gridMode changes', () => {
      component.data = [rowA];
      const spy = spyOn<any>(component, 'syncBatchDrafts').and.callThrough();
      component.ngOnChanges({ gridMode: {} as any });
      expect(spy).toHaveBeenCalled();
    });

    it('preserves in-progress edits for a row across a resync when its identity is unchanged', () => {
      component.data = [rowA, rowB];
      component.ngOnChanges({ data: {} as any });

      component.batchDrafts[0]['firstName'] = 'Jane Edited';

      // same row objects, same order -> edited draft must be preserved
      component.ngOnChanges({ data: {} as any });
      expect(component.batchDrafts[0]['firstName']).toBe('Jane Edited');
      expect(component.batchDrafts[1]).toEqual({ firstName: 'John', age: '' });
    });

    it('drops the stale draft and builds a fresh one when a row is replaced by a new object', () => {
      component.data = [rowA, rowB];
      component.ngOnChanges({ data: {} as any });
      component.batchDrafts[0]['firstName'] = 'Jane Edited';

      const rowC = { firstName: 'Carl', age: 22 };
      component.data = [rowA, rowC];
      component.ngOnChanges({ data: {} as any });

      expect(component.batchDrafts[0]['firstName']).toBe('Jane Edited');
      expect(component.batchDrafts[1]).toEqual({ firstName: 'Carl', age: '22' });
    });

    it('falls back to a fresh draft when a stale row-ref index has no matching prior draft (defensive guard)', () => {
      // Contrived internal state: more row-refs than drafts, exercising the `if (this.batchDrafts[i])` guard's false path.
      (component as any).batchDraftRowRefs = [rowA, rowB];
      component.batchDrafts = [{ firstName: 'Jane', age: '30' }];
      component.data = [rowA, rowB];

      (component as any).syncBatchDrafts();

      expect(component.batchDrafts).toEqual([
        { firstName: 'Jane', age: '30' },
        { firstName: 'John', age: '' },
      ]);
    });

    it('emits rowDelete with the item when the batch-row delete button is clicked', () => {
      component.data = [rowA];
      component.ngOnChanges({ data: {} as any });
      fixture.detectChanges();

      const emitted: any[] = [];
      component.rowDelete.subscribe(row => emitted.push(row));
      getActionButtons()[0].click();

      expect(emitted).toEqual([rowA]);
    });

    it('applies border-right to batch-row cells per column/showActions rules, respecting bodyColumnLines', async () => {
      component.bodyColumnLines = true;
      component.data = [rowA];
      component.ngOnChanges({ data: {} as any });
      fixture.detectChanges();
      const cells = getCells();
      expect(cells[0].classList).toContain('border-right');
      expect(cells[1].classList).toContain('border-right'); // last column, but showActions is true

      component.bodyColumnLines = false;
      await settle();
      fixture.detectChanges();
      for (const cell of getCells()) {
        expect(cell.classList).not.toContain('border-right');
      }
    });

    describe('addBatchRow / removeBatchNewRow / saveBatch', () => {
      it('addBatchRow appends an empty draft row rendered after existing rows', () => {
        component.data = [];
        component.ngOnChanges({ data: {} as any });
        component.addBatchRow();
        fixture.detectChanges();

        expect(component.batchNewDrafts).toEqual([{ firstName: '', age: '' }]);
        const inputs = getInputs();
        expect(inputs.length).toBe(2);
      });

      it('shows an index placeholder cell for new batch rows when showIndex is true', () => {
        component.showIndex = true;
        component.data = [];
        component.ngOnChanges({ data: {} as any });
        component.addBatchRow();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.index-cell')).toBeTruthy();
      });

      it('removeBatchNewRow removes only the targeted new-row draft', () => {
        component.data = [];
        component.ngOnChanges({ data: {} as any });
        component.addBatchRow();
        component.addBatchRow();
        component.batchNewDrafts[0]['firstName'] = 'First';
        component.batchNewDrafts[1]['firstName'] = 'Second';

        component.removeBatchNewRow(0);

        expect(component.batchNewDrafts.length).toBe(1);
        expect(component.batchNewDrafts[0]['firstName']).toBe('Second');
      });

      it('removeBatchNewRow is wired to the remove button click', () => {
        component.data = [];
        component.ngOnChanges({ data: {} as any });
        component.addBatchRow();
        fixture.detectChanges();

        const removeButton = fixture.nativeElement.querySelector('.row-action-button') as HTMLButtonElement;
        removeButton.click();
        fixture.detectChanges();

        expect(component.batchNewDrafts.length).toBe(0);
        expect(getInputs().length).toBe(0);
      });

      it('applies border-right to new-batch-row cells per column/showActions rules, respecting bodyColumnLines', async () => {
        component.bodyColumnLines = true;
        component.data = [];
        component.ngOnChanges({ data: {} as any });
        component.addBatchRow();
        fixture.detectChanges();
        const cells = getCells();
        expect(cells[0].classList).toContain('border-right');
        expect(cells[1].classList).toContain('border-right'); // last column, but showActions is true

        component.bodyColumnLines = false;
        await settle();
        fixture.detectChanges();
        for (const cell of getCells()) {
          expect(cell.classList).not.toContain('border-right');
        }
      });

      it('saveBatch emits only dirty rows as updated, maps new drafts as added, and clears the add buffer', () => {
        component.data = [rowA, rowB];
        component.ngOnChanges({ data: {} as any });
        component.batchDrafts[0]['firstName'] = 'Jane Edited'; // dirty
        // batchDrafts[1] left equal to rowB -> not dirty
        component.addBatchRow();
        component.batchNewDrafts[0]['firstName'] = 'Newcomer';
        component.batchNewDrafts[0]['age'] = '1';

        const emitted: { added: any[]; updated: { original: any; updated: any }[] }[] = [];
        component.batchCommit.subscribe(payload => emitted.push(payload));

        component.saveBatch();

        expect(emitted.length).toBe(1);
        // The draft always carries string values for every column, including the untouched
        // `age`, so the merged row's `age` is the stringified '30', not the original number.
        expect(emitted[0].updated).toEqual([
          { original: rowA, updated: { firstName: 'Jane Edited', age: '30' } }
        ]);
        expect(emitted[0].added).toEqual([{ firstName: 'Newcomer', age: '1' }]);
        expect(component.batchNewDrafts).toEqual([]);
      });

      it('treats a row whose stored value is nullish as an empty string for dirty comparison', () => {
        const rowNullAge = { firstName: 'X', age: null as any };
        component.data = [rowNullAge];
        component.ngOnChanges({ data: {} as any });
        // draft already has age '' to match the nullish original -> not dirty
        const emitted: any[] = [];
        component.batchCommit.subscribe(payload => emitted.push(payload));

        component.saveBatch();

        expect(emitted[0].updated).toEqual([]);
      });

      it('skips rows that have no corresponding draft (defensive guard)', () => {
        component.data = [rowA, rowB];
        component.ngOnChanges({ data: {} as any });
        // Contrived: drop the draft for the 2nd row entirely.
        component.batchDrafts = [component.batchDrafts[0]];
        component.batchDrafts[0]['firstName'] = 'Jane Edited';

        const emitted: any[] = [];
        component.batchCommit.subscribe(payload => emitted.push(payload));

        component.saveBatch();

        expect(emitted[0].updated).toEqual([{ original: rowA, updated: { firstName: 'Jane Edited', age: '30' } }]);
      });
    });
  });
});
