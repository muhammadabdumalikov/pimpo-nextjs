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
import Switch from "@/components/form/switch/Switch";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { TrashBinIcon } from "@/icons/index";
import { LuBanknote, LuChevronRight, LuTriangleAlert } from "react-icons/lu";
import { exportAoaToExcel } from "@/lib/exportExcel";
import {
  formatMoney,
  formatNumber,
  formatDate,
  formatCompact,
  periodLabel,
  type CompactUnits,
} from "@/lib/reportFormat";
import {
  getPayrollSummary,
  getPayrollPreview,
  getPayrollEntries,
  getPayrollSettings,
  updatePayrollSettings,
  accruePayroll,
  createPayrollPayment,
  createPayrollAdjustment,
  deletePayrollEntry,
  getAccounts,
  type PayrollSummary,
  type PayrollSummaryRow,
  type PayrollPreview,
  type PayrollEntry,
  type PayrollSettings,
  type Account,
} from "@/lib/api";

// The page is a LIVE wage daftar (owner-decided 2026-08-05), modeled on the
// paper notebook every do'kon keeps: the month is the unit, the wage is known
// up front, hand-outs accumulate against it, and the remainder is settled when
// the month closes. The page answers the owner's three questions and nothing
// else: "Oyligi qancha? Shu oy qancha berdim? Qancha qoladi?"
//
// - The table's month window (a named, faintly tinted band) holds OYLIK ·
//   BERILDI · QOLADI. OYLIK is alive: ledger truth once the month is closed,
//   otherwise base + % of own sales so far — there is no empty "not accrued
//   yet" cell, because the paper daftar never has one.
// - "Hisoblash" (accrual) is deliberately invisible as a concept: the button
//   is "Oyni yopish" — closing the month writes the numbers you've been
//   looking at all along into the ledger.
// - The lifetime balance appears ONLY in the drawer (JAMI QOLDIQ) and the
//   hero — never as a table column next to month figures.
// - Direction is a WORD, never a minus sign: a plain dark figure = to pay,
//   amber + "avans" = paid ahead. Red is for penalties only.

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

// '2026-07' → 'Iyul 2026'. Our own month tables (periodLabel), not Intl —
// browsers without Uzbek CLDR data would render "2026 M07" here.
const monthLabel = periodLabel;

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

/** To-pay = the strong, actionable figure; avans = amber (explained by a
 *  word, never red — an avans is routine); settled = quiet. */
const balanceCls = (balance: number) =>
  balance > 0
    ? "text-gray-800 dark:text-white/90"
    : balance < 0
      ? "text-warning-600 dark:text-warning-400"
      : "text-gray-400";

/** The month-window band: every period-scoped cell shares this faint tint so
 *  nothing inside it can be misread as an all-time figure. */
const MONTH_BAND = "bg-gray-50/60 dark:bg-white/[0.02]";

/** The month's remainder: the (live) wage minus what was handed out and
 *  withheld. Positive = still to pay for this month, negative = paid ahead.
 *  Falls back to the ledger figure if an older backend omits periodWage. */
const monthDue = (row: PayrollSummaryRow) =>
  (row.periodWage ?? row.periodAccrued) -
  row.periodPaid -
  (row.periodDeducted ?? 0);

export default function Payroll() {
  const { t, locale } = useTranslations();
  const { showToast } = useToast();
  const som = t("reportsPage.som") || "so'm";
  const money = useCallback((n: number) => formatMoney(n, som), [som]);

  const [period, setPeriod] = useState(currentPeriod());
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
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

  // Preferences are cosmetic — a failed fetch must not blank the daftar, so
  // they load outside the main Promise.all and fail silently (the switch just
  // stays off).
  useEffect(() => {
    getPayrollSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  // Optimistic: the switch flips immediately and reverts if the save fails,
  // so a one-field preference never costs a spinner.
  const toggleAutoAccrue = async (next: boolean) => {
    const previous = settings;
    setSettings((s) => (s ? { ...s, autoAccrue: next } : s));
    try {
      setSettings(await updatePayrollSettings({ autoAccrue: next }));
    } catch (e) {
      setSettings(previous);
      showToast("error", (e as Error).message, "Error");
    }
  };

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

  const unaccrued = useMemo(
    () => summary?.unaccruedPeriods ?? [],
    [summary],
  );

  // "Iyul 2026" → "Iyul 2026, Iyun 2026" → "Iyul 2026, Iyun 2026 +3". Naming
  // more than two would crowd the line without telling the owner anything new:
  // the fix is the same button either way.
  const unaccruedLabel = useMemo(() => {
    const names = unaccrued.slice(0, 2).map((p) => monthLabel(p, locale));
    const rest = unaccrued.length - names.length;
    return rest > 0 ? `${names.join(", ")} +${rest}` : names.join(", ");
  }, [unaccrued, locale]);

  // The selected month is closed, so a missing accrual there is a real gap
  // rather than a month still in progress.
  const periodClosed = period < currentPeriod();

  // The month at a glance: total wages, what's been handed out, and what will
  // be needed. `due` sums only positive remainders — one employee's avans
  // doesn't hand cash back to pay another with.
  const monthAgg = useMemo(() => {
    const wage = rows.reduce(
      (s, r) => s + (r.periodWage ?? r.periodAccrued),
      0,
    );
    const paid = rows.reduce((s, r) => s + r.periodPaid, 0);
    const due = rows.reduce((s, r) => s + Math.max(0, monthDue(r)), 0);
    return { wage, paid, due };
  }, [rows]);

  // How much of this month's wage bill is already in employees' hands.
  const settlementPct =
    monthAgg.wage > 0
      ? Math.min(100, Math.round((monthAgg.paid / monthAgg.wage) * 100))
      : 0;

  /** Full formula, for the Excel export: '3 000 000 /oy', '5% tushumdan',
   *  '3 000 000 + 5%'. The '/oy' suffix keeps a bare oklad from being misread
   *  as an amount currently owed — it turns the number into a rate. */
  const formulaLabel = (row: PayrollSummaryRow) => {
    const percentText = `${row.salesPercent}% ${
      row.percentBase === "profit"
        ? t("payroll.ofProfit") || "foydadan"
        : t("payroll.ofRevenue") || "tushumdan"
    }`;
    switch (row.salaryType) {
      case "fixed":
        return `${formatNumber(row.baseSalary)} ${t("payroll.perMonth")}`;
      case "percent":
        return percentText;
      case "mixed":
        return `${formatNumber(row.baseSalary)} + ${row.salesPercent}%`;
      default:
        return t("payroll.notSet") || "—";
    }
  };

  // Short-scale units so the rate under a name stays tiny ("6 mln /oy").
  const units: CompactUnits = useMemo(
    () => ({
      thousand: t("products.statsThousand"),
      million: t("products.statsMillion"),
      billion: t("products.statsBillion"),
    }),
    [t],
  );

  /** Compressed rate for the name subtext: '6 mln /oy', '5% tushumdan',
   *  '3 mln + 5%'. The full-precision version lives in the Excel export. */
  const compactFormula = (row: PayrollSummaryRow): string | null => {
    const percentText = `${row.salesPercent}% ${
      row.percentBase === "profit"
        ? t("payroll.ofProfit") || "foydadan"
        : t("payroll.ofRevenue") || "tushumdan"
    }`;
    switch (row.salaryType) {
      case "fixed":
        return `${formatCompact(row.baseSalary, units)} ${t("payroll.perMonth")}`;
      case "percent":
        return percentText;
      case "mixed":
        return `${formatCompact(row.baseSalary, units)} + ${row.salesPercent}%`;
      default:
        return null;
    }
  };

  // ─── Accrual run ──────────────────────────────────────────────────────────

  /** `target` lets the unaccrued-months banner jump straight to the month it
   *  is complaining about, rather than making the owner find it by hand. */
  const openPreview = async (target?: string) => {
    const forPeriod = target ?? period;
    if (target && target !== period) setPeriod(target);
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const data = await getPayrollPreview(forPeriod);
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
    if (selectedIds.length === 0 || !preview) return;
    setAccruing(true);
    try {
      // preview.period, not the period state: the banner can open the modal for
      // a different month, and the state update may not have landed yet.
      const res = await accruePayroll(preview.period, selectedIds);
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
    // Excel keeps SIGNED numbers (positive = to pay, negative = avans) — a
    // spreadsheet is for sums, and words in number cells would break them.
    const header = [
      t("payroll.employee"),
      t("payroll.positionLabel"),
      t("payroll.salaryTypeLabel"),
      t("payroll.monthWage"),
      t("payroll.periodPaid"),
      t("payroll.remains"),
      t("payroll.balanceTotal"),
    ];
    const body = rows.map((r) => [
      r.name,
      r.position ?? "",
      formulaLabel(r),
      r.periodWage ?? r.periodAccrued,
      r.periodPaid,
      monthDue(r),
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
          <Button size="sm" onClick={() => openPreview()}>
            {t("payroll.runAccrual")}
          </Button>
        </div>
      </div>

      {/* ── The ledger header: one dominant figure + the month meter ─────── */}
      {summary && (
        <div className={`${CARD} px-5 py-5 sm:px-6`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            {/* Focal point: total liability. When the net position is money
                handed out ahead of wages, the label flips to say so — the
                figure itself never wears a minus. */}
            <div>
              <p className="text-theme-xs font-medium uppercase tracking-wider text-gray-400">
                {(totals?.balance ?? 0) < 0
                  ? t("payroll.advanceGiven")
                  : t("payroll.totalDebt")}
              </p>
              <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-gray-800 dark:text-white/90">
                {money(Math.abs(totals?.balance ?? 0))}
              </p>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {totals?.onPayroll ?? 0} {t("payroll.employeesOnPayroll")}
              </p>
            </div>

            {/* The month at a glance, on the LIVE wage bill: how much of it is
                already in employees' hands, and what remains. For an open
                month the remainder wears "~" — percent wages keep growing
                until the month closes. */}
            {monthAgg.wage > 0 && (
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
                      {formatNumber(monthAgg.paid)}
                    </span>
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {t("payroll.remains")}{" "}
                    <span className="font-medium tabular-nums text-gray-700 dark:text-gray-200">
                      {!periodClosed && monthAgg.due > 0 ? "~" : ""}
                      {formatNumber(monthAgg.due)}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Months that were never closed. Without this a balance built only
              from payments reads as an overpayment, which is exactly backwards
              — the wage simply hasn't been posted yet. Shown on every month,
              because the balance above is lifetime, not period-scoped. */}
          {unaccrued.length > 0 && (
            <div className="-mx-5 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 pt-4 dark:border-gray-800 sm:-mx-6 sm:px-6">
              <div className="flex items-start gap-2.5">
                <LuTriangleAlert
                  size={16}
                  className="mt-0.5 shrink-0 text-warning-500"
                />
                <div>
                  <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-200">
                    {t("payroll.notAccruedTitle")} — {unaccruedLabel}
                  </p>
                  <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("payroll.notAccruedHint")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPreview(unaccrued[0])}
              >
                {t("payroll.runAccrual")}
              </Button>
            </div>
          )}

          {/* Auto-accrual: the durable fix for a month nobody closed. */}
          <div className="-mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 pt-4 dark:border-gray-800 sm:-mx-6 sm:px-6">
            <Switch
              label={t("payroll.autoAccrue")}
              defaultChecked={settings?.autoAccrue ?? false}
              onChange={toggleAutoAccrue}
            />
            <p className="text-theme-xs text-gray-400">
              {t("payroll.autoAccrueHint")}
            </p>
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
                {/* The month window: the selected month names the band, and
                    everything inside it is scoped to that month. OYLIK is the
                    live wage, BERILDI what's been handed out, QOLADI the
                    remainder — the three questions the owner actually asks.
                    The lifetime balance lives in the drawer, never here. */}
                <tr className="text-theme-xs uppercase tracking-wide text-gray-400">
                  <th />
                  <th
                    colSpan={3}
                    className={`px-3 pb-1 pt-3 text-center font-medium ${MONTH_BAND}`}
                  >
                    {monthLabel(period, locale)}
                  </th>
                  <th />
                </tr>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">{t("payroll.employee")}</th>
                  <th className={`px-3 py-3 text-right font-medium ${MONTH_BAND}`}>
                    {t("payroll.monthWage")}
                  </th>
                  <th className={`px-3 py-3 text-right font-medium ${MONTH_BAND}`}>
                    {t("payroll.periodPaid")}
                  </th>
                  <th className={`px-3 py-3 text-right font-medium ${MONTH_BAND}`}>
                    {t("payroll.remains")}
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
                          {/* The rate rides under the name ("kassir · 6 mln
                              /oy") — it is context, not a column: the OYLIK
                              column already carries it as this month's money. */}
                          <div className="text-theme-xs text-gray-400">
                            {[row.position, row.branchName, compactFormula(row)]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* OYLIK — alive: ledger truth once closed, live estimate
                        until then. A closed-but-unposted month still shows the
                        real figure, wearing "hisoblanmagan" as its state. */}
                    <td
                      className={`px-3 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-300 ${MONTH_BAND}`}
                    >
                      {(row.periodWage ?? row.periodAccrued) > 0 ? (
                        <>
                          {formatNumber(row.periodWage ?? row.periodAccrued)}
                          {periodClosed &&
                            !row.accrualPosted &&
                            row.salaryType !== "none" && (
                              <div className="text-theme-xs lowercase text-warning-600 dark:text-warning-400">
                                {t("payroll.notAccruedShort")}
                              </div>
                            )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className={`px-3 py-3.5 text-right tabular-nums text-gray-700 dark:text-gray-300 ${MONTH_BAND}`}
                    >
                      {row.periodPaid > 0 ? formatNumber(row.periodPaid) : "—"}
                    </td>
                    {/* QOLADI — direction is a word, not a sign: a plain dark
                        figure is "to pay", amber + "avans" is paid-ahead. An
                        open month's remainder is due at month end, and says so. */}
                    <td className={`px-3 py-3.5 text-right ${MONTH_BAND}`}>
                      {(() => {
                        const due = monthDue(row);
                        if (due === 0) {
                          return <span className="text-gray-400">—</span>;
                        }
                        return (
                          <>
                            <span
                              className={`font-semibold tabular-nums ${balanceCls(due)}`}
                            >
                              {formatNumber(Math.abs(due))}
                            </span>
                            {due < 0 ? (
                              <div className="text-theme-xs lowercase text-warning-600/80 dark:text-warning-400/80">
                                {t("payroll.entryTypes.advance")}
                              </div>
                            ) : !periodClosed ? (
                              <div className="text-theme-xs text-gray-400">
                                {t("payroll.atMonthEnd")}
                              </div>
                            ) : null}
                          </>
                        );
                      })()}
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
            {/* Balance hero: the LIFETIME figure — this is the settle-up
                surface, so the all-time remainder leads here (the table shows
                only the month). Magnitude + direction word, never a sign. */}
            <div>
              <p className="text-theme-xs font-medium uppercase tracking-wider text-gray-400">
                {t("payroll.balanceTotal")}
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
                  drawerRow.balance !== 0
                    ? balanceCls(drawerRow.balance)
                    : "text-gray-800 dark:text-white/90"
                }`}
              >
                {money(Math.abs(drawerRow.balance))}
              </p>
              {/* Paid-ahead is an avans, not an overpayment error — and when
                  months were never posted, say THAT, because the missing wage
                  is the real story behind the number. */}
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {drawerRow.balance === 0
                  ? t("payroll.settledUp")
                  : drawerRow.balance < 0
                    ? unaccrued.length > 0
                      ? `${t("payroll.advanceGiven")} · ${t("payroll.notAccruedTitle")} — ${unaccruedLabel}`
                      : t("payroll.advanceGiven")
                    : t("payroll.toPay")}
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
                            {/* Running remainder after this entry — magnitude
                                plus "avans" when paid-ahead, like the hero. */}
                            <p className="mt-0.5 text-theme-xs tabular-nums text-gray-400">
                              {formatNumber(Math.abs(Number(entry.balanceAfter)))}
                              {Number(entry.balanceAfter) < 0 && (
                                <span className="lowercase">
                                  {" "}
                                  {t("payroll.entryTypes.advance")}
                                </span>
                              )}
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
            {actionRow?.name} · {t("payroll.balanceTotal")}:{" "}
            <span className="font-medium tabular-nums">
              {money(Math.abs(actionRow?.balance ?? 0))}
              {(actionRow?.balance ?? 0) < 0 && (
                <span className="lowercase">
                  {" "}
                  ({t("payroll.entryTypes.advance")})
                </span>
              )}
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
