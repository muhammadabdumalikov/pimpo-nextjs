// Maps backend error codes to localized messages (uz/ru/en).
//
// The backend returns a uniform error envelope: { statusCode, code, message, params? }.
// `code` is a stable machine key; this module resolves it to a message in the
// user's current locale using the `apiErrors` namespace of the i18n catalogs.
// `message` (English) is only a fallback for codes not yet translated.
import enMessages from '@/i18n/messages/en.json';
import ruMessages from '@/i18n/messages/ru.json';
import uzMessages from '@/i18n/messages/uz.json';
import uzcMessages from '@/i18n/messages/uzc.json';

type Catalog = {apiErrors?: Record<string, string>};

const catalogs: Record<string, Catalog> = {
  en: enMessages as Catalog,
  ru: ruMessages as Catalog,
  uz: uzMessages as Catalog,
  uzc: uzcMessages as Catalog,
};

const DEFAULT_LOCALE = 'en';

// The backend error envelope, as parsed from a failed response body.
export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  params?: Record<string, unknown>;
}

// Reads the locale the user selected (same key the LocaleProvider persists).
function currentLocale(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  return localStorage.getItem('locale') || DEFAULT_LOCALE;
}

// Replaces `{token}` placeholders with param values; unknown tokens are kept.
function interpolate(
  template: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params && params[key] != null ? String(params[key]) : match,
  );
}

/**
 * Resolves a backend error code to a localized, interpolated message.
 * Fallback chain: current locale → English → backend `message` → generic.
 */
export function translateApiError(
  body: ApiErrorBody | undefined,
  fallback = 'Something went wrong',
): string {
  const code = body?.code;
  const params = body?.params;

  if (code) {
    const locale = currentLocale();
    const template =
      catalogs[locale]?.apiErrors?.[code] ??
      catalogs[DEFAULT_LOCALE]?.apiErrors?.[code];
    if (template) return interpolate(template, params);
  }

  // No code (or unknown code): fall back to the backend's own message.
  const raw = body?.message;
  const rawText = Array.isArray(raw) ? raw.join(', ') : raw;
  return rawText || fallback;
}

// Error thrown by the API layer. `.message` is already localized, so existing
// UI (toasts) shows the right language with no change. `.code`/`.params`/
// `.status` are exposed for callers that want to branch on the specific error.
export class ApiError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly params?: Record<string, unknown>;

  constructor(body: ApiErrorBody | undefined, fallback?: string) {
    super(translateApiError(body, fallback));
    this.name = 'ApiError';
    this.code = body?.code;
    this.status = body?.statusCode;
    this.params = body?.params;
  }
}

// Convenience factory used at every throw site in the API layer.
export function makeApiError(
  body: ApiErrorBody | undefined,
  fallback?: string,
): ApiError {
  return new ApiError(body, fallback);
}
