import XLSX from "xlsx-js-style";
import {
  EXCEL_BODY_TEXT,
  EXCEL_BORDER,
  EXCEL_HEADER_FILL,
} from "@/lib/exportExcel";

// Styled stock-take Excel (uses xlsx-js-style — a drop-in fork of xlsx with cell
// styling). Fixed 4 columns: ID (hidden, used to match rows on re-upload),
// Mahsulot, Hisob, Sanalgan (the worker fills this one). This is the reference
// "custom styled" look; it shares the dashboard palette (exportExcel.ts) and
// adds the larger fill-by-hand fonts + the editable-column tint on top.

const HEADER_GREEN = EXCEL_HEADER_FILL; // Excel/spreadsheet green
const COUNTED_FILL = "FFF7DB"; // pale amber — signals "fill this column"
const BORDER = EXCEL_BORDER;
const TEXT = EXCEL_BODY_TEXT;

const thin = { style: "thin", color: { rgb: BORDER } };
const border = { top: thin, bottom: thin, left: thin, right: thin };

// A worksheet cell we can attach a `.s` style to (xlsx-js-style extends the
// base CellObject with a style bag that the base xlsx types don't declare).
type StyledCell = { v?: unknown; t?: string; s?: unknown };

/**
 * @param filename base name (`.xlsx` appended if missing)
 * @param rows     [ID, Mahsulot(name), Hisob(book qty), Sanalgan(counted)] per row
 */
export function exportStockTakeExcel(
  filename: string,
  rows: (string | number)[][],
): void {
  const headers = ["ID", "Mahsulot", "Hisob", "Sanalgan"];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Widths: ID hidden (kept for matching), long name column wide, qty columns
  // comfortable so values are never clipped.
  ws["!cols"] = [
    { wch: 40, hidden: true },
    { wch: 64 },
    { wch: 18 },
    { wch: 20 },
  ];
  // Taller header row for the larger header font.
  ws["!rows"] = [{ hpt: 40 }];

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr] as StyledCell | undefined;
      if (!cell) continue;
      const isHeader = R === 0;
      const isNumCol = C >= 2; // Hisob, Sanalgan
      const isCounted = C === 3; // Sanalgan — the editable column
      cell.s = {
        font: {
          name: "Calibri",
          sz: isHeader ? 20 : 19,
          bold: isHeader,
          color: { rgb: isHeader ? "FFFFFF" : TEXT },
        },
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: isHeader
              ? HEADER_GREEN
              : isCounted
                ? COUNTED_FILL
                : "FFFFFF",
          },
        },
        alignment: {
          horizontal: isHeader ? "center" : isNumCol ? "center" : "left",
          vertical: "center",
        },
        border,
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sanoq");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
