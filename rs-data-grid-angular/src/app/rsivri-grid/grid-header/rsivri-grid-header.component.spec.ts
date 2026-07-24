import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RsivriGridHeaderComponent } from './rsivri-grid-header.component';
import { IColumn } from '../../../core/models/IColumn';

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
});
