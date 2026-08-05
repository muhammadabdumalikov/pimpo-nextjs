"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { LuExternalLink, LuRefreshCw } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import Switch from "@/components/form/switch/Switch";
import ConfirmModal from "@/components/ui/confirm-modal/ConfirmModal";
import { formatDate } from "@/lib/reportFormat";
import {
  getAiSettings,
  saveAiSettings,
  testAiConnection,
  deleteAiSettings,
  listAiModels,
  type AiProviderId,
  type AiSettingsView,
} from "@/lib/api";

// The three supported providers and where each key is created — the console
// link is shown in the help block under the form.
const PROVIDERS: {
  id: AiProviderId;
  name: string;
  consoleUrl: string;
  consoleHost: string;
}[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    consoleUrl: "https://console.anthropic.com",
    consoleHost: "console.anthropic.com",
  },
  {
    id: "openai",
    name: "OpenAI",
    consoleUrl: "https://platform.openai.com",
    consoleHost: "platform.openai.com",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    consoleUrl: "https://aistudio.google.com",
    consoleHost: "aistudio.google.com",
  },
];

// Sentinel option in the model dropdown that switches to free-text entry —
// BYOK means a brand-new (or retired-and-replaced) model id must always be
// typable even when the fetched list doesn't know it yet.
const CUSTOM_MODEL = "__custom__";

/**
 * Settings → Ilovalar → AI yordamchi (BYOK).
 *
 * The owner pastes their own provider API key (Anthropic / OpenAI / Gemini);
 * the backend stores it encrypted and never returns it — only hasKey +
 * apiKeyLast4 come back, so the field shows a masked placeholder and a saved
 * form simply omits `apiKey` to keep the stored secret. Owner-only, pro tier:
 * other accounts get a 403, surfaced as the inline error state.
 */
export default function AiProviderSettings() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<AiSettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bump to re-fetch (retry button, after delete) through the same effect.
  const [reloadTick, setReloadTick] = useState(0);

  // Form state, seeded from the loaded view.
  const [provider, setProvider] = useState<AiProviderId>("anthropic");
  const [model, setModel] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  // With a stored key the input stays locked behind "Change key" so an idle
  // form can't accidentally overwrite the secret.
  const [editingKey, setEditingKey] = useState(false);

  // "Boshqa model" mode: the dropdown shows the sentinel and a text input
  // below holds the actual id — the escape hatch for ids the list lacks.
  const [customModel, setCustomModel] = useState(false);

  // Live model list from POST /ai/settings/models, for the CURRENT provider
  // only (a provider switch refetches). `models: null` = the request itself
  // failed → fall back to the static suggestions from availableModels.
  // `live: false` = the backend answered but from its static fallback.
  const [fetchedModels, setFetchedModels] = useState<{
    provider: AiProviderId;
    models: { id: string; label: string }[] | null;
    live: boolean;
  } | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  // Drop out-of-order responses (fast provider switching).
  const modelsSeqRef = useRef(0);
  // Last provider+key a fetch ran with, so blurring an unchanged key field
  // doesn't refire the request.
  const lastModelsFetchRef = useRef<{ provider: AiProviderId; key: string } | null>(
    null,
  );
  // True while `model` holds an auto-picked default (first list entry) rather
  // than a saved or hand-picked value — only then may a fresh live list move
  // the selection, so a valid custom/stored id is never clobbered.
  const modelAutoRef = useRef(false);

  const fetchModels = useCallback(
    async (prov: AiProviderId, typedKey?: string) => {
      const seq = ++modelsSeqRef.current;
      lastModelsFetchRef.current = { provider: prov, key: typedKey ?? "" };
      setModelsLoading(true);
      try {
        const res = await listAiModels(
          typedKey ? { provider: prov, apiKey: typedKey } : { provider: prov },
        );
        if (seq !== modelsSeqRef.current) return;
        setFetchedModels({ provider: prov, models: res.models, live: res.live });
        // Only an auto-defaulted selection follows the live list; a saved or
        // typed id stays put even when the list doesn't contain it.
        if (modelAutoRef.current && res.models.length > 0) {
          setModel((current) =>
            res.models.some((m) => m.id === current)
              ? current
              : res.models[0].id,
          );
        }
      } catch {
        // Quietly fall back to the static list — the page must stay usable.
        if (seq !== modelsSeqRef.current) return;
        setFetchedModels({ provider: prov, models: null, live: false });
      } finally {
        if (seq === modelsSeqRef.current) setModelsLoading(false);
      }
    },
    [],
  );

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const view = await getAiSettings();
        if (!active) return;
        setSettings(view);
        setProvider(view.provider);
        setModel(view.model);
        setEnabled(view.enabled);
        setApiKey("");
        setEditingKey(false);
        setCustomModel(false);
        setTestResult(null);
        modelAutoRef.current = false; // saved model — never auto-replaced
        // With a stored key, ask the provider what this key can actually
        // reach so the dropdown isn't stuck on stale static suggestions.
        setFetchedModels(null);
        lastModelsFetchRef.current = null;
        if (view.hasKey) void fetchModels(view.provider);
      } catch (err) {
        if (active) setLoadError((err as Error)?.message || "Error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadTick, fetchModels]);

  const hasStoredKey = settings?.hasKey ?? false;
  const providerMeta = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  // Dropdown source: the live provider list when we have one for this
  // provider, otherwise the static suggestions that shipped with settings.
  const liveList =
    fetchedModels?.provider === provider ? fetchedModels.models : null;
  const modelList = liveList ?? settings?.availableModels?.[provider] ?? [];
  const modelOptions = modelList.map((m) => ({ value: m.id, label: m.label }));
  // A saved/typed id the list doesn't know stays selected and visible — a
  // retired or brand-new model must never lock the owner out.
  if (!customModel && model && !modelList.some((m) => m.id === model)) {
    modelOptions.unshift({ value: model, label: model });
  }
  modelOptions.push({ value: CUSTOM_MODEL, label: t("ai.customModelOption") });
  // The quiet "list may be stale" hint: shown when the fetch fell back to
  // static suggestions (backend said live:false, or the request failed).
  const modelsStale =
    fetchedModels?.provider === provider && !fetchedModels.live;

  // A save/test is possible with either a freshly typed key or a stored one.
  const hasUsableKey = hasStoredKey || apiKey.trim().length > 0;

  const switchProvider = (next: AiProviderId) => {
    if (next === provider) return;
    setProvider(next);
    setCustomModel(false);
    // Returning to the saved provider restores the saved model (even a custom
    // id); any other provider starts from the first entry of its list until
    // the live fetch below possibly refines it.
    const returningToSaved = !!settings && next === settings.provider;
    setModel(
      returningToSaved
        ? settings.model
        : (settings?.availableModels?.[next]?.[0]?.id ?? ""),
    );
    modelAutoRef.current = !returningToSaved;
    setTestResult(null);
    // Re-pull the live list when any key is around to try: a freshly typed
    // one wins, else the stored one (which may not fit this provider — the
    // backend then falls back and reports live:false, still usable).
    const typed = apiKey.trim();
    if (typed || hasStoredKey) void fetchModels(next, typed || undefined);
  };

  // After the owner finishes typing a new key (blur — not per keystroke),
  // ask the provider what that key can reach. Skipped when nothing changed
  // since the last fetch.
  const onApiKeyBlur = () => {
    const typed = apiKey.trim();
    if (!typed) return;
    const last = lastModelsFetchRef.current;
    if (last && last.provider === provider && last.key === typed) return;
    void fetchModels(provider, typed);
  };

  const refreshModels = () => {
    if (modelsLoading || !hasUsableKey) return;
    const typed = apiKey.trim();
    void fetchModels(provider, typed || undefined);
  };

  const save = async () => {
    if (saving || !model || !hasUsableKey) return;
    const body: {
      provider: AiProviderId;
      model: string;
      apiKey?: string;
      enabled?: boolean;
    } = { provider, model, enabled };
    const typed = apiKey.trim();
    if (typed) body.apiKey = typed; // omitted = keep the stored key
    setSaving(true);
    try {
      const view = await saveAiSettings(body);
      setSettings(view);
      setProvider(view.provider);
      setModel(view.model);
      setEnabled(view.enabled);
      setApiKey("");
      setEditingKey(false);
      showToast("success", t("ai.saved"));
    } catch (err) {
      showToast("error", (err as Error)?.message || "Error", "Error");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (testing || !model || !hasUsableKey) return;
    const body: { provider: AiProviderId; model: string; apiKey?: string } = {
      provider,
      model,
    };
    const typed = apiKey.trim();
    if (typed) body.apiKey = typed; // omitted = test the stored key
    setTesting(true);
    setTestResult(null);
    try {
      await testAiConnection(body);
      setTestResult({ ok: true, message: t("ai.testOk") });
    } catch (err) {
      setTestResult({ ok: false, message: (err as Error)?.message || "Error" });
    } finally {
      setTesting(false);
    }
  };

  const removeKey = async () => {
    setDeleting(true);
    try {
      await deleteAiSettings();
      setConfirmOpen(false);
      showToast("success", t("ai.deleted"));
      setReloadTick((n) => n + 1); // re-sync with the backend defaults
    } catch (err) {
      showToast("error", (err as Error)?.message || "Error", "Error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  // Load failed (network, or the 403 a non-owner / non-pro account gets).
  if (loadError || !settings) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("ai.title")}
        </h2>
        <p className="mt-4 rounded-xl bg-error-50 px-4 py-3 text-sm font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {loadError || t("ai.loadFailed")}
        </p>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReloadTick((n) => n + 1)}
          >
            {t("ai.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // Header badge reflects the SAVED state, not the unsaved form.
  const status = settings.hasKey
    ? settings.enabled
      ? "active"
      : "disabled"
    : "notConfigured";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("ai.title")}
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status === "active"
              ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {status === "active"
            ? t("ai.statusActive")
            : status === "disabled"
              ? t("ai.statusDisabled")
              : t("ai.statusNotConfigured")}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("ai.subtitle")}
      </p>

      <div className="mt-6 flex flex-col gap-5">
        {/* Provider — three radio-cards, matching the app-tile language. */}
        <div>
          <Label>{t("ai.providerLabel")}</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {PROVIDERS.map((p) => {
              const active = p.id === provider;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => switchProvider(p.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${
                      active
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-gray-800 dark:text-white/90"
                    }`}
                  >
                    {p.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {p.consoleHost}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model — live list from the provider when a key is available,
            static suggestions otherwise; the sentinel option opens free-text
            entry so any id the list lacks can still be used. */}
        <div className="max-w-md">
          <Label>{t("ai.modelLabel")}</Label>
          <div className="flex items-center gap-2">
            <SelectField
              className="flex-1"
              options={modelOptions}
              value={customModel ? CUSTOM_MODEL : model}
              onChange={(v) => {
                if (v === CUSTOM_MODEL) {
                  setCustomModel(true);
                } else {
                  setCustomModel(false);
                  setModel(v);
                  modelAutoRef.current = false;
                }
                setTestResult(null);
              }}
            />
            <button
              type="button"
              onClick={refreshModels}
              disabled={modelsLoading || !hasUsableKey}
              title={t("ai.refreshModels")}
              aria-label={t("ai.refreshModels")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-500 shadow-theme-xs transition hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <LuRefreshCw
                className={`h-4 w-4 ${modelsLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {customModel && (
            <div className="mt-2">
              <Input
                value={model}
                onChange={(e) => {
                  setModel(e.target.value.trim());
                  modelAutoRef.current = false;
                  setTestResult(null);
                }}
                placeholder={t("ai.customModelPlaceholder")}
              />
            </div>
          )}
          {modelsStale && (
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              {t("ai.modelsStaleHint")}
            </p>
          )}
        </div>

        {/* API key — masked placeholder while a stored key is kept. */}
        <div className="max-w-md">
          <Label>{t("ai.apiKeyLabel")}</Label>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                onBlur={onApiKeyBlur}
                disabled={hasStoredKey && !editingKey}
                placeholder={
                  hasStoredKey
                    ? `••••••••${settings.apiKeyLast4 ?? ""}`
                    : t("ai.apiKeyPlaceholder")
                }
              />
            </div>
            {hasStoredKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (editingKey) {
                    // Cancel — keep the stored key. If the model list was
                    // fetched with the abandoned typed key, re-pull it with
                    // the stored one.
                    setApiKey("");
                    setEditingKey(false);
                    if (lastModelsFetchRef.current?.key) {
                      void fetchModels(provider);
                    }
                  } else {
                    setEditingKey(true);
                  }
                  setTestResult(null);
                }}
              >
                {editingKey ? t("ai.cancelChangeKey") : t("ai.changeKey")}
              </Button>
            )}
          </div>
        </div>

        {/* Where to get a key + how it is stored/billed. */}
        <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/[0.04]">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("ai.helpTitle")}
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {t("ai.helpGetKey")}{" "}
            <a
              href={providerMeta.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-500 hover:text-brand-600"
            >
              {providerMeta.consoleHost}
              <LuExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t("ai.helpSecurity")}
          </p>
        </div>

        <Switch
          label={t("ai.enabledLabel")}
          defaultChecked={enabled}
          onChange={setEnabled}
        />

        {testResult && (
          <p
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              testResult.ok
                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                : "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400"
            }`}
          >
            {testResult.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={saving || !model || !hasUsableKey}>
            {saving ? t("ai.saving") : t("ai.save")}
          </Button>
          <Button
            variant="outline"
            onClick={test}
            disabled={testing || !model || !hasUsableKey}
          >
            {testing ? t("ai.testing") : t("ai.test")}
          </Button>
          {hasStoredKey && (
            <Button
              variant="outline"
              className="sm:ml-auto !text-error-500 dark:!text-error-400"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              {t("ai.deleteKey")}
            </Button>
          )}
        </div>

        {/* Usage — saved-state metadata, demoted to the card footer. */}
        <div className="border-t border-gray-100 pt-4 text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {t("ai.usageThisMonth")}:{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {settings.monthlyCount} {t("ai.questionsSuffix")}
          </span>
          <span className="mx-2">·</span>
          {t("ai.lastUsed")}:{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {formatDate(settings.lastUsedAt)}
          </span>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={removeKey}
        title={t("ai.deleteTitle")}
        message={t("ai.deleteConfirm")}
        confirmLabel={t("ai.deleteKey")}
        cancelLabel={t("ai.cancelChangeKey")}
        variant="danger"
        isLoading={deleting}
        loadingLabel={t("ai.deleting")}
      />
    </div>
  );
}
