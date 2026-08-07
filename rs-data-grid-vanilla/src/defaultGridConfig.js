// Used only when this app is run standalone (`npm run dev`), outside the
// single-spa root-config that would normally supply gridConfig via props.
// Byte-identical values to the other three apps' defaultGridConfig.
// The demo API only speaks plain HTTP; an HTTPS deploy can't call it
// directly (browsers block that as mixed content), so it goes through a
// same-origin proxy there instead (see netlify.toml).
const DEFAULT_FETCH_URL =
  location.protocol === 'https:'
    ? '/api/universities/search?country=United+States'
    : 'http://universities.hipolabs.com/search?country=United+States';

export const defaultGridConfig = {
  fetchUrl: DEFAULT_FETCH_URL,
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
