"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import AvatarText from "@/components/ui/avatar/AvatarText";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { TrashBinIcon } from "@/icons/index";
import { LuBanknote, LuChevronRight } from "react-icons/lu";
import { exportAoaToExcel } from "@/lib/exportExcel";
import { formatMoney, formatNumber, formatDate } from "@/lib/reportFormat";
import {
  getPayrollSummary,
  getPayrollPreview,
  getPayrollEntries,
  accruePayroll,
  createPayrollPayment,
  createPayrollAdjustment,
  deletePayrollEntry,
  getAccounts,
  type PayrollSummary,
  type PayrollSummaryRow,
  type PayrollPreview,
  type PayrollEntry,
  type Account,
} from "@/lib/api";

// The page is a wage ledger (daftar), not a dashboard: one dominant liability
// figure, bare tabular numbers in the table (so'm is stated once, on the hero),
// and the employee drawer as the settle-up surface.

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]";

/** 'YYYY-MM' for the current month in the store zone (fixed +05:00). */
const currentPeriod = (): string => {
  const local = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** The last 12 months, newest first, as 'YYYY-MM'. */
const periodOptions = (): string[] => {
  const [y, m] = currentPeriod().split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const total = y * 12 + (m - 1) - i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
};

// App locale → BCP-47 tag for month names.
const INTL_LOCALE: Record<string, string> = {
  uz: "uz-Latn-UZ",
  uzc: "uz-Cyrl-UZ",
  ru: "ru-RU",
  en: "en-US",
};

/** '2026-07' → 'Iyul 2026' in the active locale. */
const monthLabel = (period: string, locale: string): string => {
  const [y, m] = period.split("-").map(Number);
  const label = new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "uz-Latn-UZ", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

type ActionKind = "payment" | "advance" | "bonus" | "deduction";

/** Sign and tone of a ledger entry. Red is reserved for penalties — a payment
 *  settles a debt, it is not an error. */
const ENTRY_TONE: Record<
  PayrollEntry["type"],
  { sign: "+" | "−"; cls: string }
> = {
  accrual: { sign: "+", cls: "text-success-600 dark:text-success-400" },
  bonus: { sign: "+", cls: "text-success-600 dark:text-success-400" },
  payment: { sign: "−", cls: "text-gray-600 dark:text-gray-300" },
  advance: { sign: "−", cls: "text-gray-600 dark:text-gray-300" },
  deduction: { sign: "−", cls: "text-error-500" },
};

/** Owed = warning, overpaid = error, settled = quiet. */
const balanceCls = (balance: number) =>
  balance > 0
    ? "text-warning-600 dark:text-warning-400"
    : balance < 0
      ? "text-error-500"
      : "text-gray-400";

export default function Payroll() {
  const { t, locale } = useTranslations();
  const { showToast } = useToast();
  const som = t("reportsPage.som") || "so'm";
  const money = useCallback((n: number) => formatMoney(n, som), [som]);

  const [period, setPeriod] = useState(currentPeriod());
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Accrual run
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [accruing, setAccruing] = useState(false);

  // Payment / adjustment
  const [actionRow, setActionRow] = useState<PayrollSummaryRow | null>(null);
  const [actionKind, setActionKind] = useState<ActionKind>("payment");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  // Employee drawer (balance + actions + ledger)
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<PayrollEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sum, accs] = await Promise.all([
        getPayrollSummary(period),
        getAccounts(),
      ]);
      setSummary(sum);
      setAccounts(accs);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setLoading(false);
    }
    // showToast is stable enough for this effect; period is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  // Only employees actually on payroll (or still carrying a balance) are
  // listed — an accountless cleaner with no salary set stays out of the daftar.
  const rows = useMemo(
    () =>
      (summary?.rows ?? []).filter(
        (r) => r.salaryType !== "none" || r.balance !== 0,
      ),
    [summary],
  );

  // Derived, so the drawer stays fresh after any reload.
  const drawerRow = useMemo(
    () => rows.find((r) => r.id === drawerId) ?? null,
    [rows, drawerId],
  );

  const totals = summary?.totals;
  // The signature: how much of this month's payroll is already settled.
  const settlementPct = totals && totals.accrued > 0
    ? Math.min(100, Math.round((totals.paid / totals.accrued) * 100))
    : 0;

  /** Compact formula for a table cell: '3 000 000', '5% tushumdan', '3 000 000 + 5%'. */
  const formulaLabel = (row: PayrollSummaryRow) => {
    const percentText = `${row.salesPercent}% ${
      row.percentBase === "profit"
        ? t("payroll.ofProfit") || "foydadan"
        : t("payroll.ofRevenue") || "tushumdan"
    }`;
    switch (row.salaryType) {
      case "fixed":
        return formatNumber(row.baseSalary);
      case "percent":
        return percentText;
      case "mixed":
        return `${formatNumber(row.baseSalary)} + ${row.salesPercent}%`;
      default:
        return t("payroll.notSet") || "—";
    }
  };

  // ─── Accrual run ──────────────────────────────────────────────────────────

  const openPreview = async () => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const data = await getPayrollPreview(period);
      setPreview(data);
      setSelectedIds(
        data.rows
          .filter((r) => !r.alreadyAccrued && r.total > 0)
          .map((r) => r.staffId),
      );
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmAccrual = async () => {
    if (selectedIds.length === 0) return;
    setAccruing(true);
    try {
      const res = await accruePayroll(period, selectedIds);
      showToast(
        "success",
        `${res.created} ${t("payroll.accrualDone")} — ${money(res.total)}`,
        "Success",
      );
      setPreviewOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setAccruing(false);
    }
  };

  const selectableIds = useMemo(
    () =>
      (preview?.rows ?? [])
        .filter((r) => !r.alreadyAccrued && r.total > 0)
        .map((r) => r.staffId),
    [preview],
  );

  const previewTotal = useMemo(
    () =>
      (preview?.rows ?? [])
        .filter((r) => selectedIds.includes(r.staffId))
        .reduce((s, r) => s + r.total, 0),
    [preview, selectedIds],
  );

  // ─── Payment / adjustment ─────────────────────────────────────────────────

  const openAction = (row: PayrollSummaryRow, kind: ActionKind) => {
    setActionRow(row);
    setActionKind(kind);
    setAmount("");
    setAccountId(accounts[0]?.id ?? "");
    setNote("");
    setActionError("");
  };

  const movesMoney = actionKind === "payment" || actionKind === "advance";

  const submitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionRow) return;
    const value = Number(amount);
    if (!(value > 0)) {
      return setActionError(t("payroll.errors.amountRequired") || "Amount is required");
    }
    if (movesMoney && !accountId) {
      return setActionError(t("payroll.errors.accountRequired") || "Account is required");
    }

    setSaving(true);
    setActionError("");
    try {
      if (movesMoney) {
        await createPayrollPayment(actionRow.id, {
          amount: value,
          accountId,
          type: actionKind as "payment" | "advance",
          note: note.trim() || undefined,
        });
      } else {
        await createPayrollAdjustment(actionRow.id, {
          amount: value,
          type: actionKind as "bonus" | "deduction",
          note: note.trim() || undefined,
        });
      }
      showToast("success", t("payroll.saved") || "Saved", "Success");
      setActionRow(null);
      await load();
      if (drawerId) await loadEntries(drawerId);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Drawer / ledger ──────────────────────────────────────────────────────

  const loadEntries = async (staffId: string) => {
    setEntriesLoading(true);
    try {
      setEntries(await getPayrollEntries(staffId));
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setEntriesLoading(false);
    }
  };

  const openDrawer = (row: PayrollSummaryRow) => {
    setDrawerId(row.id);
    setEntries([]);
    loadEntries(row.id);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    setDeletingEntry(true);
    try {
      await deletePayrollEntry(entryToDelete.id);
      showToast("success", t("payroll.entryDeleted") || "Entry removed", "Success");
      setEntryToDelete(null);
      await load();
      if (drawerId) await loadEntries(drawerId);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setDeletingEntry(false);
    }
  };

  const exportExcel = () => {
    if (!summary) return;
    const header = [
      t("payroll.employee"),
      t("payroll.positionLabel"),
      t("payroll.salaryTypeLabel"),
      t("payroll.periodAccrued"),
      t("payroll.periodPaid"),
      t("payroll.balance"),
    ];
    const body = rows.map((r) => [
      r.name,
      r.position ?? "",
      formulaLabel(r),
      r.periodAccrued,
      r.periodPaid,
      r.balance,
    ]);
    exportAoaToExcel(`ish-haqi-${period}`, [header, ...body], "Ish haqi");
  };

  const entryTypeLabel = (type: PayrollEntry["type"]) =>
    t(`payroll.entryTypes.${type}`) || type;

  const ACTION_KINDS: ActionKind[] = ["payment", "advance", "bonus", "deduction"];

  return (
    <div className="space-y-5">
      {/* ── Controls: the period defines everything below it ─────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-48">
          <SelectField
            value={period}
            onChange={setPeriod}
            options={periodOptions().map((p) => ({
              value: p,
              label: monthLabel(p, locale),
            }))}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={exportExcel} disabled={!summary || rows.length === 0}>
            {t("payroll.exportExcel")}
          </Button>
          <Button size="sm" onClick={openPreview}>
            {t("payroll.runAccrual")}
          </Button>
        </div>
      </div>

      {/* ── The ledger header: one dominant figure + the month meter ─────── */}
      {summary && (
        <div className={`${CARD} px-5 py-5 sm:px-6`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            {/* Focal point: total liability */}
            <div>
              <p className="text-theme-xs font-medium uppercase tracking-wider text-gray-400">
                {t("payroll.totalDebt")}
              </p>
              <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-gray-800 dark:text-white/90">
                {money(totals?.balance ?? 0)}
              </p>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {totals?.onPayroll ?? 0} {t("payroll.employeesOnPayroll")}
              </p>
            </div>

            {/* Month settlement: accrued vs paid, with the meter */}
            <div className="w-full sm:w-80">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-theme-xs font-medium uppercase tracking-wider text-gray-400">
                  {t("payroll.monthSettlement")} · {monthLabel(period, locale)}
                </span>
                <span className="text-theme-xs tabular-nums text-gray-400">
                  {settlementPct}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-success-500 transition-[width] duration-500"
                  style={{ width: `${settlementPct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-theme-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("payroll.periodPaid")}{" "}
                  <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">
                    {formatNumber(totals?.paid ?? 0)}
                  </span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {t("payroll.periodAccrued")}{" "}
                  <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">
                    {formatNumber(totals?.accrued ?? 0)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── The daftar ───────────────────────────────────────────────────── */}
      <div className={`${CARD} px-4 pb-3 pt-2 sm:px-5`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5">
              <LuBanknote size={22} />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("payroll.empty")}
            </p>
            <p className="mt-1 text-theme-sm text-gray-400">
              {t("payroll.emptyHint")}
            </p>
            <Link
              href="/staff"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
            >
              {t("payroll.emptyCta")}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">{t("payroll.employee")}</th>
                  <th className="px-3 py-3 font-medium">{t("payroll.salaryTypeLabel")}</th>
                  <th className="px-3 py-3 text-right font-medium">
                    {t("payroll.periodAccrued")}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {t("payroll.periodPaid")}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {t("payroll.balance")}
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openDrawer(row)}
                    className="cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarText name={row.name} className="!h-9 !w-9 text-theme-xs" />
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white/90">
                            {row.name}
                          </div>
                          <div className="text-theme-xs text-gray-400">
                            {[row.position, row.branchName]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 tabular-nums text-gray-500 dark:text-gray-400">
                      {formulaLabel(row)}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {row.periodAccrued > 0 ? formatNumber(row.periodAccrued) : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {row.periodPaid > 0 ? formatNumber(row.periodPaid) : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <span className={`font-semibold tabular-nums ${balanceCls(row.balance)}`}>
                        {formatNumber(row.balance)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAction(row, "payment");
                          }}
                          className="rounded-lg bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                        >
                          {t("payroll.pay")}
                        </button>
                        <span
                          className="flex h-7 w-7 items-center justify-center text-gray-300 dark:text-gray-600"
                          aria-hidden
                        >
                          <LuChevronRight size={16} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Employee drawer: balance, actions, ledger ────────────────────── */}
      <Drawer
        isOpen={!!drawerRow}
        onClose={() => setDrawerId(null)}
        title={drawerRow?.name}
        widthClass="max-w-lg"
      >
        {drawerRow && (
          <div className="space-y-6">
            {/* Balance hero */}
            <div>
              <p className="text-theme-xs font-medium uppercase tracking-wider text-gray-400">
                {t("payroll.balance")}
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
                  drawerRow.balance !== 0
                    ? balanceCls(drawerRow.balance)
                    : "text-gray-800 dark:text-white/90"
                }`}
              >
                {money(drawerRow.balance)}
              </p>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {drawerRow.balance === 0
                  ? t("payroll.settledUp")
                  : drawerRow.balance < 0
                    ? t("payroll.overpaid")
                    : formulaLabel(drawerRow)}
              </p>
            </div>

            {/* Actions */}
            <div>
              <p className="mb-2 text-theme-xs font-medium uppercase tracking-wider text-gray-400">
                {t("payroll.actionsLabel")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ACTION_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => openAction(drawerRow, kind)}
                    className={
                      kind === "payment"
                        ? "rounded-lg bg-brand-500 px-3 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600"
                        : "rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
                    }
                  >
                    {t(`payroll.${kind === "payment" ? "pay" : kind}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* This month's own-sales context for percent-based staff */}
            {(drawerRow.salaryType === "percent" ||
              drawerRow.salaryType === "mixed") && (
              <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-theme-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
                {monthLabel(period, locale)} · {t("payroll.periodRevenue")}:{" "}
                <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">
                  {money(
                    drawerRow.percentBase === "profit"
                      ? drawerRow.periodProfit
                      : drawerRow.periodRevenue,
                  )}
                </span>
              </p>
            )}

            {/* Ledger */}
            <div>
              <p className="mb-2 text-theme-xs font-medium uppercase tracking-wider text-gray-400">
                {t("payroll.historyShort")}
              </p>
              {entriesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                </div>
              ) : entries.length === 0 ? (
                <p className="py-8 text-center text-theme-sm text-gray-400">
                  {t("payroll.noEntries")}
                </p>
              ) : (
                <ul>
                  {entries.map((entry) => {
                    const tone = ENTRY_TONE[entry.type];
                    return (
                      <li
                        key={entry.id}
                        className="group flex items-start justify-between gap-3 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800/60"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {entryTypeLabel(entry.type)}
                            {entry.periodMonth && (
                              <span className="ml-1.5 font-normal text-gray-400">
                                {monthLabel(entry.periodMonth, locale)}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 truncate text-theme-xs text-gray-400">
                            {formatDate(entry.createdAt)}
                            {entry.note ? ` · ${entry.note}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <div className="text-right">
                            <p className={`text-sm font-semibold tabular-nums ${tone.cls}`}>
                              {tone.sign}
                              {formatNumber(Number(entry.amount))}
                            </p>
                            <p className="mt-0.5 text-theme-xs tabular-nums text-gray-400">
                              {formatNumber(Number(entry.balanceAfter))}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEntryToDelete(entry)}
                            aria-label={t("payroll.undo")}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-300 opacity-0 transition-opacity hover:bg-error-50 hover:text-error-500 focus:opacity-100 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-error-500/10"
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Accrual preview modal ────────────────────────────────────────── */}
      <Modal
        isOpen={previewOpen}
        onClose={() => !accruing && setPreviewOpen(false)}
        className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 sm:p-8"
      >
        <h2 className="mb-1 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">
          {t("payroll.accrualTitle")} — {monthLabel(period, locale)}
        </h2>
        <p className="mb-5 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("payroll.accrualHint")}
        </p>

        {previewLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
          </div>
        ) : !preview || preview.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("payroll.nothingToAccrue")}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                    <th className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={
                          selectableIds.length > 0 &&
                          selectedIds.length === selectableIds.length
                        }
                        onChange={(e) =>
                          setSelectedIds(e.target.checked ? selectableIds : [])
                        }
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                      />
                    </th>
                    <th className="px-2 py-2 font-medium">{t("payroll.employee")}</th>
                    <th className="px-2 py-2 text-right font-medium">
                      {t("payroll.baseAmount")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium">
                      {t("payroll.salesAmount")}
                    </th>
                    <th className="px-2 py-2 text-right font-medium">
                      {t("payroll.total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => {
                    const disabled = r.alreadyAccrued || r.total <= 0;
                    return (
                      <tr
                        key={r.staffId}
                        className={`border-b border-gray-100 dark:border-gray-800/60 ${
                          disabled ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-2 py-2.5">
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={selectedIds.includes(r.staffId)}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, r.staffId]
                                  : prev.filter((id) => id !== r.staffId),
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="font-medium text-gray-800 dark:text-white/90">
                            {r.staffName}
                          </div>
                          {r.alreadyAccrued && (
                            <div className="text-theme-xs text-gray-400">
                              {t("payroll.alreadyAccrued")}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                          {r.baseAmount > 0 ? formatNumber(r.baseAmount) : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                          {r.salesAmount > 0 ? (
                            <>
                              {formatNumber(r.salesAmount)}
                              <div className="text-theme-xs text-gray-400">
                                {r.percentApplied}% × {formatNumber(r.salesBase)}
                              </div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-gray-800 dark:text-white/90">
                          {formatNumber(r.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {t("payroll.selectedTotal")} ({selectedIds.length})
              </span>
              <span className="text-lg font-semibold tabular-nums text-gray-800 dark:text-white/90">
                {money(previewTotal)}
              </span>
            </div>
          </>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setPreviewOpen(false)}
            disabled={accruing}
          >
            {t("payroll.cancel")}
          </Button>
          <Button
            type="button"
            size="md"
            onClick={confirmAccrual}
            disabled={accruing || selectedIds.length === 0}
          >
            {accruing ? t("payroll.saving") : t("payroll.confirmAccrual")}
          </Button>
        </div>
      </Modal>

      {/* ── Payment / adjustment modal ───────────────────────────────────── */}
      <Modal
        isOpen={!!actionRow}
        onClose={() => !saving && setActionRow(null)}
        className="mx-4 w-full max-w-md p-6 sm:p-8"
      >
        <form onSubmit={submitAction}>
          <h2 className="mb-1 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">
            {t(`payroll.actions.${actionKind}`)}
          </h2>
          <p className="mb-5 text-theme-sm text-gray-500 dark:text-gray-400">
            {actionRow?.name} · {t("payroll.balance")}:{" "}
            <span className="font-medium tabular-nums">
              {money(actionRow?.balance ?? 0)}
            </span>
          </p>

          {actionError && (
            <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
              {actionError}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label>
                {t("payroll.amount")} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step={1000}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {actionKind === "payment" &&
                (actionRow?.balance ?? 0) > 0 &&
                Number(amount) !== actionRow?.balance && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(actionRow?.balance ?? 0))}
                    className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-theme-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                  >
                    {t("payroll.payFullBalance")} —{" "}
                    <span className="ml-1 tabular-nums">
                      {formatNumber(actionRow?.balance ?? 0)}
                    </span>
                  </button>
                )}
            </div>

            {movesMoney && (
              <div>
                <Label>
                  {t("payroll.account")} <span className="text-error-500">*</span>
                </Label>
                <SelectField
                  value={accountId}
                  onChange={setAccountId}
                  placeholder={t("payroll.selectAccount")}
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                />
                <p className="mt-1 text-theme-xs text-gray-400">
                  {t("payroll.accountHint")}
                </p>
              </div>
            )}

            <div>
              <Label>{t("payroll.note")}</Label>
              <Input
                type="text"
                placeholder={t("payroll.notePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActionRow(null)}
              disabled={saving}
            >
              {t("payroll.cancel")}
            </Button>
            <Button type="submit" size="md" disabled={saving}>
              {saving ? t("payroll.saving") : t("payroll.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!entryToDelete}
        onClose={() => !deletingEntry && setEntryToDelete(null)}
        onConfirm={confirmDeleteEntry}
        title={t("payroll.undoConfirmTitle") || "Undo entry?"}
        message={t("payroll.undoConfirm") || "This reverses the balance."}
        confirmLabel={t("payroll.undo") || "Undo"}
        cancelLabel={t("payroll.cancel") || "Cancel"}
        variant="danger"
        isLoading={deletingEntry}
        loadingLabel={t("payroll.saving") || "Saving..."}
      />
    </div>
  );
}
