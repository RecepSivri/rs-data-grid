import { useEffect, useRef } from 'react';
import './App.scss';
import { RsDataGrid, RsDataGridHandle } from './components/rsDataGrid/rsDataGrid';

// Used only when this app is run standalone (`npm run dev`), outside the
// single-spa root-config that would normally supply gridConfig via props.
const defaultGridConfig: Record<string, any> = {
  fetchUrl: 'http://universities.hipolabs.com/search?country=United+States',
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
  pagination: true,
  pagingSizes: [10, 20, 50, 70, 100],
  showFilter: true,
  showSort: true,
  showSearch: true,
  showActions: true,
  showAdd: true,
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
    <div style={{ width: '100%', minHeight: '100vh', margin: 0 }}>
      <RsDataGrid
        ref={gridRef}
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
        pagination={gridConfig.pagination}
        pagingSizes={gridConfig.pagingSizes}
        currentPagingSize={gridConfig.currentPagingSize}
        pageListSize={gridConfig.pageListSize}
      />
    </div>
  );
}

export default App;
