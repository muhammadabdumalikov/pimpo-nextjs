"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { LockIcon } from "@/icons/index";
import {
  getShiftReport,
  closeShift,
  type ReconRow,
  type Shift,
  type CashMovement,
} from "@/lib/api";
import { fmt, methodLabelKey } from "./kassaUtils";

const key = (r: ReconRow) => `${r.method}:${r.currency}`;

interface Props {
  shiftId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a change (movement added / shift closed) to refresh the list. */
  onChanged: () => void;
}

export default function ShiftModal({
  shiftId,
  isOpen,
  onClose,
  onChanged,
}: Props) {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [shift, setShift] = useState<Shift | null>(null);
  const [rows, setRows] = useState<ReconRow[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [usdRate, setUsdRate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const onError = useCallback(
    (message: string) => showToast("error", message, "Error"),
    [showToast],
  );

  const load = useCallback(async () => {
    if (!shiftId) return;
    const rep = await getShiftReport(shiftId);
    setShift(rep.shift);
    setRows(rep.reconciliation);
    setMovements(rep.movements);
    if (rep.shift.status === "closed" && rep.shift.reconciliation) {
      const c: Record<string, string> = {};
      for (const r of rep.shift.reconciliation) {
        if (r.counted != null)
          c[`${r.method}:${r.currency}`] = String(r.counted);
      }
      setCounted(c);
    }
  }, [shiftId]);

  useEffect(() => {
    if (!isOpen || !shiftId) return;
    setLoading(true);
    setCounted({});
    setUsdRate("");
    setNote("");
    (async () => {
      try {
        await load();
      } catch (e) {
        onError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, shiftId, load, onError]);

  const closed = shift?.status === "closed";
  const hasUsd = useMemo(() => rows.some((r) => r.currency === "USD"), [rows]);

  const digits = (s: string) => s.replace(/\D/g, "");
  const group = (s: string) =>
    s === "" ? "" : new Intl.NumberFormat("uz-UZ").format(Number(s));

  const diffOf = (r: ReconRow): number | null => {
    const raw = counted[key(r)];
    if (raw === undefined || raw === "") return null;
    return Number(digits(raw)) - r.expected;
  };

  const totals = useMemo(() => {
    let inSum = 0,
      outSum = 0,
      expSum = 0,
      cntSum = 0;
    let any = false;
    for (const r of rows) {
      inSum += r.in;
      outSum += r.out;
      expSum += r.expected;
      const raw = counted[key(r)];
      if (raw !== undefined && raw !== "") {
        cntSum += Number(digits(raw));
        any = true;
      }
    }
    return {
      inSum,
      outSum,
      expSum,
      cntSum: any ? cntSum : null,
      diffSum: any ? cntSum - expSum : null,
    };
  }, [rows, counted]);

  const diffClass = (d: number | null) =>
    d == null
      ? "text-gray-400"
      : d < 0
        ? "text-error-500"
        : d > 0
          ? "text-warning-500"
          : "text-success-500";

  const handleClose = async () => {
    if (!shiftId) return;
    setSubmitting(true);
    try {
      const payload = rows
        .filter((r) => counted[key(r)] !== undefined && counted[key(r)] !== "")
        .map((r) => ({
          method: r.method,
          currency: r.currency,
          amount: Number(digits(counted[key(r)])),
        }));
      await closeShift(shiftId, {
        counted: payload,
        usdRate: usdRate ? Number(digits(usdRate)) : undefined,
        note: note.trim() || undefined,
      });
      showToast("success", t("kassa.closeShift"), "Success");
      onChanged();
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      widthClass="max-w-6xl"
      title={
        <span className="flex items-center gap-2">
          {shift && (
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                closed ? "bg-gray-400" : "bg-success-500"
              }`}
            />
          )}
          {shift?.registerName ?? t("kassa.closeShift")}
        </span>
      }
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t("kassa.cancel")}
          </Button>
          {shift && !closed && (
            <Button
              startIcon={<LockIcon className="h-5 w-5" />}
              onClick={handleClose}
              disabled={submitting}
            >
              {t("kassa.closeShift")}
            </Button>
          )}
        </div>
      }
    >
      {loading || !shift ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Opened / closed by */}
          <div>
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t("kassa.openedBy")}: {shift.openedByCashierName ?? "—"} ·{" "}
              {new Date(shift.openedAt).toLocaleString("uz-UZ")}
            </p>
            {shift.closedAt && (
              <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
                {t("kassa.closedBy")}: {shift.closedByCashierName ?? "—"} ·{" "}
                {new Date(shift.closedAt).toLocaleString("uz-UZ")}
              </p>
            )}
          </div>

          {/* Reconciliation grid */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full min-w-[52rem] table-fixed whitespace-nowrap text-left text-sm">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-4 py-3 font-medium">{t("kassa.method")}</th>
                  <th className="px-4 py-3 font-medium">
                    {t("kassa.currency")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("kassa.in")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("kassa.out")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("kassa.expected")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("kassa.counted")}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {t("kassa.difference")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = diffOf(r);
                  return (
                    <tr
                      key={key(r)}
                      className="border-b border-gray-100 dark:border-gray-800/60"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                        {t(methodLabelKey(r.method))}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {r.currency}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmt(r.in)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmt(r.out)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmt(r.expected)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {closed ? (
                          <span className="text-gray-700 dark:text-gray-300">
                            {counted[key(r)] ? fmt(counted[key(r)]) : "—"}
                          </span>
                        ) : (
                          <input
                            inputMode="numeric"
                            value={group(counted[key(r)] ?? "")}
                            onChange={(e) =>
                              setCounted((c) => ({
                                ...c,
                                [key(r)]: digits(e.target.value),
                              }))
                            }
                            placeholder="0"
                            className="h-10 w-full max-w-[10rem] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-right text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          />
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${diffClass(d)}`}
                      >
                        {d == null ? "—" : fmt(d)}
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-brand-500/[0.06] font-semibold dark:bg-brand-500/10">
                  <td
                    className="px-4 py-3 text-brand-600 dark:text-brand-400"
                    colSpan={2}
                  >
                    {t("kassa.total")}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 dark:text-white/90">
                    {fmt(totals.inSum)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 dark:text-white/90">
                    {fmt(totals.outSum)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 dark:text-white/90">
                    {fmt(totals.expSum)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 dark:text-white/90">
                    {totals.cntSum == null ? "—" : fmt(totals.cntSum)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${diffClass(totals.diffSum)}`}
                  >
                    {totals.diffSum == null ? "—" : fmt(totals.diffSum)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* USD rate + note (open only) */}
          {!closed && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {hasUsd && (
                <div>
                  <Label>{t("kassa.usdRate")}</Label>
                  <Input
                    inputMode="numeric"
                    value={group(usdRate)}
                    onChange={(e) => setUsdRate(digits(e.target.value))}
                    placeholder="12500"
                  />
                </div>
              )}
              <div className={hasUsd ? "" : "sm:col-span-2"}>
                <Label>{t("kassa.note")}</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Movements */}
          {movements.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full min-w-[32rem] whitespace-nowrap text-left text-sm">
                <tbody>
                  {movements.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-theme-xs font-medium ${
                            m.type === "in"
                              ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                              : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
                          }`}
                        >
                          {m.type === "in"
                            ? t("kassa.cashIn")
                            : t("kassa.cashOut")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {m.categoryName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {m.reason ?? ""}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                        {m.type === "out" ? "−" : "+"}
                        {fmt(m.amount)} {m.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}
    </Drawer>
  );
}
