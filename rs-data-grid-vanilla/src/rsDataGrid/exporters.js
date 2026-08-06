// Ported 1:1 from rsDataGrid.tsx's onExportExcelClick/onExportPdfClick.
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { titleCase } from './titleCase.js';

/**
 * @param {any[]} rows currently-displayed rows only (filter/search/sort/page applied)
 * @param {Array<{caption: string, dataField: string}>} columns
 */
export function exportExcel(rows, columns) {
  const captions = columns.map(column => titleCase(column.caption));
  const mapped = rows.map(row => Object.fromEntries(columns.map((column, i) => [captions[i], row[column.dataField]])));
  const worksheet = XLSX.utils.json_to_sheet(mapped);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, 'export.xlsx');
}

/**
 * @param {any[]} rows
 * @param {Array<{caption: string, dataField: string}>} columns
 */
export function exportPdf(rows, columns) {
  const captions = columns.map(column => titleCase(column.caption));
  const doc = new jsPDF({ orientation: 'landscape' });
  autoTable(doc, {
    head: [captions],
    body: rows.map(row => columns.map(column => String(row[column.dataField] ?? ''))),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [119, 119, 119], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  doc.save('export.pdf');
}
