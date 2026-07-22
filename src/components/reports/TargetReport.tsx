"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import SelectField from "../form/SelectField";
import ReportShell, { ReportKpi, ReportFilterField } from "./ReportShell";
import { getTargetProgress, setMonthlyTarget, type TargetProgress } from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/reportFormat";
import { formatNumberInput, digitsOnly } from "@/lib/number";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (m: string) => m.split("-").reverse().join(".");

export default function TargetReport() {
  const { t } = useTranslations();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [data, setData] = useState<TargetProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const som = t("reportsPage.som");
  const money = (n: number) => formatMoney(n, som);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const v = monthKey(d);
      return { value: v, label: monthLabel(v) };
    });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const d = await getTargetProgress(month);
        if (active) {
          setData(d);
          setDraft(d.revenueTarget ? String(Math.round(d.revenueTarget)) : "");
        }
      } catch (e) {
        if (active) setError((e as Error)?.message || "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [month]);

  const handleSave = async () => {
    const value = Number(digitsOnly(draft));
    if (!Number.isFinite(value) || value < 0) return;
    try {
      setSaving(true);
      setError("");
      const d = await setMonthlyTarget(value, month);
      setData(d);
      setDraft(d.revenueTarget ? String(Math.round(d.revenueTarget)) : "");
    } catch (e) {
      setError((e as Error)?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const hasTarget = !!data && data.revenueTarget > 0;
  const achieved = data?.achievedPct ?? 0;
  const fillPct = Math.max(0, Math.min(100, achieved));
  const pacePct = Math.max(0, Math.min(100, data?.expectedPct ?? 0));
  const onTrack = data?.onTrack ?? true;
  const fillColor = !hasTarget
    ? "bg-gray-300 dark:bg-gray-600"
    : onTrack
      ? "bg-success-500"
      : "bg-amber-500";

  const kpis = data ? (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <ReportKpi label={t("reportsPage.plan")} value={hasTarget ? money(data.revenueTarget) : "—"} />
      <ReportKpi label={t("reportsPage.fact")} value={money(data.actual)} tone="success" />
      <ReportKpi
        label={t("reportsPage.achieved")}
        value={hasTarget ? `${achieved.toFixed(1)}%` : "—"}
        tone={hasTarget ? (onTrack ? "success" : "error") : "default"}
      />
      <ReportKpi
        label={t("reportsPage.projected")}
        value={data.isCurrentMonth ? money(data.projected) : "—"}
      />
    </div>
  ) : null;

  return (
    <ReportShell
      title={t("sidebar.reportsTarget")}
      filterSummary={`${t("reportsPage.month")}: ${monthLabel(month)}`}
      filters={
        <ReportFilterField label={t("reportsPage.month")}>
          <SelectField className="min-w-[160px]" value={month} onChange={setMonth} options={months} />
        </ReportFilterField>
      }
      kpis={kpis}
    >
      {loading ? (
        <div className="py-10 text-center text-gray-500 dark:text-gray-400">{t("reportsPage.loading")}</div>
      ) : error ? (
        <div className="py-10 text-center text-error-500">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          {/* Progress bar with the expected-pace marker. */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {money(data.actual)}{hasTarget ? ` / ${money(data.revenueTarget)}` : ""}
              </span>
              {hasTarget && data.isCurrentMonth && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${onTrack ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"}`}>
                  {onTrack ? t("reportsPage.onTrackYes") : t("reportsPage.onTrackNo")}
                </span>
              )}
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
              <div className={`h-full rounded-full transition-all ${fillColor}`} style={{ width: `${fillPct}%` }} />
              {/* Expected-pace marker (where we "should" be today). */}
              {hasTarget && data.isCurrentMonth && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-gray-700 dark:bg-white/70"
                  style={{ left: `${pacePct}%` }}
                  title={`${t("reportsPage.expectedPace")}: ${data.expectedPct.toFixed(0)}%`}
                />
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{hasTarget ? `${achieved.toFixed(1)}%` : t("reportsPage.noTarget")}</span>
              {hasTarget && (
                <span>{t("reportsPage.remainingToTarget")}: {money(data.remaining)}</span>
              )}
            </div>
            {data.isCurrentMonth && (
              <p className="mt-2 text-xs text-gray-400">
                {t("reportsPage.dayOfMonth")}: {formatNumber(data.daysElapsed)} / {formatNumber(data.daysInMonth)}
              </p>
            )}
          </div>

          {/* Target editor */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t("reportsPage.setTarget")}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberInput(draft)}
                  onChange={(e) => setDraft(digitsOnly(e.target.value))}
                  placeholder={t("reportsPage.targetPlaceholder")}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-12 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">{som}</span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? t("reportsPage.loading") : t("reportsPage.saveTarget")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ReportShell>
  );
}
