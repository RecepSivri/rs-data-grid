import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EditRowDialogComponent, EditRowDialogData } from './edit-row-dialog.component';

describe('EditRowDialogComponent', () => {
  let component: EditRowDialogComponent;
  let fixture: ComponentFixture<EditRowDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EditRowDialogComponent, any>>;

  function setup(data: EditRowDialogData): void {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [EditRowDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditRowDialogComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('editing an existing row', () => {
    beforeEach(() => {
      setup({ row: { firstName: 'Jane', age: 30, nickname: null, note: undefined } });
      fixture.detectChanges();
    });

    it('should create and title the dialog "Edit row"', () => {
      expect(component).toBeTruthy();
      const titleEl = fixture.nativeElement.querySelector('h2');
      expect(titleEl.textContent.trim()).toBe('Edit row');
    });

    it('builds one field per row entry and stringifies non-null values', () => {
      expect(component.fields).toEqual([{ key: 'firstName' }, { key: 'age' }, { key: 'nickname' }, { key: 'note' }]);
      expect(component.editableRow).toEqual({ firstName: 'Jane', age: '30', nickname: '', note: '' });
    });

    it('renders one labeled input per field', async () => {
      const labels: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.edit-label'));
      expect(labels.map(l => l.textContent?.trim())).toEqual(['firstName', 'age', 'nickname', 'note']);
      const inputs: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('.edit-input'));
      expect(inputs.length).toBe(4);
      // [(ngModel)] writes the initial DOM value asynchronously (FormsModule defers it via a
      // resolved-promise microtask), so the value must be read after flushing microtasks.
      await Promise.resolve();
      expect(inputs[0].value).toBe('Jane');
    });

    it('onSave merges the edited fields onto the original row and closes with the result', () => {
      component.editableRow['firstName'] = 'Janet';
      component.onSave();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({
        firstName: 'Janet', age: '30', nickname: '', note: ''
      });
    });

    it('clicking Save triggers onSave via the template', () => {
      const saveButton: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[1];
      saveButton.click();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ firstName: 'Jane', age: '30', nickname: '', note: '' });
    });

    it('onCancel closes the dialog with undefined', () => {
      component.onCancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(undefined);
    });

    it('clicking Cancel triggers onCancel via the template', () => {
      const cancelButton: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[0];
      cancelButton.click();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(undefined);
    });
  });

  describe('adding a new row', () => {
    it('builds one empty field per provided column and titles the dialog "Add row"', () => {
      setup({ columns: [{ caption: 'First Name', dataField: 'firstName' }, { caption: 'Age', dataField: 'age' }] });
      fixture.detectChanges();

      expect(component.fields).toEqual([{ key: 'firstName' }, { key: 'age' }]);
      expect(component.editableRow).toEqual({ firstName: '', age: '' });
      const titleEl = fixture.nativeElement.querySelector('h2');
      expect(titleEl.textContent.trim()).toBe('Add row');
    });

    it('falls back to no fields when neither row nor columns are provided', () => {
      setup({});
      fixture.detectChanges();

      expect(component.fields).toEqual([]);
      expect(component.editableRow).toEqual({});
      expect(fixture.nativeElement.querySelectorAll('.edit-row').length).toBe(0);
    });

    it('onSave spreads the (undefined) original row and includes the entered field values', () => {
      setup({ columns: [{ caption: 'First Name', dataField: 'firstName' }] });
      fixture.detectChanges();
      component.editableRow['firstName'] = 'Jane';
      component.onSave();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ firstName: 'Jane' });
    });
  });
});
