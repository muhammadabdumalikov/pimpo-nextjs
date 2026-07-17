"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon } from "@/icons/index";
import {
  getRegisters,
  getShifts,
  type CashRegister,
  type Shift,
} from "@/lib/api";
import { fmt } from "./kassaUtils";
import OpenShiftModal from "./OpenShiftModal";
import ShiftModal from "./ShiftModal";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

const PAGE_SIZE = 50;

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Most recent first (open shifts, being newest, land at the top).
const sortByOpened = (list: Shift[]) =>
  [...list].sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));

export default function KassaShifts() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openShiftDetail = (id: string) => {
    setActiveShiftId(id);
    setDetailOpen(true);
  };

  const onError = useCallback(
    (message: string) => showToast("error", message, "Error"),
    [showToast],
  );

  const load = useCallback(async () => {
    const [regs, res] = await Promise.all([
      getRegisters(),
      getShifts({ page: 1, limit: PAGE_SIZE }),
    ]);
    setRegisters(regs);
    // Grouped by day in the list; most recent first.
    setShifts(sortByOpened(res.shifts));
    setTotal(res.total);
    setPage(1);
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await getShifts({ page: next, limit: PAGE_SIZE });
      setShifts((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return sortByOpened([
          ...prev,
          ...res.shifts.filter((s) => !seen.has(s.id)),
        ]);
      });
      setTotal(res.total);
      setPage(next);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e) {
        onError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [load, onError]);

  const openRegisterIds = shifts
    .filter((s) => s.status === "open")
    .map((s) => s.registerId);

  const dt = (s: string) => new Date(s).toLocaleString("uz-UZ");

  // A day separator label: "Bugun" / "Kecha" / the date (like Barcha sotuvlar).
  const dayLabel = useCallback(
    (ymd: string) => {
      const todayYmd = toYmd(new Date());
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yestYmd = toYmd(y);
      if (ymd === todayYmd) return t("sales.today") || "Bugun";
      if (ymd === yestYmd) return t("sales.yesterday") || "Kecha";
      const [yy, mm, dd] = ymd.split("-");
      return `${dd}.${mm}.${yy}`;
    },
    [t],
  );

  // Group shifts by the calendar day they were opened (keyed by YMD), keeping
  // the most-recent-first order for the dashed day separators.
  const groups = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const key = toYmd(new Date(s.openedAt));
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return Array.from(map.entries());
  }, [shifts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={CARD}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
              {t("kassa.title")}
            </h3>
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t("kassa.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/kassa/registers"
              className="rounded-lg px-3 py-2 text-theme-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
            >
              {t("kassa.registers")}
            </Link>
            <Button
              size="sm"
              startIcon={<PlusIcon />}
              onClick={() => setOpenModal(true)}
            >
              {t("kassa.openShift")}
            </Button>
          </div>
        </div>
      </div>

      {/* Shifts table */}
      <div className={CARD}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          </div>
        ) : shifts.length > 0 ? (
          <>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] whitespace-nowrap text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">{t("kassa.register")}</th>
                  <th className="px-3 py-3 font-medium">{t("kassa.method")}</th>
                  <th className="px-3 py-3 font-medium">{t("kassa.openedAt")}</th>
                  <th className="px-3 py-3 font-medium">{t("kassa.closedAt")}</th>
                  <th className="px-3 py-3 text-right font-medium">
                    {t("kassa.openingFloat")}
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    {t("kassa.difference")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map(([day, list]) => (
                  <React.Fragment key={day}>
                    <tr>
                      <td colSpan={6} className="px-3 pb-1 pt-4">
                        <div className="relative flex items-center">
                          <span className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
                          <span className="mx-3 rounded-full border border-gray-200 bg-white px-4 py-1 text-theme-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                            {dayLabel(day)}
                          </span>
                          <span className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
                        </div>
                      </td>
                    </tr>
                    {list.map((s) => {
                      const isOpen = s.status === "open";
                      const diff =
                        s.difference != null ? Number(s.difference) : null;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => openShiftDetail(s.id)}
                          className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.02]"
                        >
                      <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                        {s.registerName ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-theme-xs font-medium ${
                            isOpen
                              ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                              : "bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-400"
                          }`}
                        >
                          {isOpen
                            ? t("kassa.openStatus")
                            : t("kassa.closedStatus")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                        {dt(s.openedAt)}
                      </td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                        {s.closedAt ? dt(s.closedAt) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">
                        {fmt(s.openingFloat)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-medium ${
                          diff == null
                            ? "text-gray-400"
                            : diff < 0
                              ? "text-error-500"
                              : diff > 0
                                ? "text-warning-500"
                                : "text-success-500"
                        }`}
                      >
                        {diff == null ? "—" : fmt(diff)}
                      </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            </div>
            {shifts.length < total && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {loadingMore
                  ? "..."
                  : `${t("sales.loadMore") || "Ko'proq yuklash"} (${shifts.length}/${total})`}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
            <p className="mb-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">
              {t("kassa.noOpenShift")}
            </p>
            <Button
              startIcon={<PlusIcon />}
              onClick={() => setOpenModal(true)}
              disabled={registers.length === 0}
            >
              {t("kassa.openShift")}
            </Button>
          </div>
        )}
      </div>

      <OpenShiftModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        registers={registers}
        openRegisterIds={openRegisterIds}
        onOpened={(shift) => {
          showToast("success", t("kassa.openShift"), "Success");
          load();
          openShiftDetail(shift.id);
        }}
        onError={onError}
      />

      <ShiftModal
        shiftId={activeShiftId}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onChanged={load}
      />
    </div>
  );
}
