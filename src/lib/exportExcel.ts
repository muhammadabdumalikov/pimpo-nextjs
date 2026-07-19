import * as XLSX from 'xlsx';

/**
 * Shared Excel (.xlsx) export used by every report. Takes an array-of-arrays
 * (first row = headers) and streams a real workbook to the browser — replaces
 * the old per-report CSV blobs.
 */
export function exportAoaToExcel(
  filename: string,
  aoa: (string | number)[][],
  sheetName = 'Report',
): void {
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  // Sheet names are capped at 31 chars by the format.
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/** Round a number for a spreadsheet cell (keeps them numeric, not strings). */
export const xlsxNum = (n: number) => Math.round(n);
