"use client";
import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import Button from "../ui/button/Button";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { bulkCreateProducts, type BulkImportItem, type BulkImportResult } from "@/lib/api";

// Our importable (scalar) product fields and the label to show for each. Field
// labels are reused from the add-product form so they stay translated.
const FIELDS: { key: keyof BulkImportItem; labelKey: string; required: boolean }[] = [
  { key: "name", labelKey: "addProduct.productName", required: true },
  { key: "priceIn", labelKey: "addProduct.priceIn", required: true },
  { key: "priceOut", labelKey: "addProduct.priceOut", required: true },
  { key: "code", labelKey: "addProduct.code", required: false },
  { key: "barcode", labelKey: "addProduct.barcode", required: false },
  { key: "quantity", labelKey: "addProduct.quantity", required: false },
  { key: "quantityType", labelKey: "addProduct.quantityType", required: false },
  { key: "priceBundle", labelKey: "addProduct.priceBundle", required: false },
  { key: "lowStockThreshold", labelKey: "addProduct.lowStockThreshold", required: false },
];

// Header keywords (any language) used to auto-guess which file column maps to a field.
const KEYWORDS: Record<string, string[]> = {
  name: ["name", "nomi", "nom ", "mahsulot", "tovar", "product", "наименование", "название", "товар"],
  code: ["code", "kod", "artikul", "sku", "артикул", "код"],
  barcode: ["barcode", "shtrix", "штрих", "ean", "bar code"],
  priceIn: ["pricein", "price in", "kelish", "xarid", "tannarx", "kirim", "cost", "приход", "закуп", "себест"],
  priceOut: ["priceout", "price out", "sotuv", "sotish", "narx", "price", "продаж", "цена"],
  quantity: ["quantity", "qty", "miqdor", "soni", "qoldiq", "stock", "количество", "остаток", "кол-во"],
  quantityType: ["unit", "birlik", "olchov", "o'lchov", "единиц", "ед."],
  priceBundle: ["bundle", "to'plam", "toplam", "тўплам", "комплект", "набор"],
  lowStockThreshold: ["lowstock", "low stock", "kam qoldiq", "minimal", "reorder", "мин", "порог"],
};

type Mapping = Record<string, number>; // field key -> column index (-1 = skip)

// Keep only digits and a dot (strips spaces / thousands separators, e.g. "65 000").
const cleanNum = (v: unknown) => String(v ?? "").replace(/[^\d.]/g, "");

// Small green pill toggle used in the field-picker menu.
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </span>
  );
}

// Status dot for a "Will become" column: mapped (green check), ignored (grey), or
// unmapped (amber ring).
function StatusDot({ mapped, ignored }: { mapped: boolean; ignored: boolean }) {
  if (ignored) return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-200 dark:border-gray-700" />;
  if (mapped)
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-warning-400" />;
}

export default function ImportProductsWizard() {
  const { t } = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [ignored, setIgnored] = useState<Set<number>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  // Field-picker menu, fixed-positioned so it escapes the table's overflow. It
  // flips above the trigger and caps its height when there isn't room below.
  const [menu, setMenu] = useState<{
    col: number;
    x: number;
    top?: number;
    bottom?: number;
    maxH: number;
  } | null>(null);

  const guessMapping = (hdrs: string[]): Mapping => {
    const normalized = hdrs.map((h) => h.toLowerCase().trim());
    const used = new Set<number>();
    const map: Mapping = {};
    for (const f of FIELDS) {
      const kws = KEYWORDS[f.key] || [];
      let found = -1;
      for (let i = 0; i < normalized.length; i++) {
        if (used.has(i)) continue;
        if (kws.some((kw) => normalized[i].includes(kw))) {
          found = i;
          break;
        }
      }
      if (found >= 0) used.add(found);
      map[f.key] = found;
    }
    return map;
  };

  const parseFile = async (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    // Yield a tick so React paints the loading state before the big, synchronous
    // XLSX parse blocks the main thread (large files take a while).
    await new Promise((r) => setTimeout(r, 20));
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
      });
      if (!rows.length) {
        showToast("error", t("import.parseError"), "Error");
        return;
      }
      const hdrs = (rows[0] as unknown[]).map((h) => String(h ?? ""));
      setHeaders(hdrs);
      setDataRows(rows.slice(1) as unknown[][]);
      setMapping(guessMapping(hdrs));
      setIgnored(new Set());
      setResult(null);
      setStep(2);
    } catch {
      showToast("error", t("import.parseError"), "Error");
    } finally {
      setIsParsing(false);
    }
  };

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) parseFile(accepted[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
  });

  const downloadTemplate = () => {
    const headerRow = FIELDS.map((f) => t(f.labelKey));
    const sample = ["Namuna mahsulot", "10000", "15000", "PRD-0001", "2000000000017", "5", "dona", "50", "2"];
    const ws = XLSX.utils.aoa_to_sheet([headerRow, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mahsulotlar");
    XLSX.writeFile(wb, "mahsulotlar-shablon.xlsx");
  };

  const cellValue = (field: keyof BulkImportItem, row: unknown[]) => {
    const idx = mapping[field];
    if (idx == null || idx < 0) return "";
    return row[idx] ?? "";
  };

  const buildItems = (): BulkImportItem[] => {
    const items: BulkImportItem[] = [];
    for (const row of dataRows) {
      const name = String(cellValue("name", row)).trim();
      const priceIn = cleanNum(cellValue("priceIn", row));
      const priceOut = cleanNum(cellValue("priceOut", row));
      const code = String(cellValue("code", row)).trim();
      const barcode = String(cellValue("barcode", row)).trim();
      // Decimals allowed: weighed goods (kg) import fractional stock.
      const quantity = cleanNum(cellValue("quantity", row));
      const quantityType = String(cellValue("quantityType", row)).trim();
      const priceBundle = cleanNum(cellValue("priceBundle", row));
      const lowStock = cleanNum(cellValue("lowStockThreshold", row));

      // Skip fully-blank rows.
      if (!name && !priceIn && !priceOut && !code && !barcode) continue;

      items.push({
        name: name || undefined,
        code: code || undefined,
        barcode: barcode || undefined,
        priceIn: priceIn || undefined,
        priceOut: priceOut || undefined,
        quantity: quantity ? Number(quantity) : undefined,
        quantityType: quantityType || undefined,
        priceBundle: priceBundle || undefined,
        lowStockThreshold: lowStock ? Number(lowStock) : undefined,
      });
    }
    return items;
  };

  // Which field (if any) each column maps to — the inverse of `mapping`.
  const fieldForColumn = (i: number) => {
    const f = FIELDS.find((ff) => mapping[ff.key] === i);
    return f ? { key: f.key, label: t(f.labelKey) } : null;
  };
  // Assign a field to a column (one field ↔ one column).
  const setColumnField = (colIndex: number, fieldKey: string) => {
    setMapping((prev) => {
      const next: Mapping = { ...prev };
      for (const f of FIELDS) if (next[f.key] === colIndex) next[f.key] = -1;
      if (fieldKey) next[fieldKey] = colIndex;
      return next;
    });
  };
  // Ignore/keep a source column (the × on the header). Ignoring clears its map.
  const toggleIgnore = (i: number) => {
    const willIgnore = !ignored.has(i);
    setIgnored((prev) => {
      const n = new Set(prev);
      if (willIgnore) n.add(i);
      else n.delete(i);
      return n;
    });
    if (willIgnore) setColumnField(i, "");
  };

  const SAMPLE_ROWS = 3;
  // Hard cap per import — files with more rows than this are blocked (the backend
  // enforces the same limit).
  const MAX_IMPORT = 500;
  const unmappedRequired = FIELDS.filter((f) => f.required && (mapping[f.key] ?? -1) < 0);
  const itemsToImport = step === 2 ? buildItems() : [];
  const tooMany = itemsToImport.length > MAX_IMPORT;
  const mappedCount = FIELDS.filter((f) => (mapping[f.key] ?? -1) >= 0).length;

  const handleImport = async () => {
    const items = buildItems();
    if (!items.length) {
      showToast("error", t("import.noValidRows"), "Error");
      return;
    }
    if (items.length > MAX_IMPORT) {
      showToast(
        "error",
        t("import.tooMany").replace("{max}", String(MAX_IMPORT)).replace("{n}", String(items.length)),
        "Error",
      );
      return;
    }
    try {
      setIsImporting(true);
      const res = await bulkCreateProducts(items);
      setResult(res);
      setStep(3);
    } catch (error: any) {
      showToast("error", error?.message || t("import.parseError"), "Error");
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFileName("");
    setHeaders([]);
    setDataRows([]);
    setMapping({});
    setIgnored(new Set());
    setResult(null);
    setMenu(null);
  };

  const openMenu = (i: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    // Open upward when there isn't enough room below and there's more above.
    const openUp = spaceBelow < 320 && spaceAbove > spaceBelow;
    const x = Math.max(8, Math.min(r.left, window.innerWidth - 256 - 8));
    setMenu((prev) =>
      prev?.col === i
        ? null
        : {
            col: i,
            x,
            top: openUp ? undefined : r.bottom + 6,
            bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
            maxH: Math.max(180, (openUp ? spaceAbove : spaceBelow) - 16),
          },
    );
  };

  const stepList = [
    {
      title: t("import.step1"),
      desc: fileName
        ? t("import.fileInfo").replace("{lines}", String(dataRows.length)).replace("{cols}", String(headers.length))
        : t("import.step1Desc"),
    },
    { title: t("import.step2"), desc: t("import.step2Desc") },
    { title: t("import.step3"), desc: t("import.step3Desc") },
  ];

  // A source column's fixed width, shared by the header, sample rows and the
  // "Will become" mapping row so all three line up and scroll together.
  const COL = "w-56 shrink-0";
  // Row-number / column-letter gutter width (matched by a spacer under "Will become").
  const GUTTER = "w-11 shrink-0";
  // Excel column label: 0 → A, 25 → Z, 26 → AA …
  const excelCol = (n: number) => {
    let s = "";
    let x = n + 1;
    while (x > 0) {
      const m = (x - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  };

  return (
    <div className="space-y-6">
      {/* Horizontal stepper */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <ol className="flex items-center">
          {stepList.map((s, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            const last = i === stepList.length - 1;
            return (
              <li key={i} className={`flex items-center ${last ? "" : "flex-1"}`}>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      active
                        ? "bg-brand-500 text-white"
                        : done
                        ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                        : "border border-gray-300 text-gray-400 dark:border-gray-600"
                    }`}
                  >
                    {done ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      n
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${active || done ? "text-gray-800 dark:text-white" : "text-gray-400"}`}>
                      {s.title}
                    </p>
                    <p className="hidden truncate text-xs text-gray-400 md:block">{s.desc}</p>
                  </div>
                </div>
                {!last && (
                  <span className={`mx-3 h-0.5 flex-1 rounded ${done ? "bg-brand-400" : "bg-gray-200 dark:bg-gray-700"}`} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Content */}
      <div className="min-w-0 space-y-6">
        {/* ── Step 1: upload ── */}
        {step === 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            {isParsing ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-6 py-16 text-center dark:border-gray-800 dark:bg-white/[0.02]">
                <span className="h-9 w-9 animate-spin rounded-full border-3 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("import.parsing")}</p>
                {fileName && <p className="text-xs text-gray-500 dark:text-gray-400">{fileName}</p>}
              </div>
            ) : (
              <>
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center transition ${
                isDragActive
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-gray-300 bg-gray-50 hover:border-brand-400 dark:border-gray-700 dark:bg-white/[0.02]"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0-4 4m4-4 4 4" />
                  <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t("import.dropzone")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("import.dropHint")}</p>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v12m0 0 4-4m-4 4-4-4" />
                  <path d="M4 20h16" />
                </svg>
                {t("import.downloadTemplate")}
              </button>
            </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Your table → Will become ── */}
        {step === 2 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white">{t("import.step2")}</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t("import.mapHint")}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {t("import.mappedCount").replace("{n}", String(mappedCount)).replace("{total}", String(FIELDS.length))}
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {/* Your table — full Excel look: A/B/C letters, row numbers,
                      green table header, gridlines and banded rows. */}
                  <p className="px-4 pb-2 pt-4 text-sm font-semibold text-gray-800 dark:text-white">
                    {t("import.yourTable")}
                  </p>
                  {/* Column-letter row (A, B, C …) */}
                  <div className="flex">
                    <div className={`${GUTTER} border-b border-r border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800`} />
                    {headers.map((_, i) => (
                      <div
                        key={i}
                        className={`${COL} border-b border-r border-gray-300 bg-gray-100 py-1 text-center text-[11px] font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400`}
                      >
                        {excelCol(i)}
                      </div>
                    ))}
                  </div>
                  {/* Green table header = spreadsheet row 1 (the file's headers) */}
                  <div className="flex">
                    <div className={`${GUTTER} flex items-center justify-center border-b border-r border-gray-300 bg-gray-100 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800`}>
                      1
                    </div>
                    {headers.map((h, i) => (
                      <div
                        key={i}
                        className={`${COL} border-b border-r border-gray-300 bg-[#217346] px-3 py-2.5 ${
                          ignored.has(i) ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white" title={h}>
                            {h || "—"}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleIgnore(i)}
                            title={t("import.ignoreColumn")}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/70 transition hover:bg-white/20 hover:text-white"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Data rows — banded (white / light green), gridlined */}
                  {dataRows.slice(0, SAMPLE_ROWS).map((row, ri) => (
                    <div key={ri} className="flex">
                      <div className={`${GUTTER} flex items-center justify-center border-b border-r border-gray-300 bg-gray-100 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800`}>
                        {ri + 2}
                      </div>
                      {headers.map((_, ci) => (
                        <div
                          key={ci}
                          className={`${COL} border-b border-r border-gray-300 px-3 py-2 dark:border-gray-700 ${
                            ri % 2 === 1 ? "bg-[#eaf5ef] dark:bg-success-500/5" : "bg-white dark:bg-transparent"
                          } ${ignored.has(ci) ? "opacity-50" : ""}`}
                        >
                          <span className="block truncate text-sm text-gray-700 dark:text-gray-300">
                            {String(row[ci] ?? "")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Will become */}
                  <p className="px-4 pb-2 pt-5 text-sm font-semibold text-gray-800 dark:text-white">
                    {t("import.willBecome")}
                  </p>
                  <div className="flex pb-4">
                    <div className={GUTTER} />
                    {headers.map((_, i) => {
                      const mapped = fieldForColumn(i);
                      const isIgnored = ignored.has(i);
                      return (
                        <div key={i} className={COL + " px-4"}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isIgnored}
                              onClick={(e) => openMenu(i, e)}
                              className={`flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-3 text-sm shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                mapped
                                  ? "border-brand-300 bg-white text-gray-700 dark:border-brand-500/40 dark:bg-gray-900 dark:text-gray-200"
                                  : "border-gray-300 bg-gray-50 text-gray-400 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-800"
                              }`}
                            >
                              <span className="truncate">{mapped ? mapped.label : t("import.selectColumn")}</span>
                              <svg
                                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${menu?.col === i ? "rotate-180" : ""}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </button>
                            <StatusDot mapped={!!mapped} ignored={isIgnored} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {unmappedRequired.length > 0 && (
              <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                {t("import.unmappedRequired").replace(
                  "{fields}",
                  unmappedRequired.map((f) => t(f.labelKey)).join(", "),
                )}
              </p>
            )}

            {tooMany && (
              <p className="rounded-lg bg-error-50 px-3 py-2 text-xs text-error-700 dark:bg-error-500/10 dark:text-error-400">
                {t("import.tooMany")
                  .replace("{max}", String(MAX_IMPORT))
                  .replace("{n}", String(itemsToImport.length))}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" size="md" onClick={reset} disabled={isImporting}>
                {t("import.back")}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleImport}
                disabled={isImporting || unmappedRequired.length > 0 || itemsToImport.length === 0 || tooMany}
              >
                {isImporting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("import.importing")}
                  </span>
                ) : (
                  t("import.importBtn").replace("{n}", String(itemsToImport.length))
                )}
              </Button>
            </div>
          </>
        )}

        {/* ── Step 3: result ── */}
        {step === 3 &&
          result &&
          (() => {
            const created = result.created;
            const skipped = result.skipped.length;
            const errors = result.errors.length;
            const total = created + skipped + errors;
            const pct = (n: number) => (total ? (n / total) * 100 : 0);
            const allGood = created > 0;
            const issues = [
              ...result.errors.map((r) => ({ ...r, type: "error" as const })),
              ...result.skipped.map((r) => ({ ...r, type: "skip" as const })),
            ];
            const legend = [
              { key: "created", n: created, dot: "bg-success-500", label: t("import.resultCreated") },
              { key: "skipped", n: skipped, dot: "bg-warning-400", label: t("import.resultSkipped") },
              { key: "errors", n: errors, dot: "bg-error-500", label: t("import.resultErrors") },
            ];
            return (
              <>
                {/* Hero summary */}
                <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                        allGood
                          ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                          : "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
                      }`}
                    >
                      {allGood ? (
                        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {allGood ? t("import.doneTitle") : t("import.doneNone")}
                      </h3>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {t("import.doneSummary")
                          .replace("{created}", String(created))
                          .replace("{total}", String(total))}
                      </p>
                    </div>
                  </div>

                  {/* Stacked bar */}
                  <div className="px-6">
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      {created > 0 && <div className="min-w-[3px] bg-success-500" style={{ width: `${pct(created)}%` }} />}
                      {skipped > 0 && <div className="min-w-[3px] bg-warning-400" style={{ width: `${pct(skipped)}%` }} />}
                      {errors > 0 && <div className="min-w-[3px] bg-error-500" style={{ width: `${pct(errors)}%` }} />}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 px-6 pb-5 pt-3">
                    {legend.map((l) => (
                      <span key={l.key} className="inline-flex items-center gap-2 text-sm">
                        <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
                        <span className="font-semibold text-gray-800 dark:text-white">{l.n}</span>
                        <span className="text-gray-500 dark:text-gray-400">{l.label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {result.limitReached && (
                  <p className="rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                    {t("import.limitReached")}
                  </p>
                )}

                {issues.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 dark:border-gray-800">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-white">{t("import.issuesTitle")}</h4>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {issues.length}
                      </span>
                    </div>
                    <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800/60">
                      {issues.map((it, i) => (
                        <li key={i} className="flex items-center gap-3 px-5 py-3">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                              it.type === "error"
                                ? "bg-error-50 text-error-500 dark:bg-error-500/15 dark:text-error-400"
                                : "bg-warning-50 text-warning-500 dark:bg-warning-500/15 dark:text-warning-400"
                            }`}
                          >
                            {it.type === "error" ? (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 12h8" />
                              </svg>
                            )}
                          </span>
                          <span className="w-20 shrink-0 text-xs font-medium text-gray-400">
                            {t("import.row")} {it.row}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-300" title={it.reason}>
                            {it.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" size="md" onClick={reset}>
                    {t("import.importMore")}
                  </Button>
                  <Button variant="primary" size="md" onClick={() => router.push("/products")}>
                    {t("import.goProducts")}
                  </Button>
                </div>
              </>
            );
          })()}
      </div>

      {/* Field picker — fixed so it isn't clipped by the table's overflow. */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 flex w-64 flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-900"
            style={{ left: menu.x, top: menu.top, bottom: menu.bottom, maxHeight: menu.maxH }}
          >
            <p className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {t("import.selectColumn")}
            </p>
            {FIELDS.map((f) => {
              const onThis = mapping[f.key] === menu.col;
              const elsewhere = (mapping[f.key] ?? -1) >= 0 && mapping[f.key] !== menu.col;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setColumnField(menu.col, onThis ? "" : (f.key as string))}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {t(f.labelKey)}
                    {f.required && <span className="text-error-500"> *</span>}
                    {elsewhere && <span className="ml-1 text-[10px] text-gray-400">({t("import.usedElsewhere")})</span>}
                  </span>
                  <Toggle on={onThis} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
