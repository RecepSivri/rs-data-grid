import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GridSettingsDialogComponent, GridSettingsDialogData } from './grid-settings-dialog.component';
import { IColumn } from '../../models/IColumn';

describe('GridSettingsDialogComponent', () => {
  let component: GridSettingsDialogComponent;
  let fixture: ComponentFixture<GridSettingsDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<GridSettingsDialogComponent>>;

  const columns: IColumn[] = [
    { caption: 'Title', dataField: 'title' },
    { caption: 'Year', dataField: 'year' },
    { caption: 'Genre', dataField: 'genre' },
  ];

  function setup(data: GridSettingsDialogData): void {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [GridSettingsDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GridSettingsDialogComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create, seeding `selected` from the injected data', () => {
    setup({ columns, selected: ['title'] });
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.selected).toEqual(['title']);
  });

  it('renders one mat-option per column (visible once the select is opened)', () => {
    setup({ columns, selected: [] });
    fixture.detectChanges();
    const trigger: HTMLElement = fixture.nativeElement.querySelector('.mat-mdc-select-trigger');
    trigger.click();
    fixture.detectChanges();
    const options = document.querySelectorAll('mat-option');
    expect(options.length).toBe(3);
  });

  it('omits the "Visible order" section and Clear button when nothing is selected', () => {
    setup({ columns, selected: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Visible order');
    expect(fixture.nativeElement.textContent).not.toContain('Clear');
  });

  it('shows the "Visible order" section with one chip per selected field, in order', () => {
    setup({ columns, selected: ['year', 'title'] });
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('.grid-settings-drag-chip');
    expect(Array.from(chips as NodeListOf<HTMLElement>).map(c => c.textContent?.trim().replace(/×$/, '').trim())).toEqual(['Year', 'Title']);
  });

  it('captionFor falls back to the raw field name when it is not among the known columns', () => {
    setup({ columns, selected: [] });
    fixture.detectChanges();
    expect(component.captionFor('unknown')).toBe('unknown');
  });

  it('onSelectChange updates `selected` and emits selectedChange', () => {
    setup({ columns, selected: [] });
    fixture.detectChanges();
    const emitted: string[][] = [];
    component.selectedChange.subscribe(v => emitted.push(v));
    component.onSelectChange(['title', 'year']);
    expect(component.selected).toEqual(['title', 'year']);
    expect(emitted).toEqual([['title', 'year']]);
  });

  it('removing a chip via its own remove button updates selected and emits', () => {
    setup({ columns, selected: ['title', 'year'] });
    fixture.detectChanges();
    const emitted: string[][] = [];
    component.selectedChange.subscribe(v => emitted.push(v));
    const removeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.grid-settings-chip-remove');
    removeBtn.click();
    expect(component.selected).toEqual(['year']);
    expect(emitted).toEqual([['year']]);
  });

  it('the Clear button clears the whole selection and emits', () => {
    setup({ columns, selected: ['title', 'year'] });
    fixture.detectChanges();
    const emitted: string[][] = [];
    component.selectedChange.subscribe(v => emitted.push(v));
    const clearBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b): b is HTMLButtonElement => (b as HTMLButtonElement).textContent?.trim() === 'Clear'
    )!;
    clearBtn.click();
    expect(component.selected).toEqual([]);
    expect(emitted).toEqual([[]]);
  });

  it('the Close button closes the dialog', () => {
    setup({ columns, selected: [] });
    fixture.detectChanges();
    const closeBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b): b is HTMLButtonElement => (b as HTMLButtonElement).textContent?.trim() === 'Close'
    )!;
    closeBtn.click();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  describe('drag-to-reorder the selected chips', () => {
    function dragEvent(type: string): DragEvent {
      return new DragEvent(type, { dataTransfer: new DataTransfer(), bubbles: true, cancelable: true });
    }

    it('dragging a chip onto a later one reorders the selection', () => {
      setup({ columns, selected: ['title', 'year', 'genre'] });
      fixture.detectChanges();
      const emitted: string[][] = [];
      component.selectedChange.subscribe(v => emitted.push(v));
      const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.grid-settings-drag-chip'));
      chips[0].dispatchEvent(dragEvent('dragstart'));
      chips[2].dispatchEvent(dragEvent('drop'));
      expect(emitted.at(-1)).toEqual(['year', 'genre', 'title']);
    });

    it('dragging a chip onto an earlier one reorders the selection', () => {
      setup({ columns, selected: ['title', 'year', 'genre'] });
      fixture.detectChanges();
      const emitted: string[][] = [];
      component.selectedChange.subscribe(v => emitted.push(v));
      const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.grid-settings-drag-chip'));
      chips[2].dispatchEvent(dragEvent('dragstart'));
      chips[0].dispatchEvent(dragEvent('drop'));
      expect(emitted.at(-1)).toEqual(['genre', 'title', 'year']);
    });

    it('dropping a chip onto itself is a no-op', () => {
      setup({ columns, selected: ['title', 'year'] });
      fixture.detectChanges();
      const emitted: string[][] = [];
      component.selectedChange.subscribe(v => emitted.push(v));
      const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.grid-settings-drag-chip'));
      chips[0].dispatchEvent(dragEvent('dragstart'));
      chips[0].dispatchEvent(dragEvent('drop'));
      expect(emitted).toEqual([]);
    });

    it('dropping with no active draggedField does not reorder', () => {
      setup({ columns, selected: ['title', 'year'] });
      fixture.detectChanges();
      const emitted: string[][] = [];
      component.selectedChange.subscribe(v => emitted.push(v));
      const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.grid-settings-drag-chip'));
      chips[1].dispatchEvent(dragEvent('drop'));
      expect(emitted).toEqual([]);
    });

    it('applies the drag-over highlight class on dragover and clears it on dragleave', () => {
      setup({ columns, selected: ['title', 'year'] });
      fixture.detectChanges();
      const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.grid-settings-drag-chip'));
      chips[1].dispatchEvent(dragEvent('dragover'));
      fixture.detectChanges();
      expect(chips[1].className).toContain('grid-settings-drag-chip-over');
      chips[1].dispatchEvent(dragEvent('dragleave'));
      fixture.detectChanges();
      expect(chips[1].className).not.toContain('grid-settings-drag-chip-over');
    });

    it('dragleave on a chip that is not the current dragOverField is a no-op', () => {
      setup({ columns, selected: ['title', 'year'] });
      fixture.detectChanges();
      const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.grid-settings-drag-chip'));
      chips[0].dispatchEvent(dragEvent('dragover'));
      chips[1].dispatchEvent(dragEvent('dragleave'));
      fixture.detectChanges();
      expect(chips[0].className).toContain('grid-settings-drag-chip-over');
    });

    it('dragend clears the dragged field so a later drop is a no-op', () => {
      setup({ columns, selected: ['title', 'year'] });
      fixture.detectChanges();
      const emitted: string[][] = [];
      component.selectedChange.subscribe(v => emitted.push(v));
      const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.grid-settings-drag-chip'));
      chips[0].dispatchEvent(dragEvent('dragstart'));
      chips[0].dispatchEvent(dragEvent('dragend'));
      chips[1].dispatchEvent(dragEvent('drop'));
      expect(emitted).toEqual([]);
    });
  });
});
