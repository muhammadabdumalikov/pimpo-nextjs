"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import SelectField from "../form/SelectField";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { ReportTableSkeleton } from "./ReportSkeleton";
import ReportBranchFilter from "./ReportBranchFilter";
import ReportSearch from "./ReportSearch";
import ReportPager from "./ReportPager";
import { useRouter } from "next/navigation";
import {
  getReorderReport,
  createReceipt,
  type ReorderReport as ReorderData,
  type ReorderItem,
  type ReorderSupplierGroup,
} from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { formatNumber, formatMoney } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 14;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

type ViewMode = "list" | "supplier";

export default function ReorderReport() {
  const { t } = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const [branchId, setBranchId] = useState("");
  const [days, setDays] = useState(30);
  const [view, setView] = useState<ViewMode>("supplier");
  const [data, setData] = useState<ReorderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState<string | null>(null);

  // Turn a supplier's reorder group into a DRAFT goods receipt (a purchase
  // order): no stock change until the owner presses "Receive" when goods arrive.
  const handleCreateDraft = async (g: ReorderSupplierGroup) => {
    if (!g.supplierId) {
      showToast("error", t("reportsPage.reorderNoSupplierAssign"), "");
      return;
    }
    const items = g.items
      .filter((i) => i.suggestedQty > 0)
      .map((i) => ({ productId: i.productId, quantity: i.suggestedQty, priceIn: i.priceIn }));
    if (items.length === 0) return;
    try {
      setCreating(g.supplierId);
      const receipt = await createReceipt({
        items,
        supplierId: g.supplierId,
        branchId: branchId || undefined,
        draft: true,
        note: t("reportsPage.reorderDraftNote"),
      });
      showToast("success", t("reportsPage.reorderDraftDone"), "");
      router.push(`/receipts/${receipt.id}`);
    } catch (e) {
      showToast("error", (e as Error)?.message || "Failed", "");
    } finally {
      setCreating(null);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getReorderReport(branchId || undefined, days);
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [branchId, days]);

  const matches = (i: ReorderItem, q: string) =>
    i.name.toLowerCase().includes(q) || (i.code ?? "").toLowerCase().includes(q);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = data?.items ?? [];
    if (!q) return list;
    return list.filter((i) => matches(i, q));
  }, [data, search]);
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  // Supplier view: draft purchase orders, one section per supplier. Search
  // filters items inside each group and drops groups left empty.
  const groups = useMemo(() => {
    const q = search.toLowerCase().trim();
    const src = data?.bySupplier ?? [];
    if (!q) return src;
    return src
      .map((g) => ({ ...g, items: g.items.filter((i) => matches(i, q)) }))
      .filter((g) => g.items.length > 0);
  }, [data, search]);

  const daysOfStock = (v: number | null) => (v === null ? "∞" : v < 1 ? "<1" : String(Math.round(v)));

  const handleExport = () => {
    if (!data) return;
    const supplierName = (s: string | null) => s ?? t("reportsPage.reorderNoSupplier");
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.supplier"),
        t("reportsPage.product"),
        t("reportsPage.quantity"),
        t("reportsPage.threshold"),
        t("reportsPage.soldWindow"),
        t("reportsPage.velocity"),
        t("reportsPage.daysOfStock"),
        t("reportsPage.suggestedQty"),
        t("reportsPage.estimatedCost"),
      ],
      ...(view === "supplier" ? groups.flatMap((g) => g.items) : filtered).map((i) => [
        supplierName(i.supplierName),
        i.name,
        i.quantity,
        i.threshold ?? "—",
        i.soldWindow,
        i.dailyVelocity.toFixed(2),
        i.daysOfStock === null ? "∞" : Math.round(i.daysOfStock),
        i.suggestedQty,
        Math.round(i.estimatedCost),
      ]),
    ];
    exportAoaToExcel("reorder-report", aoa, "Reorder");
  };

  const totals = data?.totals;
  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.flaggedProducts")} value={formatNumber(totals.products)} tone={totals.products > 0 ? "error" : "default"} />
      <ReportKpi label={t("reportsPage.suggestedUnits")} value={formatNumber(totals.suggestedUnits)} />
      <ReportKpi label={t("reportsPage.estimatedSpend")} value={formatMoney(totals.estimatedCost, t("reportsPage.som"))} />
    </div>
  ) : null;

  const itemCells = (i: ReorderItem) => {
    const critical = i.daysOfStock !== null && i.daysOfStock < 7;
    const warn = i.daysOfStock !== null && i.daysOfStock < 14;
    return (
      <>
        <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">
          {i.name}
          {i.code && <span className="block text-xs text-gray-400">{i.code}</span>}
        </TableCell>
        <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(i.quantity)}</TableCell>
        <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{i.threshold ?? "—"}</TableCell>
        <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{formatNumber(i.soldWindow)}</TableCell>
        <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{i.dailyVelocity.toFixed(1)}</TableCell>
        <TableCell className={`py-3 px-4 sm:px-6 text-end font-medium ${critical ? "text-error-500" : warn ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-white/90"}`}>{daysOfStock(i.daysOfStock)}</TableCell>
        <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-brand-500">{i.suggestedQty > 0 ? formatNumber(i.suggestedQty) : "—"}</TableCell>
        <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatMoney(i.estimatedCost, t("reportsPage.som"))}</TableCell>
      </>
    );
  };

  const colCount = 8;
  const stateRow = loading ? (
    <ReportTableSkeleton columns={colCount} />
  ) : error ? (
    <TableRow><TableCell colSpan={colCount} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
  ) : null;

  const headerRow = (
    <TableRow>
      <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.product")}</TableCell>
      <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.quantity")}</TableCell>
      <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.threshold")}</TableCell>
      <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.soldWindow")}</TableCell>
      <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.velocity")}</TableCell>
      <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.daysOfStock")}</TableCell>
      <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.suggestedQty")}</TableCell>
      <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.estimatedCost")}</TableCell>
    </TableRow>
  );

  return (
    <ReportShell
      title={t("sidebar.reportsReorder")}
      filterSummary={`${t("reportsPage.velocity")}: ${days} ${t("reportsPage.daysShort")}${data ? ` · ${t("reportsPage.coverDays")}: ${data.coverDays} ${t("reportsPage.daysShort")}` : ""}`}
      activeFilterCount={(branchId ? 1 : 0) + (days !== 30 ? 1 : 0)}
      search={<ReportSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />}
      filters={
        <>
          <ReportFilterField label={t("reportsPage.velocity")}>
            <SelectField
              className="min-w-[160px]"
              value={String(days)}
              onChange={(v) => { setDays(Number(v)); setPage(1); }}
              options={[
                { value: "30", label: t("reportsPage.days30") },
                { value: "60", label: t("reportsPage.days60") },
                { value: "90", label: t("reportsPage.days90") },
              ]}
            />
          </ReportFilterField>
          <ReportFilterField label={t("reportsPage.reorderViewBySupplier")}>
            <SelectField
              className="min-w-[160px]"
              value={view}
              onChange={(v) => { setView(v as ViewMode); setPage(1); }}
              options={[
                { value: "supplier", label: t("reportsPage.reorderViewBySupplier") },
                { value: "list", label: t("reportsPage.reorderViewList") },
              ]}
            />
          </ReportFilterField>
          <ReportBranchFilter value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }} />
        </>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading || filtered.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[1000px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            {headerRow}
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {stateRow ? stateRow : view === "list" ? (
              paged.length === 0 ? (
                <TableRow><TableCell colSpan={colCount} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
              ) : (
                paged.map((i) => (
                  <TableRow key={i.productId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    {itemCells(i)}
                  </TableRow>
                ))
              )
            ) : groups.length === 0 ? (
              <TableRow><TableCell colSpan={colCount} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              groups.map((g) => (
                <Fragment key={g.supplierId ?? "none"}>
                  <TableRow className="bg-gray-50 dark:bg-white/[0.03]">
                    <TableCell colSpan={5} className="py-2.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-800 dark:text-white/90">
                          {g.supplierName ?? <span className="text-gray-400 italic">{t("reportsPage.reorderNoSupplier")}</span>}
                        </span>
                        <span className="text-xs font-normal text-gray-400">· {formatNumber(g.products)} {t("reportsPage.product").toLowerCase()}</span>
                        {g.supplierId && g.suggestedUnits > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCreateDraft(g)}
                            disabled={creating === g.supplierId}
                            className="ml-auto inline-flex items-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
                          >
                            {creating === g.supplierId ? t("reportsPage.reorderCreating") : t("reportsPage.reorderCreateDraft")}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4 sm:px-6 text-end text-xs text-gray-500 dark:text-gray-400">{t("reportsPage.suggestedUnits")}</TableCell>
                    <TableCell className="py-2.5 px-4 sm:px-6 text-end font-semibold text-brand-500">{formatNumber(g.suggestedUnits)}</TableCell>
                    <TableCell className="py-2.5 px-4 sm:px-6 text-end font-semibold text-gray-800 dark:text-white/90">{formatMoney(g.estimatedCost, t("reportsPage.som"))}</TableCell>
                  </TableRow>
                  {g.items.map((i) => (
                    <TableRow key={i.productId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      {itemCells(i)}
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && !error && view === "list" && filtered.length > PAGE && (
        <ReportPager page={page} totalItems={filtered.length} pageSize={PAGE} onPage={setPage} />
      )}
    </ReportShell>
  );
}
