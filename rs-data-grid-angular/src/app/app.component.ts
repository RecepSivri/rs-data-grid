import { ChangeDetectionStrategy, Component, computed, effect, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RsivriGridComponent } from 'rs-grid-angular';
import { singleSpaPropsSubject } from '../single-spa/single-spa-props';

// Used only when this app is run standalone (`ng serve`), outside the
// single-spa root-config that would normally supply gridConfig via props.
const defaultGridConfig: Record<string, any> = {
  theme: 'light',
  fetchUrl: 'https://gist.githubusercontent.com/Strift/1524ab5e2015e50bbcb215fb4d950a38/raw/movies-lite.json',
  apiMethod: 'GET',
  apiHeaders: {},
  authToken: '',
  entrySection: '',
  remoteMode: false,
  dataSource: [],
  headerRowLines: true,
  headerColumnLines: true,
  bodyRowLines: true,
  bodyColumnLines: true,
  tableBorder: true,
  borderRadiusTop: true,
  borderRadiusBottom: false,
  diagonalRow: true,
  dragDropColumns: false,
  dragDropRows: false,
  pagination: true,
  pagingSizes: [10, 20, 50, 70, 100],
  showFilter: true,
  showSort: true,
  showSearch: true,
  showActions: true,
  showAdd: true,
  showGridSettings: true,
  showIndex: false,
  exportExcel: true,
  exportPDF: true,
  currentPagingSize: 10,
  pageListSize: 5,
  gridMode: 'popup',
};

interface GridAppProps {
  gridConfig?: Record<string, any>;
  fetchNonce?: number;
  onRowAdd?: (row: any) => void;
  onRowEdit?: (row: any) => void;
  onRowDelete?: (row: any) => void;
  onBatchSave?: (payload: any) => void;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RsivriGridComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly singleSpaProps = toSignal(singleSpaPropsSubject);
  readonly grid = viewChild<RsivriGridComponent>('grid');

  readonly gridConfig = computed(() => (this.singleSpaProps() as GridAppProps | undefined)?.gridConfig ?? defaultGridConfig);

  private isFirstFetchNonce = true;

  constructor() {
    // The sidebar's "Fetch" button lives in the root-config shell; it bumps
    // fetchNonce, which we watch here to trigger a manual refetch.
    effect(() => {
      const nonce = (this.singleSpaProps() as GridAppProps | undefined)?.fetchNonce;
      if (nonce === undefined) {
        return;
      }
      if (this.isFirstFetchNonce) {
        this.isFirstFetchNonce = false;
        return;
      }
      this.grid()?.fetchNow();
    });
  }

  onRowAdd(row: any): void {
    (this.singleSpaProps() as GridAppProps | undefined)?.onRowAdd?.(row);
  }

  onRowEdit(row: any): void {
    (this.singleSpaProps() as GridAppProps | undefined)?.onRowEdit?.(row);
  }

  onRowDelete(row: any): void {
    (this.singleSpaProps() as GridAppProps | undefined)?.onRowDelete?.(row);
  }

  onBatchSave(payload: any): void {
    (this.singleSpaProps() as GridAppProps | undefined)?.onBatchSave?.(payload);
  }
}
