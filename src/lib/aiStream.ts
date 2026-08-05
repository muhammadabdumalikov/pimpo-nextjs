// Streaming client for the AI assistant (POST /ai/ask, SSE over fetch).
//
// `EventSource` cannot be used here: it sends no Authorization header and the
// JWT lives in localStorage. So the stream is read with fetch() + a
// ReadableStream reader, and the SSE frames are parsed by hand: frames are
// `data: {json}\n\n`, comment lines (": ping") are proxy keep-alives to skip,
// and a JSON frame CAN be split across chunk boundaries — the tail is buffered
// until its closing blank line arrives.
import { getAuthToken, handleUnauthorized } from './api';
import { makeApiError, translateApiError } from './errorMessages';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── Artifact contract (mirrors pimpo-backend src/ai/artifact.ts) ────────────

export type NumberFormat = 'money' | 'number' | 'percent' | 'date' | 'text';

export interface KpiArtifact {
  kind: 'kpi';
  title?: string;
  items: {
    label: string;
    value: number;
    format?: NumberFormat;
    /** Percent change vs the comparison period, if one was computed. */
    delta?: number;
    /** True when a *fall* is the good outcome (costs, shortages, returns). */
    invertDelta?: boolean;
  }[];
}

export interface TableArtifact {
  kind: 'table';
  title?: string;
  columns: { key: string; label: string; format?: NumberFormat }[];
  rows: Record<string, string | number | null>[];
}

export interface ChartArtifact {
  kind: 'chart';
  title?: string;
  chartType: 'bar' | 'line';
  categories: string[];
  series: { name: string; data: number[] }[];
  format?: NumberFormat;
}

export interface LinkArtifact {
  kind: 'link';
  /** Report id from the frontend catalogue (src/lib/reportsCatalog.ts). */
  reportId: string;
  label?: string;
  query?: Record<string, string>;
}

export type AiArtifact =
  | KpiArtifact
  | TableArtifact
  | ChartArtifact
  | LinkArtifact;

// ── Stream events ───────────────────────────────────────────────────────────

export type AiStreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_start'; id: string; name: string; label: string }
  | { type: 'tool_end'; id: string; ok: boolean; ms: number }
  | { type: 'artifact'; artifact: AiArtifact }
  | { type: 'error'; code: string; message: string }
  | { type: 'done' };

export interface AiHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiAskBody {
  question: string;
  /** Prior turns — the client owns the transcript, the server stores nothing. */
  history?: AiHistoryTurn[];
  locale?: 'uz' | 'ru' | 'en';
  /**
   * Model override for THIS ask only (from the chat's model picker). Omitted ⇒
   * the saved default. The provider is fixed server-side; an id it doesn't
   * recognise comes back as AI_UNKNOWN_MODEL.
   */
  model?: string;
}

/**
 * Localizes a stream `error` event's code via the apiErrors catalogue. The raw
 * English `message` is deliberately not shown — an unknown code falls back to
 * the caller's localized generic.
 */
export function translateStreamError(code: string, fallback: string): string {
  return translateApiError({ code }, fallback);
}

/**
 * Asks the assistant a question and delivers each parsed stream event to
 * `onEvent`. Resolves when the stream ends (or the signal aborts — an abort is
 * a deliberate user action, not an error, so it resolves quietly). A non-2xx
 * response (403 not-configured / plan, 429 rate limit) is a plain JSON error
 * envelope, not a stream — it throws a localized ApiError instead.
 */
export async function askAi(
  body: AiAskBody,
  {
    onEvent,
    signal,
  }: { onEvent: (event: AiStreamEvent) => void; signal?: AbortSignal },
): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/ai/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = await response.json().catch(() => undefined);
    throw makeApiError(error, 'AI request failed');
  }
  if (!response.body) {
    throw makeApiError(undefined, 'AI request failed');
  }

  // One SSE frame → zero or one events. Multi-line `data:` frames are joined
  // per the SSE spec; comment lines and malformed JSON are skipped so a single
  // bad frame can't kill the rest of the answer.
  const emitFrame = (frame: string) => {
    const data = frame
      .split('\n')
      .map((line) => line.replace(/\r$/, ''))
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data) return;
    let event: AiStreamEvent;
    try {
      event = JSON.parse(data) as AiStreamEvent;
    } catch {
      return;
    }
    onEvent(event);
  };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Frames are separated by a blank line. Everything after the last
      // separator stays buffered — that's the partial frame the next chunk
      // will complete.
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        emitFrame(frame);
      }
    }
    // Flush any final frame the server ended without a trailing separator.
    buffer += decoder.decode();
    if (buffer.trim()) emitFrame(buffer);
  } catch (err) {
    // Stop button / navigation: the caller aborted on purpose — not an error.
    if (signal?.aborted) return;
    throw err;
  } finally {
    reader.releaseLock();
  }
}
