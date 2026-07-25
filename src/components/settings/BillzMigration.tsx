"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LuCheck,
  LuCircleCheck,
  LuCircleAlert,
  LuPackage,
  LuUsers,
  LuImage,
  LuPause,
  LuPlay,
  LuRefreshCw,
  LuScrollText,
  LuHourglass,
  LuEye,
} from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Checkbox from "@/components/form/input/Checkbox";
import BillzImportDrawer from "@/components/settings/BillzImportDrawer";
import BillzProbeDrawer from "@/components/settings/BillzProbeDrawer";
import {
  getBillzStatus,
  verifyBillzToken,
  startBillzImport,
  getBillzImportStatus,
  pauseBillzImport,
  resumeBillzImport,
  cancelBillzImport,
  type BillzImportEntity,
  type BillzImportJob,
  type BillzImportPhase,
  type BillzImportStatus,
} from "@/lib/api";

// MG7 wizard (MIGRATSIYA.md). Three views — connect, select, import — with ONE
// progress representation during import (status line + hero % + slim entity
// rows). The job runs on the backend's two-phase queue (fetch → load), polled
// while queued/running/paused.

type Step = "connect" | "select" | "import";

const ACTIVE_STATUSES: BillzImportJob["status"][] = [
  "queued",
  "running",
  "paused",
];

const ENTITIES: {
  id: BillzImportEntity;
  icon: React.ReactNode;
  labelKey: string;
  descKey: string;
}[] = [
  {
    id: "products",
    icon: <LuPackage className="h-4 w-4" />,
    labelKey: "integrations.billz.entityProducts",
    descKey: "integrations.billz.entityProductsDesc",
  },
  {
    id: "customers",
    icon: <LuUsers className="h-4 w-4" />,
    labelKey: "integrations.billz.entityCustomers",
    descKey: "integrations.billz.entityCustomersDesc",
  },
  {
    id: "images",
    icon: <LuImage className="h-4 w-4" />,
    labelKey: "integrations.billz.entityImages",
    descKey: "integrations.billz.entityImagesDesc",
  },
];

const nf = (n: number) => n.toLocaleString("ru-RU");

function formatEta(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}:${String(m).padStart(2, "0")}:00`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface PhaseSum {
  done: number;
  failed: number;
  total: number | null;
}

// Aggregate one phase's counters across a job's entities.
function sumPhase(
  entities: BillzImportEntity[],
  counters: BillzImportJob["counters"],
  phase: BillzImportPhase,
): PhaseSum {
  return entities.reduce<PhaseSum>(
    (acc, e) => {
      const c = counters[e]?.[phase];
      if (!c) return acc;
      return {
        done: acc.done + c.done,
        failed: acc.failed + c.failed,
        total:
          acc.total === null || c.total === null ? null : acc.total + c.total,
      };
    },
    { done: 0, failed: 0, total: 0 },
  );
}

/** Live pulse dot (brand) shown next to the running status line. */
function PulseDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
    </span>
  );
}

export default function BillzMigration() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("connect");
  const [bootLoading, setBootLoading] = useState(true);

  // Connect
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Select
  const [selected, setSelected] = useState<Record<BillzImportEntity, boolean>>({
    products: true,
    customers: true,
    images: false,
  });
  // Products sub-option: also create BiLLZ categories and link products to them
  // (off = products land alone, categories untouched).
  const [withCategories, setWithCategories] = useState(true);
  const [starting, setStarting] = useState(false);

  // Import (server-driven)
  const [importStatus, setImportStatus] = useState<BillzImportStatus | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [probeOpen, setProbeOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const job = importStatus?.job ?? null;
  const jobActive = !!job && ACTIVE_STATUSES.includes(job.status);

  // Bootstrap: resume an active job directly, else land on select if connected.
  useEffect(() => {
    let active = true;
    (async () => {
      let imp: BillzImportStatus | null = null;
      try {
        imp = await getBillzImportStatus();
        if (active) setImportStatus(imp);
      } catch {
        // Backend without import endpoints yet — connect flow still works.
      }
      try {
        if (imp?.job && ACTIVE_STATUSES.includes(imp.job.status)) {
          if (active) setStep("import");
        } else {
          const conn = await getBillzStatus();
          if (active && conn.connected) setStep("select");
        }
      } catch {
        // Start from the connect step.
      } finally {
        if (active) setBootLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Live polling while the job is queued/running/paused.
  useEffect(() => {
    if (step !== "import" || !jobActive) return;
    const timer = setInterval(async () => {
      try {
        setImportStatus(await getBillzImportStatus());
      } catch {
        // Transient network error — keep the last known state.
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [step, jobActive]);

  const handleVerify = async () => {
    setVerifying(true);
    setTokenError(null);
    try {
      await verifyBillzToken(token.trim());
      setStep("select");
    } catch (e) {
      // makeApiError already localized the code (BILLZ_TOKEN_INVALID etc.).
      setTokenError(
        (e as Error).message || t("integrations.billz.tokenInvalid"),
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleStart = async () => {
    const entities = ENTITIES.filter((e) => selected[e.id]).map((e) => e.id);
    if (entities.length === 0) return;
    setStarting(true);
    try {
      await startBillzImport(entities, withCategories);
      setImportStatus(await getBillzImportStatus());
      setStep("import");
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setStarting(false);
    }
  };

  const runAction = async (
    action: () => Promise<{ job: BillzImportJob }>,
  ): Promise<void> => {
    setActionBusy(true);
    try {
      await action();
      setImportStatus(await getBillzImportStatus());
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setActionBusy(false);
    }
  };

  const confirmCancel = async () => {
    setCancelOpen(false);
    await runAction(cancelBillzImport);
  };

  // ── Derived progress (current phase) ───────────────────────────────────────
  const counters = job?.counters ?? {};
  const jobEntities = job?.entities ?? [];
  const phase: BillzImportPhase = job?.phase ?? "fetch";
  const sums = sumPhase(jobEntities, counters, phase);
  const loadSums = sumPhase(jobEntities, counters, "load");
  const processed = sums.done + sums.failed;
  const overallPct =
    sums.total && sums.total > 0
      ? Math.min(100, Math.round((processed / sums.total) * 100))
      : null;

  // Client-side ETA from an exponentially-smoothed processing rate; reset on a
  // phase change so the load phase doesn't inherit the fetch rate.
  const rateRef = useRef<{
    t: number;
    processed: number;
    rate: number;
    phase: BillzImportPhase;
  } | null>(null);
  useEffect(() => {
    if (!job || job.status !== "running") {
      rateRef.current = null;
      return;
    }
    const now = Date.now();
    const prev = rateRef.current;
    if (prev && prev.phase === phase && now > prev.t) {
      const inst = ((processed - prev.processed) * 1000) / (now - prev.t);
      const rate = prev.rate > 0 ? 0.3 * inst + 0.7 * prev.rate : inst;
      rateRef.current = { t: now, processed, rate, phase };
    } else if (!prev || prev.phase !== phase) {
      rateRef.current = { t: now, processed, rate: 0, phase };
    }
  }, [job, processed, phase]);
  const rate = rateRef.current?.rate ?? 0;
  const etaSeconds =
    job?.status === "running" && sums.total && rate > 0.05
      ? (sums.total - processed) / rate
      : null;

  const terminal =
    job &&
    (job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled");

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("integrations.billz.title")}
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("integrations.billz.subtitle")}
        </p>
      </div>

      {bootLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : (
        <>
          {/* ── Connect ─────────────────────────────────────────────────── */}
          {step === "connect" && (
            <div className="max-w-md">
              <Label htmlFor="billz-token">
                {t("integrations.billz.tokenLabel")}
              </Label>
              <Input
                id="billz-token"
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setTokenError(null);
                }}
                placeholder={t("integrations.billz.tokenPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && token.trim() && !verifying)
                    handleVerify();
                }}
                error={!!tokenError}
                hint={tokenError ?? t("integrations.billz.tokenHint")}
                disabled={verifying}
              />
              <div className="mt-5">
                <Button
                  size="sm"
                  onClick={handleVerify}
                  disabled={verifying || !token.trim()}
                >
                  {verifying && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {verifying
                    ? t("integrations.billz.verifying")
                    : t("integrations.billz.verify")}
                </Button>
              </div>
            </div>
          )}

          {/* ── Select ──────────────────────────────────────────────────── */}
          {step === "select" && (
            <div className="max-w-xl">
              <p className="mb-5 flex items-center gap-1.5 text-theme-sm font-medium text-success-600 dark:text-success-500">
                <LuCircleCheck className="h-4 w-4" />
                {t("integrations.billz.connected")}
              </p>

              <h4 className="mb-3 font-semibold text-gray-800 dark:text-white/90">
                {t("integrations.billz.selectTitle")}
              </h4>
              <div className="space-y-2.5">
                {ENTITIES.map((e) => (
                  <div
                    key={e.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      selected[e.id]
                        ? "border-brand-300 dark:border-brand-500/40"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-3.5">
                      <Checkbox
                        checked={selected[e.id]}
                        onChange={(checked) =>
                          setSelected((prev) => ({ ...prev, [e.id]: checked }))
                        }
                      />
                      <span className="-mt-0.5 min-w-0">
                        <span className="flex items-center gap-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {e.icon}
                          {t(e.labelKey)}
                        </span>
                        <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                          {t(e.descKey)}
                        </span>
                      </span>
                    </label>
                    {/* Products sub-option: with or without categories */}
                    {e.id === "products" && selected.products && (
                      <label className="mt-3 flex cursor-pointer items-center gap-3 border-t border-gray-100 pl-8 pt-3 dark:border-gray-800">
                        <Checkbox
                          checked={withCategories}
                          onChange={setWithCategories}
                        />
                        <span className="min-w-0">
                          <span className="block text-theme-sm text-gray-700 dark:text-gray-300">
                            {t("integrations.billz.withCategories")}
                          </span>
                          <span className="block text-theme-xs text-gray-400 dark:text-gray-500">
                            {withCategories
                              ? t("integrations.billz.withCategoriesOnDesc")
                              : t("integrations.billz.withCategoriesOffDesc")}
                          </span>
                        </span>
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-4 flex items-start gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
                <LuHourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("integrations.billz.queueExplain")}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                <Button
                  size="sm"
                  onClick={handleStart}
                  disabled={starting || ENTITIES.every((e) => !selected[e.id])}
                >
                  {starting && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {t("integrations.billz.startImport")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setProbeOpen(true)}
                  startIcon={<LuEye className="h-4 w-4" />}
                >
                  {t("integrations.billz.probe.button")}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("connect")}
                  className="text-theme-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                >
                  {t("integrations.billz.changeToken")}
                </button>
                {job && !jobActive && (
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="inline-flex items-center gap-1.5 text-theme-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                  >
                    <LuScrollText className="h-4 w-4" />
                    {t("integrations.billz.viewLog")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Import ──────────────────────────────────────────────────── */}
          {step === "import" && job && (
            <div className="max-w-xl">
              {/* Queued — waiting for the shared pipe */}
              {job.status === "queued" && (
                <div className="flex flex-col items-center py-8 text-center">
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                    <LuHourglass className="h-5 w-5" />
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/20 [animation-duration:2.5s]" />
                  </span>
                  <h4 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
                    {phase === "load"
                      ? t("integrations.billz.loadQueuedTitle")
                      : t("integrations.billz.queuedTitle")}
                  </h4>
                  {importStatus?.queuePosition != null && (
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-800 dark:text-white/90">
                      {importStatus.queuePosition}
                      <span className="text-theme-sm font-medium text-gray-400 dark:text-gray-500">
                        {" "}
                        / {importStatus.queueLength}
                      </span>
                    </p>
                  )}
                  <p className="mt-3 max-w-sm text-theme-sm text-gray-500 dark:text-gray-400">
                    {phase === "load"
                      ? t("integrations.billz.loadQueuedHint")
                      : t("integrations.billz.queueExplain")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-5"
                    onClick={() => setCancelOpen(true)}
                    disabled={actionBusy}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              )}

              {/* Running / paused — the one progress view */}
              {(job.status === "running" || job.status === "paused") && (
                <>
                  {/* Status line: what's happening + which of the 2 phases */}
                  <p className="flex items-center gap-2 text-theme-sm font-medium text-gray-500 dark:text-gray-400">
                    {job.status === "running" ? (
                      <PulseDot />
                    ) : (
                      <LuPause className="h-4 w-4 text-warning-500" />
                    )}
                    {job.status === "paused"
                      ? t("integrations.billz.pausedTitle")
                      : phase === "fetch"
                        ? t("integrations.billz.fetchRunning")
                        : t("integrations.billz.loadRunning")}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs tabular-nums text-gray-500 dark:bg-white/5 dark:text-gray-400">
                      {phase === "fetch" ? "1/2" : "2/2"}
                    </span>
                  </p>

                  {/* Hero: % (or running count) + the numbers that matter */}
                  <div className="mt-2 flex items-end justify-between gap-4">
                    <p className="text-4xl font-semibold tabular-nums tracking-tight text-gray-800 dark:text-white/90">
                      {overallPct !== null ? `${overallPct}%` : nf(processed)}
                      {overallPct === null && (
                        <span className="ml-2 text-theme-sm font-medium text-gray-400">
                          {t("integrations.billz.recordsLabel")}
                        </span>
                      )}
                    </p>
                    <div className="pb-1 text-right text-theme-xs text-gray-400 dark:text-gray-500">
                      {sums.total !== null && (
                        <p className="tabular-nums text-theme-sm text-gray-500 dark:text-gray-400">
                          {nf(processed)} / {nf(sums.total)}
                        </p>
                      )}
                      {sums.failed > 0 && (
                        <p className="tabular-nums text-error-500">
                          {nf(sums.failed)} {t("integrations.billz.failedLabel")}
                        </p>
                      )}
                      {etaSeconds !== null && (
                        <p className="tabular-nums">~{formatEta(etaSeconds)}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                    {overallPct !== null ? (
                      <div
                        className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out"
                        style={{ width: `${overallPct}%` }}
                      />
                    ) : (
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-400/70" />
                    )}
                  </div>

                  {/* Entity rows — slim, no boxes; the current one carries the accent */}
                  {jobEntities.length > 1 && (
                    <div className="mt-6 space-y-4">
                      {jobEntities.map((id) => {
                        const meta = ENTITIES.find((e) => e.id === id);
                        const c = counters[id]?.[phase];
                        if (!meta || !c) return null;
                        const laneProcessed = c.done + c.failed;
                        const isCurrent =
                          job.currentEntity === id && job.status === "running";
                        const finished =
                          c.total !== null && laneProcessed >= c.total;
                        const waiting = laneProcessed === 0 && !isCurrent;
                        const lanePct =
                          c.total && c.total > 0
                            ? Math.min(100, (laneProcessed / c.total) * 100)
                            : null;
                        return (
                          <div key={id}>
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className={`flex items-center gap-2 text-theme-sm font-medium ${
                                  isCurrent
                                    ? "text-brand-600 dark:text-brand-400"
                                    : waiting
                                      ? "text-gray-400 dark:text-gray-500"
                                      : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {meta.icon}
                                {t(meta.labelKey)}
                                {isCurrent && <PulseDot className="scale-75" />}
                              </span>
                              <span className="text-theme-xs tabular-nums text-gray-500 dark:text-gray-400">
                                {finished ? (
                                  <span className="inline-flex items-center gap-1 font-medium text-success-600 dark:text-success-500">
                                    <LuCheck className="h-3.5 w-3.5" />
                                    {nf(c.done)}
                                  </span>
                                ) : waiting ? (
                                  t("integrations.billz.laneWaiting")
                                ) : c.total !== null ? (
                                  `${nf(laneProcessed)} / ${nf(c.total)}`
                                ) : (
                                  nf(laneProcessed)
                                )}
                              </span>
                            </div>
                            {!waiting && (
                              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                                {lanePct !== null ? (
                                  <div
                                    className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                                      finished
                                        ? "bg-success-500"
                                        : "bg-brand-500"
                                    }`}
                                    style={{ width: `${lanePct}%` }}
                                  />
                                ) : (
                                  <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-400/70" />
                                )}
                              </div>
                            )}
                            {c.failed > 0 && (
                              <p className="mt-1 text-theme-xs tabular-nums text-error-500">
                                {nf(c.failed)}{" "}
                                {t("integrations.billz.failedLabel")}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
                    {job.status === "running" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAction(pauseBillzImport)}
                        disabled={actionBusy}
                        startIcon={<LuPause className="h-4 w-4" />}
                      >
                        {t("integrations.billz.pause")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => runAction(resumeBillzImport)}
                        disabled={actionBusy}
                        startIcon={<LuPlay className="h-4 w-4" />}
                      >
                        {t("integrations.billz.resume")}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 text-theme-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                    >
                      <LuScrollText className="h-4 w-4" />
                      {t("integrations.billz.viewLog")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelOpen(true)}
                      disabled={actionBusy}
                      className="text-theme-sm font-medium text-gray-500 transition-colors hover:text-error-500 disabled:opacity-50 dark:text-gray-400 dark:hover:text-error-400"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </>
              )}

              {/* Terminal — one quiet card */}
              {terminal && (
                <div>
                  <div className="flex items-center gap-3">
                    {job.status === "completed" ? (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500">
                        <LuCircleCheck className="h-5 w-5" />
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15">
                        <LuCircleAlert className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-800 dark:text-white/90">
                        {job.status === "completed"
                          ? t("integrations.billz.doneTitle")
                          : job.status === "failed"
                            ? t("integrations.billz.failedTitle")
                            : t("integrations.billz.cancelledTitle")}
                      </h4>
                      {job.status === "failed" && job.error && (
                        <p className="truncate text-theme-xs text-error-500">
                          {job.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Per-entity result — one line each, phase-appropriate counts */}
                  <div className="mt-5 space-y-2">
                    {jobEntities.map((id) => {
                      const meta = ENTITIES.find((e) => e.id === id);
                      const c = counters[id]?.[phase];
                      if (!meta || !c) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="flex items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-300">
                            {meta.icon}
                            {t(meta.labelKey)}
                          </span>
                          <span className="text-theme-sm tabular-nums text-gray-800 dark:text-white/90">
                            {nf(c.done)}
                            {c.failed > 0 && (
                              <span className="ml-2 text-theme-xs text-error-500">
                                {nf(c.failed)}{" "}
                                {t("integrations.billz.failedLabel")}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* One contextual hint, not a stack of paragraphs */}
                  <p className="mt-4 text-theme-xs text-gray-400 dark:text-gray-500">
                    {job.status === "failed"
                      ? phase === "fetch"
                        ? t("integrations.billz.fetchOnlyNote")
                        : t("integrations.billz.failedResumeHint")
                      : job.status === "completed"
                        ? loadSums.failed > 0
                          ? t("integrations.billz.failedHint")
                          : t("integrations.billz.validateHint")
                        : t("integrations.billz.cancelConfirm")}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                    {job.status === "failed" && (
                      <Button
                        size="sm"
                        onClick={() => runAction(resumeBillzImport)}
                        disabled={actionBusy}
                        startIcon={<LuPlay className="h-4 w-4" />}
                      >
                        {t("integrations.billz.resume")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={
                        job.status === "cancelled" ? "primary" : "outline"
                      }
                      onClick={() => setStep("select")}
                      startIcon={
                        job.status !== "completed" ? (
                          <LuRefreshCw className="h-4 w-4" />
                        ) : undefined
                      }
                    >
                      {job.status === "completed"
                        ? t("integrations.billz.newImport")
                        : t("integrations.billz.restart")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 text-theme-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                    >
                      <LuScrollText className="h-4 w-4" />
                      {t("integrations.billz.viewLog")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
        title={t("integrations.billz.cancelTitle")}
        message={t("integrations.billz.cancelConfirm")}
        confirmLabel={t("integrations.billz.cancelYes")}
        cancelLabel={t("common.cancel")}
        variant="danger"
      />

      <BillzImportDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        entities={jobEntities.length > 0 ? jobEntities : ["products"]}
      />

      <BillzProbeDrawer
        isOpen={probeOpen}
        onClose={() => setProbeOpen(false)}
      />
    </div>
  );
}
