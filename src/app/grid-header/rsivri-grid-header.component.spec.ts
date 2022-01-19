import { TestBed } from '@angular/core/testing';
import { RsivriGridHeaderComponent } from './rsivri-grid-header.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        RsivriGridHeaderComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(RsivriGridHeaderComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'rsivri-data-grid'`, () => {
    const fixture = TestBed.createComponent(RsivriGridHeaderComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('rsivri-data-grid');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(RsivriGridHeaderComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content span')?.textContent).toContain('rsivri-data-grid app is running!');
  });
});
