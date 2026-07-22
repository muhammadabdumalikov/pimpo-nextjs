"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { useTranslations } from "@/hooks/useTranslations";
import SelectField from "../form/SelectField";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import ReportSearch from "./ReportSearch";
import ConfirmModal from "../ui/confirm-modal/ConfirmModal";
import {
  getTransferSuggestionsReport,
  createStockTransfer,
  type TransferSuggestionsReport as TSData,
  type TransferRoute,
} from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { formatNumber, formatMoney } from "@/lib/reportFormat";
import { exportAoaToExcel } from "@/lib/exportExcel";

const th = "py-3 px-4 sm:px-6 font-medium text-gray-500 text-sm dark:text-gray-400";

export default function TransferSuggestionsReport() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<TSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [confirmRoute, setConfirmRoute] = useState<TransferRoute | null>(null);
  const [executing, setExecuting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const d = await getTransferSuggestionsReport(days);
      setData(d);
    } catch (e) {
      setError((e as Error)?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  // Filter items within each route by product name/code; drop emptied routes.
  const routes = useMemo(() => {
    const q = search.toLowerCase().trim();
    const src = data?.byRoute ?? [];
    if (!q) return src;
    return src
      .map((r) => ({
        ...r,
        items: r.items.filter(
          (i) => i.name.toLowerCase().includes(q) || (i.code ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((r) => r.items.length > 0);
  }, [data, search]);

  const executeTransfer = async (route: TransferRoute) => {
    try {
      setExecuting(true);
      await createStockTransfer({
        fromBranchId: route.fromBranchId,
        toBranchId: route.toBranchId,
        items: route.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        note: t("reportsPage.transferNote"),
      });
      showToast("success", t("reportsPage.transferDone"), "");
      setConfirmRoute(null);
      await load(); // stock changed → refresh so the executed route drops off
    } catch (e) {
      showToast("error", (e as Error)?.message || "Failed", "");
    } finally {
      setExecuting(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    const aoa: (string | number)[][] = [
      [
        t("reportsPage.direction"),
        t("reportsPage.product"),
        t("reportsPage.quantity"),
        t("reportsPage.movedValue"),
      ],
      ...routes.flatMap((r) =>
        r.items.map((i) => [
          `${r.fromBranchName ?? "—"} → ${r.toBranchName ?? "—"}`,
          i.name,
          i.quantity,
          Math.round(i.valueMoved),
        ]),
      ),
    ];
    exportAoaToExcel("transfer-suggestions", aoa, "Transfers");
  };

  const totals = data?.totals;
  const kpis = totals ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.transferRoutes")} value={formatNumber(totals.routes)} tone={totals.routes > 0 ? "error" : "default"} />
      <ReportKpi label={t("reportsPage.transferMoves")} value={formatNumber(totals.moves)} />
      <ReportKpi label={t("reportsPage.movedValue")} value={formatMoney(totals.totalValue, t("reportsPage.som"))} />
    </div>
  ) : null;

  const colCount = 3;

  return (
    <ReportShell
      title={t("sidebar.reportsTransferSuggestions")}
      filterSummary={`${t("reportsPage.velocity")}: ${days} ${t("reportsPage.daysShort")}${data ? ` · ${t("reportsPage.coverDays")}: ${data.coverDays} ${t("reportsPage.daysShort")}` : ""}`}
      activeFilterCount={days !== 30 ? 1 : 0}
      search={<ReportSearch value={search} onChange={setSearch} />}
      filters={
        <ReportFilterField label={t("reportsPage.velocity")}>
          <SelectField
            className="min-w-[160px]"
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
            options={[
              { value: "30", label: t("reportsPage.days30") },
              { value: "60", label: t("reportsPage.days60") },
              { value: "90", label: t("reportsPage.days90") },
            ]}
          />
        </ReportFilterField>
      }
      kpis={kpis}
      onExport={handleExport}
      exportDisabled={!data || loading || routes.length === 0}
    >
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6 tabular-nums">
        <Table className="w-full min-w-[720px]">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className={`${th} text-start`}>{t("reportsPage.product")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.quantity")}</TableCell>
              <TableCell isHeader className={`${th} text-end`}>{t("reportsPage.movedValue")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow><TableCell colSpan={colCount} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={colCount} className="py-10 text-center text-error-500">{error}</TableCell></TableRow>
            ) : routes.length === 0 ? (
              <TableRow><TableCell colSpan={colCount} className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.noData")}</TableCell></TableRow>
            ) : (
              routes.map((r) => (
                <Fragment key={`${r.fromBranchId}>${r.toBranchId}`}>
                  <TableRow className="bg-gray-50 dark:bg-white/[0.03]">
                    <TableCell colSpan={colCount} className="py-2.5 px-4 sm:px-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-gray-800 dark:text-white/90">
                          {r.fromBranchName ?? "—"}
                          <span className="mx-2 text-brand-500">→</span>
                          {r.toBranchName ?? "—"}
                        </span>
                        <span className="text-xs font-normal text-gray-400">
                          · {formatNumber(r.products)} {t("reportsPage.product").toLowerCase()} · {formatMoney(r.totalValue, t("reportsPage.som"))}
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmRoute(r)}
                          className="ml-auto inline-flex items-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
                        >
                          {t("reportsPage.transferExecute")}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {r.items.map((i) => (
                    <TableRow key={`${r.fromBranchId}>${r.toBranchId}:${i.productId}`} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <TableCell className="py-3 px-4 sm:px-6 text-gray-800 font-medium dark:text-white/90">
                        {i.name}
                        {i.code && <span className="block text-xs text-gray-400">{i.code}</span>}
                      </TableCell>
                      <TableCell className="py-3 px-4 sm:px-6 text-end font-medium text-brand-500">{formatNumber(i.quantity)}</TableCell>
                      <TableCell className="py-3 px-4 sm:px-6 text-end text-gray-800 dark:text-white/90">{formatMoney(i.valueMoved, t("reportsPage.som"))}</TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmModal
        isOpen={confirmRoute !== null}
        onClose={() => setConfirmRoute(null)}
        onConfirm={() => {
          if (confirmRoute) void executeTransfer(confirmRoute);
        }}
        title={t("reportsPage.transferConfirmTitle")}
        message={
          confirmRoute
            ? `${confirmRoute.fromBranchName ?? "—"} → ${confirmRoute.toBranchName ?? "—"} · ${formatNumber(confirmRoute.products)} ${t("reportsPage.product").toLowerCase()}\n\n${t("reportsPage.transferConfirmMsg")}`
            : ""
        }
        confirmLabel={t("reportsPage.transferExecute")}
        cancelLabel={t("reportsPage.cancel")}
        isLoading={executing}
        loadingLabel={t("reportsPage.transferExecuting")}
      />
    </ReportShell>
  );
}
