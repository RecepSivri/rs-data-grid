import { useEffect, useRef } from 'react';
import './App.scss';
import { RsDataGrid, RsDataGridHandle } from './components/rsDataGrid/rsDataGrid';

// Used only when this app is run standalone (`npm run dev`), outside the
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

const noop = () => {};

interface AppProps {
  gridConfig?: Record<string, any>;
  fetchNonce?: number;
  onRowAdd?: (row: any) => void;
  onRowEdit?: (row: any) => void;
  onRowDelete?: (row: any) => void;
  onBatchSave?: (payload: { added: any[]; updated: { original: any; updated: any }[] }) => void;
}

function App(props: AppProps) {
  const gridRef = useRef<RsDataGridHandle>(null);
  const gridConfig = props.gridConfig ?? defaultGridConfig;

  const isFirstFetchNonce = useRef(true);
  useEffect(() => {
    if (props.fetchNonce === undefined) {
      return;
    }
    if (isFirstFetchNonce.current) {
      isFirstFetchNonce.current = false;
      return;
    }
    gridRef.current?.fetchNow();
  }, [props.fetchNonce]);

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, background: gridConfig.theme === 'light' ? '#ffffff' : '#1c1e21' }}>
      <RsDataGrid
        ref={gridRef}
        theme={gridConfig.theme}
        fetchUrl={gridConfig.fetchUrl}
        fetchMethod={gridConfig.apiMethod}
        fetchHeaders={gridConfig.apiHeaders}
        authToken={gridConfig.authToken}
        entrySection={gridConfig.entrySection}
        remoteMode={gridConfig.remoteMode}
        dataSource={gridConfig.dataSource}
        headerRowLines={gridConfig.headerRowLines}
        headerColumnLines={gridConfig.headerColumnLines}
        showFilter={gridConfig.showFilter}
        showSort={gridConfig.showSort}
        showSearch={gridConfig.showSearch}
        showActions={gridConfig.showActions}
        showAdd={gridConfig.showAdd}
        showGridSettings={gridConfig.showGridSettings}
        showIndex={gridConfig.showIndex}
        gridMode={gridConfig.gridMode}
        exportExcel={gridConfig.exportExcel}
        exportPDF={gridConfig.exportPDF}
        onRowAdd={props.onRowAdd ?? noop}
        onRowEdit={props.onRowEdit ?? noop}
        onRowDelete={props.onRowDelete ?? noop}
        onBatchSave={props.onBatchSave ?? noop}
        bodyRowLines={gridConfig.bodyRowLines}
        bodyColumnLines={gridConfig.bodyColumnLines}
        tableBorder={gridConfig.tableBorder}
        borderRadiusTop={gridConfig.borderRadiusTop}
        borderRadiusBottom={gridConfig.borderRadiusBottom}
        diagonalRow={gridConfig.diagonalRow}
        dragDropColumns={gridConfig.dragDropColumns}
        dragDropRows={gridConfig.dragDropRows}
        pagination={gridConfig.pagination}
        pagingSizes={gridConfig.pagingSizes}
        currentPagingSize={gridConfig.currentPagingSize}
        pageListSize={gridConfig.pageListSize}
      />
    </div>
  );
}

export default App;
