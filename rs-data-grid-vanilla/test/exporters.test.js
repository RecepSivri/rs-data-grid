import { describe, it, expect, vi, beforeEach } from 'vitest';

const jsonToSheet = vi.fn(() => ({ __sheet: true }));
const bookNew = vi.fn(() => ({ __book: true }));
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

const autoTableMock = vi.fn();
vi.mock('jspdf-autotable', () => ({
  default: (...args) => autoTableMock(...args),
}));

const saveMock = vi.fn();
const jsPDFCtorSpy = vi.fn();
vi.mock('jspdf', () => ({
  default: class {
    constructor(opts) {
      jsPDFCtorSpy(opts);
      this.save = saveMock;
    }
  },
}));

const { exportExcel, exportPdf } = await import('../src/rsDataGrid/exporters.js');

const columns = [
  { caption: 'first name', dataField: 'firstName' },
  { caption: 'AGE', dataField: 'age' },
];
const rows = [
  { firstName: 'Alice', age: 30 },
  { firstName: 'Bob', age: null },
];

describe('exportExcel', () => {
  beforeEach(() => {
    jsonToSheet.mockClear();
    bookNew.mockClear();
    bookAppendSheet.mockClear();
    writeFile.mockClear();
  });

  it('title-cases captions and maps rows by dataField before building the sheet', () => {
    exportExcel(rows, columns);
    expect(jsonToSheet).toHaveBeenCalledWith([
      { 'First Name': 'Alice', Age: 30 },
      { 'First Name': 'Bob', Age: null },
    ]);
  });

  it('builds a workbook, appends the sheet as Sheet1, and writes export.xlsx', () => {
    exportExcel(rows, columns);
    expect(bookNew).toHaveBeenCalledTimes(1);
    expect(bookAppendSheet).toHaveBeenCalledWith({ __book: true }, { __sheet: true }, 'Sheet1');
    expect(writeFile).toHaveBeenCalledWith({ __book: true }, 'export.xlsx');
  });
});

describe('exportPdf', () => {
  beforeEach(() => {
    autoTableMock.mockClear();
    saveMock.mockClear();
    jsPDFCtorSpy.mockClear();
  });

  it('creates a landscape jsPDF doc', () => {
    exportPdf(rows, columns);
    expect(jsPDFCtorSpy).toHaveBeenCalledWith({ orientation: 'landscape' });
  });

  it('calls autoTable with title-cased head and stringified body cells (nullish -> empty string)', () => {
    exportPdf(rows, columns);
    expect(autoTableMock).toHaveBeenCalledTimes(1);
    const [, options] = autoTableMock.mock.calls[0];
    expect(options.head).toEqual([['First Name', 'Age']]);
    expect(options.body).toEqual([
      ['Alice', '30'],
      ['Bob', ''],
    ]);
    expect(options.theme).toBe('grid');
  });

  it('saves the doc as export.pdf', () => {
    exportPdf(rows, columns);
    expect(saveMock).toHaveBeenCalledWith('export.pdf');
  });
});
