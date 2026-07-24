import XLSX from "xlsx-js-style";

// Shared Excel (.xlsx) styling + export for the whole dashboard. Every export
// (reports, receipts, inventory, product-import template, stock-take) wears the
// same "custom styled" identity first introduced by the inventory count sheet:
// a green header band with white bold text, thin gray borders, Calibri, labels
// left / numbers centered, and comfortable auto-fit column widths.
//
// The palette lives here so there is one source of truth; the specialized
// stock-take sheet (stockTakeExcel.ts) imports these constants and only adds its
// own editable-column tint on top.

export const EXCEL_HEADER_FILL = "217346"; // Excel/spreadsheet green
export const EXCEL_HEADER_TEXT = "FFFFFF";
export const EXCEL_BODY_TEXT = "1D2939";
export const EXCEL_BORDER = "D0D5DD";

const thin = { style: "thin", color: { rgb: EXCEL_BORDER } };
/** Full box border used on every cell. */
export const EXCEL_BORDER_BOX = {
  top: thin,
  bottom: thin,
  left: thin,
  right: thin,
};

// A worksheet cell we can attach a `.s` style to (xlsx-js-style extends the base
// CellObject with a style bag that the base xlsx types don't declare).
type StyledCell = { v?: unknown; t?: string; s?: unknown };

export interface StyleSheetOptions {
  /** Header font size (pt). Default 20 (matches the inventory count sheet). */
  headerFontSize?: number;
  /** Body font size (pt). Default 19 (matches the inventory count sheet). */
  bodyFontSize?: number;
  /** Header row height (pt). Default 40. */
  headerRowHeight?: number;
  /**
   * Per-body-cell fill override (rgb hex, no `#`). Return undefined for the
   * default white. Lets the stock-take sheet tint its editable column.
   */
  cellFill?: (row: number, col: number) => string | undefined;
}

/**
 * Apply the shared dashboard Excel look to a worksheet in place. Treats the
 * first row as the header. When the caller hasn't already set `!cols`, widths
 * are auto-fit from the longest cell in each column.
 */
export function styleSheet(
  ws: XLSX.WorkSheet,
  opts: StyleSheetOptions = {},
): void {
  const {
    headerFontSize = 20,
    bodyFontSize = 19,
    headerRowHeight = 40,
    cellFill,
  } = opts;

  const range = XLSX.utils.decode_range(ws["!ref"] as string);

  // Auto-fit column widths from content, unless the caller set them explicitly.
  // `wch` is measured against the default 11pt font, so scale by the (larger)
  // body font ratio to keep the big-font text from clipping.
  if (!ws["!cols"]) {
    const scale = Math.max(1, bodyFontSize / 11);
    const cols: { wch: number }[] = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      let max = 8;
      for (let R = range.s.r; R <= range.e.r; R++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })] as
          | StyledCell
          | undefined;
        const len = cell?.v == null ? 0 : String(cell.v).length;
        if (len > max) max = len;
      }
      cols.push({ wch: Math.min(Math.ceil((max + 2) * scale), 90) });
    }
    ws["!cols"] = cols;
  }

  // Taller header row so the emphasized header band has room to breathe.
  const rows = ws["!rows"] ?? [];
  rows[0] = { ...(rows[0] ?? {}), hpt: headerRowHeight };
  ws["!rows"] = rows;

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr] as StyledCell | undefined;
      if (!cell) continue;
      const isHeader = R === range.s.r;
      const isNumeric = cell.t === "n";
      const fill = isHeader
        ? EXCEL_HEADER_FILL
        : (cellFill?.(R, C) ?? "FFFFFF");
      cell.s = {
        font: {
          name: "Calibri",
          sz: isHeader ? headerFontSize : bodyFontSize,
          bold: isHeader,
          color: { rgb: isHeader ? EXCEL_HEADER_TEXT : EXCEL_BODY_TEXT },
        },
        fill: { patternType: "solid", fgColor: { rgb: fill } },
        alignment: {
          horizontal: isHeader ? "center" : isNumeric ? "center" : "left",
          vertical: "center",
        },
        border: EXCEL_BORDER_BOX,
      };
    }
  }
}

// Build the styled single-sheet workbook shared by the download and the
// in-memory (Blob) exports, so both produce byte-identical content.
function aoaToWorkbook(
  aoa: (string | number)[][],
  sheetName: string,
): XLSX.WorkBook {
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  styleSheet(worksheet);
  const workbook = XLSX.utils.book_new();
  // Sheet names are capped at 31 chars by the format.
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  return workbook;
}

/**
 * Shared Excel (.xlsx) export used by every report. Takes an array-of-arrays
 * (first row = headers) and streams a real, styled workbook to the browser.
 */
export function exportAoaToExcel(
  filename: string,
  aoa: (string | number)[][],
  sheetName = "Report",
): void {
  XLSX.writeFile(
    aoaToWorkbook(aoa, sheetName),
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}

/**
 * Same workbook as exportAoaToExcel, but returned as an in-memory Blob instead
 * of a browser download — for uploads (e.g. sending a report to Telegram).
 */
export function aoaToXlsxBlob(
  aoa: (string | number)[][],
  sheetName = "Report",
): Blob {
  const out = XLSX.write(aoaToWorkbook(aoa, sheetName), {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Round a number for a spreadsheet cell (keeps them numeric, not strings). */
export const xlsxNum = (n: number) => Math.round(n);
