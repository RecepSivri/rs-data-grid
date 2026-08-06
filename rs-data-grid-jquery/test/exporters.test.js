import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  jsonToSheet: vi.fn(() => ({ __sheet: true })),
  bookNew: vi.fn(() => ({ __book: true })),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
  autoTable: vi.fn(),
  jsPdfSave: vi.fn(),
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: mocks.jsonToSheet,
    book_new: mocks.bookNew,
    book_append_sheet: mocks.bookAppendSheet,
  },
  writeFile: mocks.writeFile,
}));

vi.mock('jspdf', () => ({
  default: class FakeJsPDF {
    constructor(opts) {
      this.opts = opts;
      this.save = mocks.jsPdfSave;
    }
  },
}));

vi.mock('jspdf-autotable', () => ({
  default: mocks.autoTable,
}));

const { exportExcel, exportPdf } = await import('../src/rsDataGrid/exporters.js');

const columns = [
  { caption: 'first name', dataField: 'firstName' },
  { caption: 'AGE', dataField: 'age' },
];
const rows = [
  { firstName: 'ada', age: 30 },
  { firstName: 'bob', age: null },
];

describe('exporters', () => {
  beforeEach(() => {
    mocks.jsonToSheet.mockClear();
    mocks.bookNew.mockClear();
    mocks.bookAppendSheet.mockClear();
    mocks.writeFile.mockClear();
    mocks.autoTable.mockClear();
    mocks.jsPdfSave.mockClear();
  });

  describe('exportExcel', () => {
    it('maps rows to title-cased caption keys and writes an xlsx file', () => {
      exportExcel(rows, columns);

      expect(mocks.jsonToSheet).toHaveBeenCalledTimes(1);
      const mapped = mocks.jsonToSheet.mock.calls[0][0];
      expect(mapped).toEqual([
        { 'First Name': 'ada', Age: 30 },
        { 'First Name': 'bob', Age: null },
      ]);
      expect(mocks.bookNew).toHaveBeenCalledTimes(1);
      expect(mocks.bookAppendSheet).toHaveBeenCalledWith({ __book: true }, { __sheet: true }, 'Sheet1');
      expect(mocks.writeFile).toHaveBeenCalledWith({ __book: true }, 'export.xlsx');
    });

    it('handles an empty row set', () => {
      exportExcel([], columns);
      expect(mocks.jsonToSheet).toHaveBeenCalledWith([]);
    });
  });

  describe('exportPdf', () => {
    it('builds a landscape doc, calls autoTable with mapped head/body, and saves', () => {
      exportPdf(rows, columns);

      expect(mocks.autoTable).toHaveBeenCalledTimes(1);
      const [docArg, optsArg] = mocks.autoTable.mock.calls[0];
      expect(docArg.opts).toEqual({ orientation: 'landscape' });
      expect(optsArg.head).toEqual([['First Name', 'Age']]);
      expect(optsArg.body).toEqual([
        ['ada', '30'],
        ['bob', ''],
      ]);
      expect(optsArg.theme).toBe('grid');
      expect(mocks.jsPdfSave).toHaveBeenCalledWith('export.pdf');
    });

    it('stringifies null/undefined cell values as empty strings', () => {
      exportPdf([{ firstName: undefined, age: undefined }], columns);
      const [, optsArg] = mocks.autoTable.mock.calls[0];
      expect(optsArg.body).toEqual([['', '']]);
    });
  });
});
