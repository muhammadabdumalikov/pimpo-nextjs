"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LuArrowUp,
  LuCheck,
  LuCopy,
  LuCpu,
  LuLoaderCircle,
  LuMessageSquarePlus,
  LuSettings,
  LuSparkles,
  LuSquare,
  LuX,
} from "react-icons/lu";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { getAiCapabilities } from "@/lib/api";
import type { ApiError } from "@/lib/errorMessages";
import {
  askAi,
  translateStreamError,
  type AiArtifact,
  type AiHistoryTurn,
} from "@/lib/aiStream";
import AiArtifactView from "./AiArtifact";
import AiMarkdown from "./AiMarkdown";
import AiRail from "./AiRail";

// Re-rendering ApexCharts 60×/s during the reveal would cost more than the
// animation saves — artifact props never change once landed, so memo skips
// them on every reveal frame.
const MemoizedArtifact = memo(AiArtifactView);

// One assistant turn is an ORDERED list of parts — the model interleaves prose
// and artifacts (a table can land between two paragraphs), so `{text,
// artifacts[]}` would scramble the arrival order.
type AssistantPart =
  | { type: "text"; text: string }
  | { type: "artifact"; artifact: AiArtifact };

// The live tool trace: which report tools the model is running right now.
// This is what makes a 10-second wait feel like work, not a hang.
interface ToolRun {
  id: string;
  label: string;
  running: boolean;
  ok?: boolean;
  ms?: number;
}

interface UserMsg {
  id: string;
  role: "user";
  content: string;
}

interface AssistantMsg {
  id: string;
  role: "assistant";
  parts: AssistantPart[];
  tools: ToolRun[];
  error?: string;
  /** User pressed Stop before any content arrived. */
  stopped?: boolean;
  /** The stream was aborted mid-flight — the reveal snaps, no residual typing. */
  aborted?: boolean;
  done: boolean;
  /**
   * Set only when this turn was asked with a NON-default model — the owner is
   * comparing models, so the turn says which one produced it. Resolved to a
   * display label at send time, so a later options refresh can't rewrite
   * history.
   */
  modelLabel?: string;
}

type ChatMsg = UserMsg | AssistantMsg;

// The gate decides which surface renders: the chat, the "configure first"
// panel, or a load error. AI_NOT_CONFIGURED / AI_DISABLED can arrive from the
// capabilities probe OR the first ask — both flip to the settings panel.
type Gate = "loading" | "ready" | "notConfigured" | "error";

const codeIsNotConfigured = (code?: string) =>
  code === "AI_NOT_CONFIGURED" || code === "AI_DISABLED";

// The picked model survives a reload — but it's only honoured if it still
// exists in the capabilities list, so a retired model can't wedge the screen.
const MODEL_STORAGE_KEY = "ai.model";

const readStoredModel = (): string | null => {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY);
  } catch {
    return null;
  }
};

let nextId = 0;
const newId = (prefix: string) => `${prefix}${++nextId}`;

export default function AiAssistant() {
  const { t, locale } = useTranslations();

  const [gate, setGate] = useState<Gate>("loading");
  const [gateError, setGateError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  // Model picker: the saved default (from capabilities), the pickable list,
  // and the active choice. `model` starts at the default unless a still-valid
  // localStorage pick overrides it.
  const [defaultModel, setDefaultModel] = useState("");
  const [modelOptions, setModelOptions] = useState<
    { id: string; label: string }[]
  >([]);
  const [model, setModel] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Auto-follow the stream only while the user is near the bottom, so
  // scrolling up to re-read an earlier answer isn't fought.
  const stickRef = useRef(true);

  // The model answers in the UI language; uzc (Cyrillic) folds to uz.
  const apiLocale: "uz" | "ru" | "en" =
    locale === "ru" ? "ru" : locale === "en" ? "en" : "uz";

  // Cheap probe: is the assistant reachable at all on this account?
  useEffect(() => {
    let active = true;
    setGate("loading");
    getAiCapabilities()
      .then((caps) => {
        if (!active) return;
        // The endpoint may report not-configured as data instead of an error.
        if (caps.configured === false) {
          setGate("notConfigured");
          return;
        }
        const saved = caps.model || "";
        // Contract says `models` is never empty, but guard anyway: the saved
        // default alone still makes a working (single-option) picker.
        const options =
          caps.models && caps.models.length > 0
            ? caps.models
            : saved
              ? [{ id: saved, label: saved }]
              : [];
        const stored = readStoredModel();
        const storedIsValid =
          !!stored &&
          (stored === saved || options.some((m) => m.id === stored));
        setDefaultModel(saved);
        setModelOptions(options);
        setModel(storedIsValid ? stored : saved);
        setGate("ready");
      })
      .catch((err) => {
        if (!active) return;
        const apiErr = err as ApiError;
        if (codeIsNotConfigured(apiErr?.code)) {
          setGate("notConfigured");
        } else {
          setGateError(apiErr?.message || t("ai.loadFailed"));
          setGate("error");
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTick]);

  // Navigating away cancels an in-flight stream.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Follow the stream: every appended delta/artifact keeps the newest content
  // in view (unless the user scrolled up — stickRef gates it).
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // The typewriter grows content without touching `messages`, so the scroll
  // effect above never sees it — the revealing block calls this per step.
  const followReveal = useCallback(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, []);

  // The client owns the transcript — replay the last turns as `history`
  // (trimmed; the server caps at 20 anyway). Assistant turns replay only
  // their prose: artifacts are for the human, not the model's memory.
  const buildHistory = (msgs: ChatMsg[]): AiHistoryTurn[] =>
    msgs
      .map((m) =>
        m.role === "user"
          ? { role: "user" as const, content: m.content }
          : {
              role: "assistant" as const,
              content: m.parts
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("\n"),
            },
      )
      .filter((h) => h.content.trim().length > 0)
      .slice(-10);

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || streaming) return;

      const history = buildHistory(messages);
      // Only a NON-default pick travels in the body (omitted ⇒ saved default)
      // and only such a turn gets labeled — default answers stay unmarked.
      const modelOverride =
        model && model !== defaultModel ? model : undefined;
      const modelLabel = modelOverride
        ? modelOptions.find((m) => m.id === modelOverride)?.label ??
          modelOverride
        : undefined;
      const assistantId = newId("a");
      setMessages((prev) => [
        ...prev,
        { id: newId("u"), role: "user", content: question },
        {
          id: assistantId,
          role: "assistant",
          parts: [],
          tools: [],
          done: false,
          modelLabel,
        },
      ]);
      setInput("");
      if (taRef.current) taRef.current.style.height = "auto";
      stickRef.current = true;
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const patch = (fn: (m: AssistantMsg) => AssistantMsg) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === "assistant" ? fn(m) : m,
          ),
        );

      try {
        await askAi(
          { question, history, locale: apiLocale, model: modelOverride },
          {
            signal: controller.signal,
            onEvent: (event) => {
              switch (event.type) {
                case "text":
                  patch((m) => {
                    const parts = [...m.parts];
                    const last = parts[parts.length - 1];
                    // Consecutive deltas extend the same prose run; after an
                    // artifact a new run starts — arrival order is preserved.
                    if (last?.type === "text") {
                      parts[parts.length - 1] = {
                        type: "text",
                        text: last.text + event.delta,
                      };
                    } else {
                      parts.push({ type: "text", text: event.delta });
                    }
                    return { ...m, parts };
                  });
                  break;
                case "tool_start":
                  patch((m) => ({
                    ...m,
                    tools: [
                      ...m.tools,
                      { id: event.id, label: event.label, running: true },
                    ],
                  }));
                  break;
                case "tool_end":
                  patch((m) => ({
                    ...m,
                    tools: m.tools.map((tr) =>
                      tr.id === event.id
                        ? { ...tr, running: false, ok: event.ok, ms: event.ms }
                        : tr,
                    ),
                  }));
                  break;
                case "artifact":
                  patch((m) => ({
                    ...m,
                    parts: [
                      ...m.parts,
                      { type: "artifact", artifact: event.artifact },
                    ],
                  }));
                  break;
                case "error": {
                  if (codeIsNotConfigured(event.code)) setGate("notConfigured");
                  // Localize by code; the raw English message is never shown.
                  const msg = translateStreamError(event.code, t("ai.askFailed"));
                  patch((m) => ({ ...m, error: msg }));
                  break;
                }
                case "done":
                  patch((m) => ({ ...m, done: true }));
                  break;
              }
            },
          },
        );
      } catch (err) {
        // Non-2xx JSON error (403 plan/config, 429 rate limit, network).
        if (!controller.signal.aborted) {
          const apiErr = err as ApiError;
          if (codeIsNotConfigured(apiErr?.code)) setGate("notConfigured");
          patch((m) => ({
            ...m,
            error: apiErr?.message || t("ai.askFailed"),
          }));
        }
      } finally {
        const aborted = controller.signal.aborted;
        patch((m) => ({
          ...m,
          done: true,
          aborted,
          stopped: aborted && m.parts.length === 0 && !m.error,
          tools: m.tools.map((tr) =>
            tr.running ? { ...tr, running: false } : tr,
          ),
        }));
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, apiLocale, t, model, defaultModel, modelOptions],
  );

  const stop = () => abortRef.current?.abort();

  // Picking the saved default clears the override, so a later change to the
  // default on the settings page flows through instead of being pinned here.
  const pickModel = (id: string) => {
    setModel(id);
    try {
      if (id === defaultModel) localStorage.removeItem(MODEL_STORAGE_KEY);
      else localStorage.setItem(MODEL_STORAGE_KEY, id);
    } catch {
      // Storage unavailable (private mode) — the pick still applies this session.
    }
  };

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  const autosize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // ── Gate surfaces ─────────────────────────────────────────────────────────

  if (gate === "loading") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="mt-6 h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (gate === "notConfigured") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
          <LuSparkles size={26} />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("ai.notConfiguredTitle")}
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500 dark:text-gray-400">
          {t("ai.notConfiguredText")}
        </p>
        <Link
          href="/settings/applications/ai"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
        >
          <LuSettings size={16} />
          {t("ai.goToSettings")}
        </Link>
      </div>
    );
  }

  if (gate === "error") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("ai.title")}
        </h3>
        <p className="mt-4 rounded-xl bg-error-50 px-4 py-3 text-sm font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {gateError || t("ai.loadFailed")}
        </p>
        <button
          onClick={() => setReloadTick((n) => n + 1)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          {t("ai.retry")}
        </button>
      </div>
    );
  }

  // ── Chat surface ──────────────────────────────────────────────────────────

  const suggestions = [
    t("ai.suggest1"),
    t("ai.suggest2"),
    t("ai.suggest3"),
    t("ai.suggest4"),
    t("ai.suggest5"),
  ];

  // The saved default is tagged in its label so the owner can find the way
  // back to it after experimenting.
  const modelSelectOptions = modelOptions.map((m) => ({
    value: m.id,
    label:
      m.id === defaultModel
        ? m.label + " · " + t("ai.modelDefaultTag")
        : m.label,
  }));

  return (
    <div className="flex h-[calc(100dvh-2rem)] min-h-[480px] flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:h-[calc(100dvh-3rem)]">
      {/* Toolbar: identity + model picker on the left, new chat on the right */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
            <LuSparkles size={18} />
          </span>
          <h3 className="min-w-0 truncate text-base font-semibold text-gray-800 dark:text-white/90">
            {t("ai.title")}
          </h3>
          {modelSelectOptions.length > 0 && (
            <>
              <span className="hidden h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-800 sm:block" />
              <SelectField
                options={modelSelectOptions}
                value={model}
                onChange={pickModel}
                disabled={streaming}
                searchable={modelSelectOptions.length > 6}
                placeholder={t("ai.modelLabel")}
                className="min-w-0 max-w-[150px] shrink-0 sm:max-w-[240px]"
                buttonClassName="!h-9 !w-auto !gap-1 !rounded-full !border-transparent !bg-transparent !px-3 !text-xs !font-medium !text-gray-600 !shadow-none hover:!bg-gray-100 hover:!text-gray-800 dark:!border-transparent dark:!bg-transparent dark:!text-gray-400 dark:hover:!bg-white/[0.05] dark:hover:!text-gray-200"
                // The trigger is a compact pill, but model names are long —
                // the panel gets its own readable width and wraps labels.
                dropdownClassName="min-w-[min(280px,calc(100vw-6rem))] sm:min-w-[340px]"
                wrapOptions
              />
            </>
          )}
        </div>
        <button
          onClick={resetChat}
          disabled={messages.length === 0 && !streaming}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-gray-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 sm:px-4"
          aria-label={t("ai.newChat")}
          title={t("ai.newChat")}
        >
          <LuMessageSquarePlus size={16} />
          <span className="hidden sm:inline">{t("ai.newChat")}</span>
        </button>
      </div>

      {/* Content row: centered chat column + right rail (xl and up) */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={listRef}
            onScroll={onListScroll}
            className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6 sm:px-6"
          >
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full w-full max-w-3xl">
                <EmptyState suggestions={suggestions} onPick={send} />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-8">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div
                      key={m.id}
                      className="whitespace-pre-wrap rounded-2xl bg-brand-50 px-5 py-4 text-sm font-medium leading-relaxed text-gray-800 dark:bg-brand-500/10 dark:text-gray-100"
                    >
                      {m.content}
                    </div>
                  ) : (
                    <AssistantBlock
                      key={m.id}
                      message={m}
                      isLatest={i === messages.length - 1}
                      onGrow={followReveal}
                    />
                  ),
                )}
              </div>
            )}
          </div>

          {/* Composer: one pill, send/stop lives inside it */}
          <div className="px-4 pb-4 pt-1 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex items-end gap-2 rounded-3xl border border-gray-200 bg-white py-2 pl-3 pr-2 shadow-theme-xs transition focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-8 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500"
                >
                  <LuSparkles size={16} />
                </span>
                <textarea
                  ref={taRef}
                  value={input}
                  rows={1}
                  disabled={streaming}
                  placeholder={t("ai.askPlaceholder")}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autosize(e.target);
                  }}
                  onKeyDown={onComposerKeyDown}
                  // !bg-transparent: globals.css paints every textarea with an
                  // UNLAYERED gray fill (the form-contrast pass); only the
                  // important flag beats it, and the pill must be one surface.
                  className="max-h-40 flex-1 resize-none self-center !bg-transparent py-2 text-sm text-gray-900 shadow-none placeholder:text-gray-400 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/90 dark:placeholder:text-gray-500"
                />
                {streaming ? (
                  <button
                    onClick={stop}
                    aria-label={t("ai.stop")}
                    title={t("ai.stop")}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-500 text-white shadow-theme-xs transition hover:bg-error-600 active:scale-95"
                  >
                    <LuSquare size={14} className="fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim()}
                    aria-label={t("ai.send")}
                    title={t("ai.send")}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-theme-xs transition hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LuArrowUp size={18} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
                {t("ai.disclaimer")}
              </p>
            </div>
          </div>
        </div>

        <AiRail streaming={streaming} onPick={send} />
      </div>
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function EmptyState({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (q: string) => void;
}) {
  const { t } = useTranslations();
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 py-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <LuSparkles size={26} />
      </span>
      <div>
        <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {t("ai.emptyTitle")}
        </h4>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {t("ai.emptyHint")}
        </p>
      </div>
      {/* Below xl the rail is hidden, so the questions live here instead. */}
      <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2 xl:hidden">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-800 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// Decouples arrival from paint: providers (Gemini especially) deliver few,
// large chunks, so raw rendering pops whole paragraphs in at once. A counter
// drains toward the full length once per animation frame; the step is
// proportional to the backlog, so a steady trickle types smoothly while a
// one-chunk dump catches up in well under a second instead of crawling.
// `snap` short-circuits everything, and prefers-reduced-motion folds into it.
function useTypewriter(totalChars: number, snap: boolean): number {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const instant = snap || reduced;
  const [revealed, setRevealed] = useState(() => (instant ? totalChars : 0));
  const revealedRef = useRef(revealed);
  const totalRef = useRef(totalChars);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    totalRef.current = totalChars;
    if (instant) {
      // `instant` never flips back off for a turn, and the hook returns
      // totalChars directly while it holds — the state can stay stale, so
      // no setState here (only the refs keep the loop guards honest).
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      revealedRef.current = totalChars;
      return;
    }
    // One self-perpetuating loop per turn: effect re-runs on new arrivals
    // just update totalRef and let the running loop pick them up.
    if (rafRef.current !== null || revealedRef.current >= totalChars) return;
    const tick = () => {
      const backlog = totalRef.current - revealedRef.current;
      if (backlog <= 0) {
        rafRef.current = null;
        return;
      }
      // ~180 chars/s floor for typing feel; /6 decay + 260 cap so even a
      // multi-thousand-char backlog finishes its sweep in under a second.
      const step = Math.min(260, Math.max(3, Math.ceil(backlog / 6)));
      revealedRef.current = Math.min(totalRef.current, revealedRef.current + step);
      setRevealed(revealedRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [instant, totalChars]);

  // Unmount kills the loop — no setState after unmount.
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // `instant` renders full even before the snap effect commits.
  return instant ? totalChars : revealed;
}

type RenderPart =
  | { key: number; type: "text"; text: string }
  | { key: number; type: "artifact"; artifact: AiArtifact };

// Walk parts in arrival order against one reveal budget: text consumes it;
// an artifact renders only once every preceding text part is fully revealed
// (remaining still >= 0), so a chart can't outrun the sentence introducing
// it. Artifacts themselves consume nothing.
function revealParts(parts: AssistantPart[], revealed: number): RenderPart[] {
  const out: RenderPart[] = [];
  let remaining = revealed;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type === "text") {
      const visible = Math.max(0, Math.min(part.text.length, remaining));
      remaining -= part.text.length;
      if (visible > 0) {
        out.push({
          key: i,
          type: "text",
          text:
            visible >= part.text.length ? part.text : part.text.slice(0, visible),
        });
      }
    } else if (remaining >= 0) {
      out.push({ key: i, type: "artifact", artifact: part.artifact });
    }
  }
  return out;
}

// Document-style answer: a single "Result" header per turn, then the tool
// trace and parts straight on the surface — no bubble.
function AssistantBlock({
  message,
  isLatest,
  onGrow,
}: {
  message: AssistantMsg;
  /** Only the newest turn animates; older turns always render in full. */
  isLatest: boolean;
  /** Parent scroll-follow — reveal growth never passes through `messages`. */
  onGrow: () => void;
}) {
  const { t } = useTranslations();
  const waiting =
    !message.done &&
    message.parts.length === 0 &&
    !message.error &&
    !message.tools.some((tr) => tr.running);
  const proseText = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n");
  const totalChars = message.parts.reduce(
    (n, p) => (p.type === "text" ? n + p.text.length : n),
    0,
  );
  // Snap once the turn leaves the live path: superseded by a newer message,
  // aborted, or errored. A natural `done` keeps draining so the animation
  // finishes on its own (fast, per the backlog rule).
  const snap = !isLatest || message.aborted === true || !!message.error;
  const revealed = useTypewriter(totalChars, snap);
  const drained = revealed >= totalChars;

  // Keep the view glued to the typing, not just to raw arrival.
  useEffect(() => {
    onGrow();
  }, [revealed, onGrow]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
          <LuSparkles size={13} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("ai.resultsLabel")}
        </span>
        {message.modelLabel && (
          <span
            className="ml-auto flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500"
            title={t("ai.answeredWith") + ": " + message.modelLabel}
          >
            <LuCpu size={12} className="shrink-0" />
            <span className="truncate">{message.modelLabel}</span>
          </span>
        )}
      </div>
      {message.tools.length > 0 && <ToolTrace runs={message.tools} />}
      {revealParts(message.parts, revealed).map((rp) =>
        rp.type === "text" ? (
          <AiMarkdown key={rp.key} text={rp.text} />
        ) : (
          <MemoizedArtifact key={rp.key} artifact={rp.artifact} />
        ),
      )}
      {message.error && (
        <p className="rounded-xl bg-error-50 px-4 py-3 text-sm font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {message.error}
        </p>
      )}
      {message.stopped && (
        <p className="text-sm italic text-gray-400 dark:text-gray-500">
          {t("ai.stopped")}
        </p>
      )}
      {waiting && <ThinkingDots label={t("ai.thinking")} />}
      {message.done && drained && proseText.trim().length > 0 && (
        <div className="flex items-center pt-0.5">
          <CopyTurnButton text={proseText} />
        </div>
      )}
    </div>
  );
}

// Quiet per-turn action: copy the answer's prose (artifacts have their own
// exports). Flips to a check for a moment as the only confirmation.
function CopyTurnButton({ text }: { text: string }) {
  const { t } = useTranslations();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (http, permissions) — nothing useful to show.
    }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
    >
      {copied ? (
        <LuCheck size={14} className="text-success-600 dark:text-success-500" />
      ) : (
        <LuCopy size={14} />
      )}
      {copied ? t("ai.copied") : t("ai.copy")}
    </button>
  );
}

// The live tool trace: a running tool shows its localized label with a
// spinner; a finished one flips to a check (or ✕) plus the elapsed time.
function ToolTrace({ runs }: { runs: ToolRun[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {runs.map((run) => (
        <span
          key={run.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-400"
        >
          {run.running ? (
            <LuLoaderCircle className="h-3.5 w-3.5 animate-spin text-brand-500" />
          ) : run.ok === false ? (
            <LuX className="h-3.5 w-3.5 text-error-500" />
          ) : (
            <LuCheck className="h-3.5 w-3.5 text-success-600 dark:text-success-500" />
          )}
          {run.label}
          {!run.running && typeof run.ms === "number" && (
            <span className="tabular-nums text-gray-400 dark:text-gray-500">
              {run.ms < 1000 ? `${run.ms} ms` : `${(run.ms / 1000).toFixed(1)} s`}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function ThinkingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1" role="status" aria-label={label}>
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms] dark:bg-gray-600" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms] dark:bg-gray-600" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms] dark:bg-gray-600" />
    </div>
  );
}
