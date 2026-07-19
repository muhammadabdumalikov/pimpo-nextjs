"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportSingleDate from "./ReportSingleDate";
import ReportSearch from "./ReportSearch";
import ReportPager from "./ReportPager";
import { getStockReport, type StockReport as StockData } from "@/lib/api";
import { formatMoney, formatNumber, formatDate, toISODate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 12;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function StockReport() {
  const { t } = useTranslations();
  const [date, setDate] = useState<Date | null>(new Date());
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getStockReport(date ? toISODate(date) : undefined);
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [date]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const items = data?.items ?? [];
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.code ?? "").toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.product"),
        t("reportsPage.category"),
        t("reportsPage.quantity"),
        t("reportsPage.costPrice"),
        t("reportsPage.salePrice"),
        t("reportsPage.costValue"),
        t("reportsPage.saleValue"),
      ],
      ...filtered.map((i) => [
        i.name,
        i.category ?? "",
        i.quantity,
        Math.round(i.priceIn),
        Math.round(i.priceOut),
        Math.round(i.costValue),
        Math.round(i.saleValue),
      ]),
    ];
    exportAoaToExcel("stock-report", aoa, "Stock");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.products")} value={formatNumber(data.totals.products)} />
      <ReportKpi label={t("reportsPage.units")} value={formatNumber(data.totals.units)} />
      <ReportKpi label={t("reportsPage.costValue")} value={money(data.totals.costValue)} />
      <ReportKpi label={t("reportsPage.saleValue")} value={money(data.totals.saleValue)} tone="success" />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsStock")}
      filterSummary={date ? formatDate(date) : undefined}
      search={<ReportSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />}
      filters={
        <ReportFilterField label={t("reportsPage.asOfDate")}>
          <ReportSingleDate value={date} onChange={(d) => { setDate(d); setPage(1); }} />
        </ReportFilterField>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[760px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.product")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.category")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.quantity")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.costPrice")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.costValue")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.saleValue")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((i) => (
                <TableRow key={i.productId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">
                    {i.name}
                    {i.code && <span className="block text-xs text-gray-400">{i.code}</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{i.category ?? "—"}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatNumber(i.quantity)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-500 dark:text-gray-400">{money(i.priceIn)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{money(i.costValue)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-success-600 dark:text-success-500">{money(i.saleValue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && !error && filtered.length > PAGE && (
        <ReportPager page={page} totalItems={filtered.length} pageSize={PAGE} onPage={setPage} />
      )}
    </ReportShell>
  );
}
