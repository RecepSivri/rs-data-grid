import { describe, expect, it, vi } from 'vitest';

const jsonToSheet = vi.fn(() => 'sheet');
const bookNew = vi.fn(() => 'workbook');
const bookAppendSheet = vi.fn();
const writeFile = vi.fn();

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: (...args) => jsonToSheet(...args),
    book_new: (...args) => bookNew(...args),
    book_append_sheet: (...args) => bookAppendSheet(...args),
  },
  writeFile: (...args) => writeFile(...args),
}));

const autoTable = vi.fn();
vi.mock('jspdf-autotable', () => ({ default: (...args) => autoTable(...args) }));

const jsPdfSave = vi.fn();
function jsPdfCtor() {
  this.save = jsPdfSave;
}
vi.mock('jspdf', () => ({ default: jsPdfCtor }));

const { exportExcel, exportPdf } = await import('./exporters.js');

const columns = [
  { caption: 'title', dataField: 'title' },
  { caption: 'release_date', dataField: 'release' },
];
const rows = [
  { title: 'Movie A', release: '2020' },
  { title: 'Movie B', release: undefined },
];

describe('exportExcel', () => {
  it('title-cases captions and maps each row to caption -> field value', () => {
    exportExcel(rows, columns);
    expect(jsonToSheet).toHaveBeenCalledWith([
      { Title: 'Movie A', Release_date: '2020' },
      { Title: 'Movie B', Release_date: undefined },
    ]);
    expect(bookAppendSheet).toHaveBeenCalledWith('workbook', 'sheet', 'Sheet1');
    expect(writeFile).toHaveBeenCalledWith('workbook', 'export.xlsx');
  });
});

describe('exportPdf', () => {
  it('title-cases the header row and stringifies (nullish-safe) body cells', () => {
    exportPdf(rows, columns);
    expect(autoTable).toHaveBeenCalledWith(
      expect.any(jsPdfCtor),
      expect.objectContaining({
        head: [['Title', 'Release_date']],
        body: [
          ['Movie A', '2020'],
          ['Movie B', ''],
        ],
        theme: 'grid',
      })
    );
    expect(jsPdfSave).toHaveBeenCalledWith('export.pdf');
  });
});
