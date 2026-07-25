"use client";
import React, { useEffect, useMemo, useState } from "react";
import { LuGift, LuPlus, LuTrash2, LuInfo } from "react-icons/lu";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/form/switch/Switch";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { formatNumberInput, digitsOnly } from "@/lib/number";
import {
  getLoyaltySettings,
  updateLoyaltySettings,
  type LoyaltySettings,
} from "@/lib/api";

const CARD =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6";

const nf = new Intl.NumberFormat("uz-UZ");

// Editable form mirror of the settings — numbers held as strings so decimals /
// empty states survive typing (same reason as the stock-take count box).
type TierForm = { name: string; minTotal: string; cashbackPercent: string };
type Form = {
  enabled: boolean;
  cashbackPercent: string;
  minPurchase: string;
  redeemMaxPercent: string;
  expiryMonths: string; // "" = never expires
  tiers: TierForm[];
};

const fromSettings = (s: LoyaltySettings): Form => ({
  enabled: s.enabled,
  cashbackPercent: String(Number(s.cashbackPercent)),
  minPurchase: String(Number(s.minPurchase)),
  redeemMaxPercent: String(Number(s.redeemMaxPercent)),
  expiryMonths: s.expiryMonths == null ? "" : String(s.expiryMonths),
  tiers: s.tiers.map((tt) => ({
    name: tt.name,
    minTotal: String(tt.minTotal),
    cashbackPercent: String(tt.cashbackPercent),
  })),
});

// Sanitize a numeric text edit: allow digits + one optional decimal separator,
// strip a leading zero ("01" → "1") so the static "0" doesn't stick, and return
// null for invalid input (the keystroke is ignored). "" is allowed so the box
// can be cleared mid-edit.
const cleanNum = (raw: string): string | null => {
  if (!/^\d*[.,]?\d*$/.test(raw)) return null;
  return raw.replace(/^0+(?=\d)/, "");
};
const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Label + control + optional hint. Defined at module scope (NOT inside the page
// component) — a component created during render is a fresh type each keystroke,
// which remounts its inputs and drops focus after one character.
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

// Numeric text box with an inline unit suffix. type="text" (never type="number")
// so clearing works. `grouped` money fields show thousands separators ("50 000")
// via the shared formatNumberInput and store raw digits; percent/plain fields
// stay decimal (cleanNum handles the dot + leading-zero strip).
function NumBox({
  value,
  onChange,
  suffix,
  placeholder,
  grouped = false,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  placeholder?: string;
  grouped?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode={grouped ? "numeric" : "decimal"}
        value={grouped ? formatNumberInput(value) : value}
        placeholder={placeholder}
        onChange={(e) => {
          if (grouped) {
            onChange(digitsOnly(e.target.value));
          } else {
            const v = cleanNum(e.target.value);
            if (v !== null) onChange(v);
          }
        }}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-3 pr-14 text-sm tabular-nums text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-theme-xs font-medium text-gray-400">
        {suffix}
      </span>
    </div>
  );
}

export default function LoyaltyProgram() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  // Serialized baseline of the last-saved form, for dirty detection.
  const [savedSnapshot, setSavedSnapshot] = useState("");
  // Sample purchase for the live cashback preview.
  const [sample, setSample] = useState("100000");

  useEffect(() => {
    let active = true;
    getLoyaltySettings()
      .then((s) => {
        if (!active) return;
        const f = fromSettings(s);
        setForm(f);
        setSavedSnapshot(JSON.stringify(f));
      })
      .catch((e) => showToast("error", (e as Error).message, "Error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = form != null && JSON.stringify(form) !== savedSnapshot;

  // Patch helper keeps the setters terse.
  const patch = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));

  // Live preview: base cashback on a sample purchase (tiers raise it further,
  // shown separately). Zero when below the minimum-purchase threshold.
  const preview = useMemo(() => {
    if (!form) return { earn: 0, belowMin: false, rate: 0 };
    const amount = num(sample);
    const rate = num(form.cashbackPercent);
    const min = num(form.minPurchase);
    const belowMin = amount < min;
    return {
      rate,
      belowMin,
      earn: belowMin ? 0 : Math.round((amount * rate) / 100),
    };
  }, [form, sample]);

  const addTier = () =>
    patch({
      tiers: [
        ...(form?.tiers ?? []),
        { name: "", minTotal: "", cashbackPercent: "" },
      ],
    });

  const updateTier = (i: number, p: Partial<TierForm>) =>
    patch({
      tiers: (form?.tiers ?? []).map((tt, idx) =>
        idx === i ? { ...tt, ...p } : tt,
      ),
    });

  const removeTier = (i: number) =>
    patch({ tiers: (form?.tiers ?? []).filter((_, idx) => idx !== i) });

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await updateLoyaltySettings({
        enabled: form.enabled,
        cashbackPercent: num(form.cashbackPercent),
        minPurchase: num(form.minPurchase),
        redeemMaxPercent: num(form.redeemMaxPercent),
        expiryMonths: form.expiryMonths === "" ? null : Math.round(num(form.expiryMonths)),
        tiers: form.tiers
          .filter((tt) => tt.name.trim() !== "")
          .map((tt) => ({
            name: tt.name.trim(),
            minTotal: num(tt.minTotal),
            cashbackPercent: num(tt.cashbackPercent),
          })),
      });
      const f = fromSettings(saved);
      setForm(f);
      setSavedSnapshot(JSON.stringify(f));
      showToast("success", t("loyalty.saved"), "Success");
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className={CARD}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      </div>
    );
  }

  const disabled = !form.enabled;

  return (
    <div className="space-y-5 pb-24">
      {/* Master card — icon + intent + the on/off switch */}
      <div className={CARD}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                form.enabled
                  ? "bg-brand-50 text-brand-500 dark:bg-brand-500/10"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800"
              }`}
            >
              <LuGift size={22} />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {t("loyalty.title")}
              </h3>
              <p className="mt-0.5 max-w-xl text-theme-sm text-gray-500 dark:text-gray-400">
                {t("loyalty.subtitle")}
              </p>
            </div>
          </div>
          <div className="shrink-0 pt-1">
            <Switch
              label=""
              defaultChecked={form.enabled}
              onChange={(v) => patch({ enabled: v })}
            />
          </div>
        </div>
      </div>

      {/* Signature: live cashback preview — abstract % made concrete in so'm */}
      <div
        className={`overflow-hidden rounded-2xl border transition-opacity ${
          disabled ? "opacity-60" : ""
        } border-gray-200 bg-gradient-to-br from-brand-50/60 to-transparent dark:border-gray-800 dark:from-brand-500/[0.07]`}
      >
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="sm:max-w-[42%]">
            <p className="text-theme-xs font-medium uppercase tracking-[0.08em] text-gray-400">
              {t("loyalty.previewLabel")}
            </p>
            <label className="mt-2 block text-theme-xs text-gray-500 dark:text-gray-400">
              {t("loyalty.previewPurchase")}
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                inputMode="numeric"
                value={formatNumberInput(sample)}
                onChange={(e) => setSample(digitsOnly(e.target.value))}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-3 pr-14 text-base font-semibold tabular-nums text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-theme-xs font-medium text-gray-400">
                so'm
              </span>
            </div>
          </div>

          {/* Arrow → earned bonus (green = money to the customer) */}
          <div className="flex items-center gap-4">
            <svg
              className="hidden h-6 w-6 shrink-0 text-gray-300 sm:block dark:text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14m0 0-6-6m6 6-6 6" />
            </svg>
            <div className="text-right">
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t("loyalty.previewEarns")}
              </p>
              <p className="mt-0.5 text-3xl font-bold tabular-nums text-success-600 dark:text-success-500">
                +{nf.format(preview.earn)}{" "}
                <span className="text-base font-semibold text-success-600/70 dark:text-success-500/70">
                  {t("loyalty.points")}
                </span>
              </p>
              <p className="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500">
                {preview.belowMin
                  ? t("loyalty.previewBelowMin")
                  : `${t("loyalty.previewRate")} ${nf.format(preview.rate)}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className={`${CARD} ${disabled ? "opacity-60" : ""}`}>
        <h4 className="mb-4 text-theme-sm font-semibold uppercase tracking-wide text-gray-400">
          {t("loyalty.rulesTitle")}
        </h4>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label={t("loyalty.cashbackPercent")} hint={t("loyalty.cashbackHint")}>
            <NumBox
              value={form.cashbackPercent}
              onChange={(v) => patch({ cashbackPercent: v })}
              suffix="%"
            />
          </Field>
          <Field label={t("loyalty.minPurchase")} hint={t("loyalty.minPurchaseHint")}>
            <NumBox
              value={form.minPurchase}
              onChange={(v) => patch({ minPurchase: v })}
              suffix="so'm"
              grouped
            />
          </Field>
          <Field label={t("loyalty.redeemMax")} hint={t("loyalty.redeemMaxHint")}>
            <NumBox
              value={form.redeemMaxPercent}
              onChange={(v) => patch({ redeemMaxPercent: v })}
              suffix="%"
            />
          </Field>
          <Field label={t("loyalty.expiry")} hint={t("loyalty.expiryHint")}>
            <NumBox
              value={form.expiryMonths}
              onChange={(v) => patch({ expiryMonths: v })}
              suffix={t("loyalty.months")}
              placeholder={t("loyalty.never")}
            />
          </Field>
        </div>
      </div>

      {/* Tiers — optional, raise the rate by lifetime spend */}
      <div className={`${CARD} ${disabled ? "opacity-60" : ""}`}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h4 className="text-theme-sm font-semibold uppercase tracking-wide text-gray-400">
            {t("loyalty.tiersTitle")}
          </h4>
          <button
            type="button"
            onClick={addTier}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-theme-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            <LuPlus size={14} /> {t("loyalty.addTier")}
          </button>
        </div>
        <p className="mb-4 flex items-center gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
          <LuInfo size={13} /> {t("loyalty.tiersHint")}
        </p>

        {form.tiers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-theme-sm text-gray-400 dark:border-gray-800 dark:text-gray-500">
            {t("loyalty.noTiers")}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column captions */}
            <div className="hidden grid-cols-[1fr_1fr_7rem_2.5rem] gap-3 px-1 text-theme-xs font-medium text-gray-400 sm:grid">
              <span>{t("loyalty.tierName")}</span>
              <span>{t("loyalty.tierMinTotal")}</span>
              <span>{t("loyalty.tierRate")}</span>
              <span />
            </div>
            {form.tiers.map((tier, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 p-3 sm:grid-cols-[1fr_1fr_7rem_2.5rem] sm:items-center sm:border-transparent sm:p-1 dark:border-gray-800 sm:dark:border-transparent"
              >
                <input
                  type="text"
                  value={tier.name}
                  placeholder={t("loyalty.tierNamePlaceholder")}
                  onChange={(e) => updateTier(i, { name: e.target.value })}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                />
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberInput(tier.minTotal)}
                    onChange={(e) => updateTier(i, { minTotal: digitsOnly(e.target.value) })}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-3 pr-12 text-sm tabular-nums text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-xs text-gray-400">
                    so'm
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tier.cashbackPercent}
                    onChange={(e) => {
                      const v = cleanNum(e.target.value);
                      if (v !== null) updateTier(i, { cashbackPercent: v });
                    }}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm tabular-nums text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-xs text-gray-400">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTier(i)}
                  aria-label={t("loyalty.removeTier")}
                  className="flex h-10 w-10 items-center justify-center justify-self-end rounded-lg text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                >
                  <LuTrash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating save bar — sticks to the viewport bottom inside the content
          column (no sidebar-width math), only while there are unsaved edits */}
      {dirty && (
        <div className="sticky bottom-4 z-40">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-theme-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <span className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t("loyalty.unsaved")}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setForm(JSON.parse(savedSnapshot) as Form)}
                disabled={saving}
              >
                {t("loyalty.discard")}
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("loyalty.saving")}
                  </span>
                ) : (
                  t("loyalty.save")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
