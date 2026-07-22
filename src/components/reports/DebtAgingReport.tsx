"use client";
import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import ReportShell, { ReportKpi } from "./ReportShell";
import ReportSearch from "./ReportSearch";
import ReportPager from "./ReportPager";
import { getDebtAgingReport, type DebtAgingReport as AgingData, type DebtBucketKey } from "@/lib/api";
import { formatMoney, formatNumber, formatDate } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const PAGE = 14;
const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

const BUCKETS: { key: DebtBucketKey; labelKey: string; tile: string; text: string }[] = [
  { key: "current", labelKey: "reportsPage.dueCurrent", tile: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  { key: "d30", labelKey: "reportsPage.due30", tile: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  { key: "d60", labelKey: "reportsPage.due60", tile: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  { key: "d90", labelKey: "reportsPage.due90", tile: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
  { key: "d90plus", labelKey: "reportsPage.due90plus", tile: "bg-red-100 dark:bg-red-500/15", text: "text-red-700 dark:text-red-400" },
];

export default function DebtAgingReport() {
  const { t } = useTranslations();
  const [data, setData] = useState<AgingData | null>(null);
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
        const d = await getDebtAgingReport();
        if (active) setData(d);
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = data?.debtors ?? [];
    if (!q) return list;
    return list.filter((d) => d.name.toLowerCase().includes(q) || (d.phone ?? "").includes(q));
  }, [data, search]);
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const bucketAmount = (k: DebtBucketKey) => data?.buckets.find((b) => b.key === k)?.amount ?? 0;

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [t("reportsPage.debtor"), t("reportsPage.phone"), t("reportsPage.outstanding"), t("reportsPage.due90plus"), t("reportsPage.oldestDays")],
      ...filtered.map((d) => [d.name, d.phone ?? "—", Math.round(d.remaining), Math.round(d.d90plus), d.oldestDays]),
    ];
    exportAoaToExcel("debt-aging-report", aoa, "DebtAging");
  };

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.totalOutstanding")} value={money(data.totalOutstanding)} tone="error" />
      <ReportKpi label={t("reportsPage.debtors")} value={formatNumber(data.debtorCount)} />
      <ReportKpi label={t("reportsPage.due90plus")} value={money(bucketAmount("d90plus"))} tone="error" />
      <ReportKpi label={t("reportsPage.dueCurrent")} value={money(bucketAmount("current"))} />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsDebtAging")}
      filterSummary={data ? `${t("reportsPage.asOf")}: ${formatDate(data.asOf)}` : undefined}
      search={<ReportSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} />}
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading || filtered.length === 0}
    >
      {/* Aging portfolio — where the receivable money sits by overdue age. */}
      {!loading && !error && data && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BUCKETS.map((b) => {
            const bk = data.buckets.find((x) => x.key === b.key);
            return (
              <div key={b.key} className={`rounded-xl p-3.5 ${b.tile}`}>
                <p className={`text-[11px] font-medium uppercase tracking-wide ${b.text}`}>{t(b.labelKey)}</p>
                <p className={`mt-1 text-base font-semibold tabular-nums ${b.text}`}>{money(bk?.amount ?? 0)}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatNumber(bk?.count ?? 0)} {t("reportsPage.debtsShort")}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[720px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.debtor")}</TableCell>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.phone")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.outstanding")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.due90plus")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.oldestDays")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              paged.map((d, i) => (
                <TableRow key={d.userId ?? i} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">{d.name}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-gray-500 dark:text-gray-400">{d.phone ?? "—"}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-error-500">{money(d.remaining)}</TableCell>
                  <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{d.d90plus > 0 ? money(d.d90plus) : "—"}</TableCell>
                  <TableCell className={`py-3 px-4 sm:px-6 text-end ${d.oldestDays > 90 ? "text-error-500 font-medium" : d.oldestDays > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>{d.oldestDays > 0 ? d.oldestDays : "—"}</TableCell>
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
