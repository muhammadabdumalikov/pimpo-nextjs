import * as XLSX from "xlsx";
import { getReceipt } from "@/lib/api";

type TFn = (key: string) => string;

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

/**
 * Export the given orders to an .xlsx workbook — one sheet per order, each sheet
 * holding the order's meta (branch, supplier, status, totals) and its line items.
 * Fetches full details (with items) for every id.
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

    rows.push([]); // spacer
    rows.push([
      "№",
      t("goodsReceipt.product"),
      t("goodsReceipt.quantity"),
      t("goodsReceipt.priceIn"),
      t("goodsReceipt.priceOut"),
      t("goodsReceipt.lineTotal"),
    ]);
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
    rows.push([]);
    rows.push(["", "", "", "", t("goodsReceipt.total"), total]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 34 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

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
