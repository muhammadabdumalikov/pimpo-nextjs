"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon } from "@/icons/index";
import {
  getRegisters,
  getCashCategories,
  getCurrentShift,
  getShiftReport,
  type CashRegister,
  type CashCategory,
  type Shift,
  type CashMovement,
  type ReconRow,
} from "@/lib/api";
import { fmt } from "./kassaUtils";
import CashMovementModal from "./CashMovementModal";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

function SummaryCard({
  title,
  cash,
  cashless,
  t,
}: {
  title: string;
  cash: number;
  cashless: number;
  t: (k: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="mb-2 text-theme-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <div className="flex items-baseline justify-between">
        <span className="text-theme-xs text-gray-400">{t("kassa.cash")}</span>
        <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {fmt(cash)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-theme-xs text-gray-400">
          {t("kassa.cashless")}
        </span>
        <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {fmt(cashless)}
        </span>
      </div>
    </div>
  );
}

export default function CashOperations() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [shift, setShift] = useState<Shift | null>(null);
  const [rows, setRows] = useState<ReconRow[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [moveModal, setMoveModal] = useState(false);

  const onError = useCallback(
    (message: string) => showToast("error", message, "Error"),
    [showToast],
  );

  const loadForRegister = useCallback(async (registerId: string) => {
    const cur = await getCurrentShift(registerId);
    if (cur) {
      const rep = await getShiftReport(cur.id);
      setShift(cur);
      setRows(rep.reconciliation);
      setMovements(rep.movements);
    } else {
      setShift(null);
      setRows([]);
      setMovements([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [regs, cats] = await Promise.all([
          getRegisters(),
          getCashCategories(),
        ]);
        setRegisters(regs);
        setCategories(cats);
        if (regs.length > 0) {
          setSelectedId(regs[0].id);
          await loadForRegister(regs[0].id);
        }
      } catch (e) {
        onError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadForRegister, onError]);

  const selectRegister = async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    try {
      await loadForRegister(id);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    if (selectedId) await loadForRegister(selectedId);
  };

  const summary = useMemo(() => {
    const cash = rows.find((r) => r.method === "cash" && r.currency === "UZS");
    const card = rows.find((r) => r.method === "card" && r.currency === "UZS");
    const openingFloat = Number(shift?.openingFloat ?? 0);
    return {
      received: { cash: cash?.in ?? 0, cashless: card?.in ?? 0 },
      spent: { cash: cash?.out ?? 0, cashless: card?.out ?? 0 },
      opening: { cash: openingFloat, cashless: 0 },
      current: { cash: cash?.expected ?? 0, cashless: card?.expected ?? 0 },
    };
  }, [rows, shift]);

  const dt = (s: string) => new Date(s).toLocaleString("uz-UZ");

  return (
    <div className="space-y-6">
      {/* Header: register picker + add */}
      <div className={CARD}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>{t("kassa.register")}</Label>
              <SelectField
                className="min-w-[13rem]"
                value={selectedId}
                onChange={selectRegister}
                placeholder={t("kassa.noRegisters")}
                options={registers.map((r) => ({
                  value: r.id,
                  label: r.name,
                }))}
              />
            </div>
            <Link
              href="/kassa"
              className="rounded-lg px-3 py-2.5 text-theme-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
            >
              {t("kassa.registers")}
            </Link>
          </div>
          <Button
            startIcon={<PlusIcon />}
            onClick={() => setMoveModal(true)}
            disabled={!shift}
          >
            {t("kassa.add")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : !shift ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="mb-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">
            {t("kassa.noOpenShift")}
          </p>
          <Link href="/kassa">
            <Button startIcon={<PlusIcon />}>{t("kassa.openShift")}</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title={t("kassa.received")}
              cash={summary.received.cash}
              cashless={summary.received.cashless}
              t={t}
            />
            <SummaryCard
              title={t("kassa.spent")}
              cash={summary.spent.cash}
              cashless={summary.spent.cashless}
              t={t}
            />
            <SummaryCard
              title={t("kassa.opening")}
              cash={summary.opening.cash}
              cashless={summary.opening.cashless}
              t={t}
            />
            <SummaryCard
              title={t("kassa.current")}
              cash={summary.current.cash}
              cashless={summary.current.cashless}
              t={t}
            />
          </div>

          {/* Operations table */}
          <div className={CARD}>
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              {t("kassa.operations")}
            </h3>
            {movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 dark:border-gray-800">
                <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t("kassa.empty")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] whitespace-nowrap text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                      <th className="px-3 py-3 font-medium">
                        {t("kassa.openedAt")}
                      </th>
                      <th className="px-3 py-3 font-medium">
                        {t("kassa.method")}
                      </th>
                      <th className="px-3 py-3 font-medium">
                        {t("kassa.category")}
                      </th>
                      <th className="px-3 py-3 font-medium">
                        {t("kassa.openedBy")}
                      </th>
                      <th className="px-3 py-3 font-medium">
                        {t("kassa.reason")}
                      </th>
                      <th className="px-3 py-3 text-right font-medium">
                        {t("kassa.amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-gray-100 dark:border-gray-800/60"
                      >
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                          {dt(m.createdAt)}
                        </td>
                        <td className="px-3 py-3">
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
                          <span className="ml-2 text-theme-xs text-gray-400">
                            {m.isCash ? t("kassa.cash") : t("kassa.cashless")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                          {m.categoryName ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                          {m.cashierName ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                          {m.reason ?? ""}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-medium ${
                            m.type === "in"
                              ? "text-success-600"
                              : "text-error-500"
                          }`}
                        >
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
        </>
      )}

      {shift && (
        <CashMovementModal
          isOpen={moveModal}
          onClose={() => setMoveModal(false)}
          shiftId={shift.id}
          categories={categories}
          onAdded={() => {
            showToast("success", t("kassa.add"), "Success");
            reload();
          }}
          onError={onError}
        />
      )}
    </div>
  );
}
