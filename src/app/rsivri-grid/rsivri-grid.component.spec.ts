import { TestBed } from '@angular/core/testing';
import { RsivriGridComponent } from './rsivri-grid.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        RsivriGridComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(RsivriGridComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'rsivri-data-grid'`, () => {
    const fixture = TestBed.createComponent(RsivriGridComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('rsivri-data-grid');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(RsivriGridComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content span')?.textContent).toContain('rsivri-data-grid app is running!');
  });
});
