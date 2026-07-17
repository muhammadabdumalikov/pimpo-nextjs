import type { ReceiptFieldConfig } from "@/lib/api";

// Canonical info-block field keys, in default order, with display labels.
// Mirrors the backend `INFO_FIELD_KEYS` constant.
export const INFO_FIELD_DEFS: { key: string; label: string }[] = [
  { key: "storeName", label: "Название магазина" },
  { key: "date", label: "Дата" },
  { key: "workTime", label: "Рабочее время" },
  { key: "seller", label: "Продавец" },
  { key: "cashier", label: "Кассир" },
  { key: "customer", label: "Клиент" },
  { key: "contacts", label: "Контакты" },
  { key: "customerPhone", label: "Телефон клиента" },
  { key: "saleComment", label: "Комментарий к продаже" },
  { key: "inn", label: "ИНН" },
  { key: "legalName", label: "Юридическое название" },
  { key: "address", label: "Адрес" },
  { key: "productCount", label: "Количество товаров" },
  { key: "showProducts", label: "Показывать товары" },
  { key: "itemDiscounts", label: "Поштучные скидки" },
  { key: "itemSums", label: "Поштучные суммы" },
  { key: "receiptDiscounts", label: "Скидки чека" },
  { key: "receiptSums", label: "Суммы чека" },
];

// Bottom-block keys (socials + barcode). `hasValue` marks the ones that carry
// a free-text handle/url shown next to the toggle.
export const FOOTER_LINK_DEFS: {
  key: string;
  label: string;
  hasValue: boolean;
  placeholder?: string;
}[] = [
  { key: "facebook", label: "Facebook", hasValue: true, placeholder: "facebook.com/..." },
  { key: "instagram", label: "Instagram", hasValue: true, placeholder: "@handle" },
  { key: "telegram", label: "Telegram", hasValue: true, placeholder: "@channel" },
  { key: "website", label: "Сайт", hasValue: true, placeholder: "example.com" },
  { key: "barcode", label: "Штрих-код", hasValue: false },
];

const INFO_LABELS = new Map(INFO_FIELD_DEFS.map((d) => [d.key, d.label]));
const FOOTER_DEFS = new Map(FOOTER_LINK_DEFS.map((d) => [d.key, d]));

export function infoFieldLabel(key: string): string {
  return INFO_LABELS.get(key) ?? key;
}

export function footerLinkLabel(key: string): string {
  return FOOTER_DEFS.get(key)?.label ?? key;
}

export function footerLinkHasValue(key: string): boolean {
  return FOOTER_DEFS.get(key)?.hasValue ?? false;
}

export function footerLinkPlaceholder(key: string): string | undefined {
  return FOOTER_DEFS.get(key)?.placeholder;
}

/**
 * Merge a stored field config with the canonical key set: keep the stored
 * order, drop unknown keys, and append any canonical keys the stored config is
 * missing (disabled) — so newly-added fields surface without a migration.
 */
export function normalizeFields(
  stored: ReceiptFieldConfig[] | null | undefined,
  canonicalKeys: string[],
): ReceiptFieldConfig[] {
  const known = new Set(canonicalKeys);
  const seen = new Set<string>();
  const result: ReceiptFieldConfig[] = [];
  for (const f of stored ?? []) {
    if (!known.has(f.key) || seen.has(f.key)) continue;
    seen.add(f.key);
    result.push({ key: f.key, enabled: !!f.enabled, value: f.value ?? "" });
  }
  for (const key of canonicalKeys) {
    if (!seen.has(key)) result.push({ key, enabled: false, value: "" });
  }
  return result;
}

export const INFO_FIELD_KEYS = INFO_FIELD_DEFS.map((d) => d.key);
export const FOOTER_LINK_KEYS = FOOTER_LINK_DEFS.map((d) => d.key);

// Default configuration for a freshly-created template. Mirrors the backend
// DEFAULT_INFO_FIELDS / DEFAULT_FOOTER_LINKS constants.
const DEFAULT_ENABLED_INFO = new Set([
  "storeName",
  "date",
  "cashier",
  "customer",
  "productCount",
  "showProducts",
  "itemSums",
  "receiptDiscounts",
  "receiptSums",
]);

export function defaultInfoFields(): ReceiptFieldConfig[] {
  return INFO_FIELD_KEYS.map((key) => ({
    key,
    enabled: DEFAULT_ENABLED_INFO.has(key),
  }));
}

export function defaultFooterLinks(): ReceiptFieldConfig[] {
  return FOOTER_LINK_KEYS.map((key) => ({
    key,
    enabled: key === "barcode",
    value: "",
  }));
}

/** Whether an info field key is currently enabled in a config list. */
export function isEnabled(fields: ReceiptFieldConfig[], key: string): boolean {
  return fields.find((f) => f.key === key)?.enabled ?? false;
}
