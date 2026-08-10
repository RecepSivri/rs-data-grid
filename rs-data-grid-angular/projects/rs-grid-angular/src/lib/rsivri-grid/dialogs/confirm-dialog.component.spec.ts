import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent, boolean>>;

  function setup(data: ConfirmDialogData): void {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    setup({ title: 'Confirm delete', message: 'Are you sure?' });
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders the provided title and message', () => {
    setup({ title: 'Confirm delete', message: 'Are you sure you want to delete this row?' });
    fixture.detectChanges();
    const titleEl = fixture.nativeElement.querySelector('h2');
    const messageEl = fixture.nativeElement.querySelector('.confirm-message');
    expect(titleEl.textContent.trim()).toBe('Confirm delete');
    expect(messageEl.textContent.trim()).toBe('Are you sure you want to delete this row?');
  });

  it('falls back to "Confirm" as the title when none is provided', () => {
    setup({ message: 'Are you sure?' });
    fixture.detectChanges();
    const titleEl = fixture.nativeElement.querySelector('h2');
    expect(titleEl.textContent.trim()).toBe('Confirm');
  });

  it('closes the dialog with true when onConfirm is called (Yes button)', () => {
    setup({ message: 'Are you sure?' });
    fixture.detectChanges();
    const yesButton: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[1];
    yesButton.click();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('closes the dialog with false when onCancel is called (No button)', () => {
    setup({ message: 'Are you sure?' });
    fixture.detectChanges();
    const noButton: HTMLButtonElement = fixture.nativeElement.querySelectorAll('button')[0];
    noButton.click();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
