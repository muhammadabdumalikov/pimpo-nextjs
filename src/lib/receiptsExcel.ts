import XLSX from "xlsx-js-style";
import { getReceipt } from "@/lib/api";
import {
  EXCEL_BODY_TEXT,
  EXCEL_BORDER_BOX,
  EXCEL_HEADER_FILL,
  EXCEL_HEADER_TEXT,
} from "@/lib/exportExcel";

type TFn = (key: string) => string;

// Cells we can attach a `.s` style bag to (xlsx-js-style extension).
type StyledCell = { v?: unknown; t?: string; s?: unknown };

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Excel sheet names: ≤31 chars, and none of : \ / ? * [ ]
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "Sheet";
}

const setStyle = (ws: XLSX.WorkSheet, r: number, c: number, s: unknown) => {
  const cell = ws[XLSX.utils.encode_cell({ r, c })] as StyledCell | undefined;
  if (cell) cell.s = s;
};

/**
 * Export the given orders to an .xlsx workbook — one sheet per order, each sheet
 * holding the order's meta (branch, supplier, status, totals) and its line items.
 * Fetches full details (with items) for every id. Styled to match the shared
 * dashboard Excel look (green table header, borders, bold labels).
 */
export async function exportReceiptsToExcel(
  ids: string[],
  t: TFn,
): Promise<void> {
  const details = await Promise.all(ids.map((id) => getReceipt(id)));

  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  details.forEach((r, i) => {
    if (!r) return;

    const currency = r.currency || "UZS";
    const total = Number(r.totalAmount);
    const paid = Number(r.paidAmount);
    const remaining = Math.max(0, total - paid);

    const statusLabel =
      r.status === "draft"
        ? t("goodsReceipt.statusDraft")
        : t("goodsReceipt.statusReceived");
    const payLabel =
      r.paymentStatus === "paid"
        ? t("goodsReceipt.statusPaid")
        : r.paymentStatus === "partial"
          ? t("goodsReceipt.statusPartial")
          : t("goodsReceipt.statusUnpaid");

    const rows: (string | number)[][] = [
      [t("goodsReceipt.detailTitle"), fmtDate(r.createdAt)],
      [t("goodsReceipt.branch"), r.branchName || "—"],
      [t("goodsReceipt.supplier"), r.supplierName || "—"],
      [t("goodsReceipt.docStatus"), statusLabel],
      [t("goodsReceipt.paymentStatus"), payLabel],
      [t("goodsReceipt.currency"), currency],
      [t("goodsReceipt.total"), total],
      [t("goodsReceipt.paid"), paid],
      [t("goodsReceipt.remaining"), remaining],
    ];
    if (r.note) rows.push([t("goodsReceipt.note"), r.note]);

    const metaEnd = rows.length - 1; // last meta row index
    rows.push([]); // spacer

    const headerIdx = rows.length;
    rows.push([
      "№",
      t("goodsReceipt.product"),
      t("goodsReceipt.quantity"),
      t("goodsReceipt.priceIn"),
      t("goodsReceipt.priceOut"),
      t("goodsReceipt.lineTotal"),
    ]);
    const firstItemIdx = rows.length;
    (r.items ?? []).forEach((it, idx) => {
      rows.push([
        idx + 1,
        it.productName,
        it.quantity,
        Number(it.priceIn),
        it.priceOut ? Number(it.priceOut) : "",
        Number(it.lineTotal),
      ]);
    });
    const lastItemIdx = rows.length - 1;
    rows.push([]);
    const totalIdx = rows.length;
    rows.push(["", "", "", "", t("goodsReceipt.total"), total]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Wide columns to match the large fonts below (see stockTakeExcel.ts).
    ws["!cols"] = [
      { wch: 8 },
      { wch: 52 },
      { wch: 18 },
      { wch: 24 },
      { wch: 24 },
      { wch: 28 },
    ];
    ws["!rows"] = ws["!rows"] ?? [];
    ws["!rows"][headerIdx] = { hpt: 40 };

    // Large fonts to match the inventory count sheet / the rest of the dashboard.
    const baseFont = { name: "Calibri", sz: 19, color: { rgb: EXCEL_BODY_TEXT } };

    // Meta block: bold labels in col 0, plain values in col 1.
    for (let R = 0; R <= metaEnd; R++) {
      setStyle(ws, R, 0, {
        font: { ...baseFont, bold: true },
        alignment: { horizontal: "left", vertical: "center" },
      });
      setStyle(ws, R, 1, {
        font: baseFont,
        alignment: { horizontal: "left", vertical: "center" },
      });
    }

    // Items header — the green band that gives the sheet its identity.
    for (let C = 0; C <= 5; C++) {
      setStyle(ws, headerIdx, C, {
        font: {
          name: "Calibri",
          sz: 20,
          bold: true,
          color: { rgb: EXCEL_HEADER_TEXT },
        },
        fill: { patternType: "solid", fgColor: { rgb: EXCEL_HEADER_FILL } },
        alignment: { horizontal: "center", vertical: "center" },
        border: EXCEL_BORDER_BOX,
      });
    }

    // Item rows — bordered, numbers centered, product name left.
    for (let R = firstItemIdx; R <= lastItemIdx; R++) {
      for (let C = 0; C <= 5; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })] as
          | StyledCell
          | undefined;
        setStyle(ws, R, C, {
          font: baseFont,
          alignment: {
            horizontal: cell?.t === "n" ? "center" : "left",
            vertical: "center",
          },
          border: EXCEL_BORDER_BOX,
        });
      }
    }

    // Total row — bold label + amount.
    setStyle(ws, totalIdx, 4, {
      font: { ...baseFont, bold: true },
      alignment: { horizontal: "right", vertical: "center" },
    });
    setStyle(ws, totalIdx, 5, {
      font: { ...baseFont, bold: true },
      alignment: { horizontal: "center", vertical: "center" },
      border: EXCEL_BORDER_BOX,
    });

    // Unique, valid sheet name — index prefix keeps same-date orders distinct.
    const base = sanitizeSheetName(`${i + 1}. ${fmtDate(r.createdAt)}`);
    let name = base;
    let k = 1;
    while (usedNames.has(name)) name = sanitizeSheetName(`${base} (${++k})`);
    usedNames.add(name);

    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  const stamp = fmtDate(new Date().toISOString()).replace(/\./g, "-");
  XLSX.writeFile(wb, `buyurtmalar-${stamp}.xlsx`);
}
