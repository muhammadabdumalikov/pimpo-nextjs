import type { ReceiptTemplate } from "@/lib/api";
import { normalizeFields, INFO_FIELD_KEYS, FOOTER_LINK_KEYS } from "@/lib/receiptTemplate";
import type {
  ReceiptOutLabels,
  ReceiptTplStrings,
} from "@/lib/receiptTemplateI18n";

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  discount?: number;
  attributes?: string;
}

export interface ReceiptData {
  saleNumber: string;
  storeName: string;
  legalName?: string;
  inn?: string;
  address?: string;
  contacts?: string;
  date: string;
  time?: string;
  seller?: string;
  cashier?: string;
  customer?: string;
  customerPhone?: string;
  customerBalance?: number;
  customerDebt?: number;
  saleComment?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency?: string;
}

const nf = new Intl.NumberFormat("ru-RU");
const money = (n: number, cur = "сум") => `${nf.format(Math.round(n))} ${cur}`;

// Minimal HTML escaping for text interpolated into the receipt markup.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Strip anything but the small set of tags the note editor can produce, so a
// stored footerText can be rendered without opening an injection hole.
const ALLOWED_TAGS = /^(b|i|u|s|strike|em|strong|br|div|p|ul|ol|li|span)$/i;
export function sanitizeNoteHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tag, attrs) => {
    if (!ALLOWED_TAGS.test(tag)) return "";
    // Keep only style="text-align:..." to preserve alignment; drop everything
    // else (onclick, src, href, etc.).
    const align = /text-align:\s*(left|right|center)/i.exec(attrs || "");
    const safeAttr = align ? ` style="text-align:${align[1]}"` : "";
    return m.startsWith("</") ? `</${tag.toLowerCase()}>` : `<${tag.toLowerCase()}${safeAttr}>`;
  });
}

// A lightweight visual barcode (deterministic bar widths from the code chars).
// Not scannable — a real symbology would need a library; this matches the
// preview's intent (show a barcode block + the human-readable number).
function barcodeHtml(code: string): string {
  const chars = (code || "0000").replace(/[^0-9A-Za-z]/g, "") || "0000";
  let bars = "";
  for (let i = 0; i < chars.length * 3; i++) {
    const c = chars.charCodeAt(i % chars.length) + i;
    const w = (c % 3) + 1;
    const black = c % 2 === 0;
    bars += `<span class="rc-bar" style="width:${w}px;background:${
      black ? "#000" : "transparent"
    }"></span>`;
  }
  return `<div class="rc-barcode">${bars}</div><div class="rc-barcode-num">${esc(code)}</div>`;
}

/** CSS shared by the live preview and the print output. */
export function receiptCss(widthMm: number): string {
  return `
  .rc {
    width: ${widthMm}mm;
    max-width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    padding: 4mm 3mm;
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.35;
    color: #000;
    background: #fff;
  }
  .rc * { box-sizing: border-box; }
  .rc-center { text-align: center; }
  .rc-logo { display: block; max-width: 70%; max-height: 80px; margin: 0 auto 6px; object-fit: contain; }
  .rc-extra { display: block; max-width: 90%; margin: 6px auto; object-fit: contain; }
  .rc-store { font-size: 15px; font-weight: 700; text-align: center; margin-bottom: 4px; }
  .rc-info { margin-bottom: 6px; }
  .rc-info div { display: flex; justify-content: space-between; gap: 6px; }
  .rc-hr { border-top: 1px dashed #000; margin: 6px 0; }
  .rc-item { margin-bottom: 4px; }
  .rc-item-name { font-weight: 600; }
  .rc-row { display: flex; justify-content: space-between; gap: 6px; }
  .rc-muted { color: #333; }
  .rc-totals .rc-row { margin: 2px 0; }
  .rc-total { font-weight: 700; font-size: 14px; }
  .rc-note { text-align: center; margin: 8px 0; }
  .rc-barcode { display: flex; justify-content: center; align-items: flex-end; height: 44px; gap: 0; margin-top: 8px; }
  .rc-bar { display: inline-block; height: 44px; }
  .rc-barcode-num { text-align: center; letter-spacing: 2px; font-size: 11px; }
  .rc-footer-links { margin-top: 6px; }
  .rc-footer-links div { text-align: center; }
  .rc-powered { text-align: center; margin-top: 8px; font-size: 10px; color: #444; }
  `;
}

// Info-field key → which of the printed-receipt labels to use for it.
const INFO_KEY_TO_OUT: Record<string, keyof ReceiptOutLabels> = {
  date: "date",
  workTime: "time",
  seller: "seller",
  cashier: "cashier",
  customer: "customer",
  contacts: "contacts",
  customerPhone: "customerPhone",
  saleComment: "comment",
  inn: "inn",
  legalName: "legalName",
  address: "address",
  productCount: "products",
};

function infoLineValue(key: string, d: ReceiptData): string | null {
  switch (key) {
    case "date":
      return d.date;
    case "workTime":
      return d.time ?? null;
    case "seller":
      return d.seller ?? null;
    case "cashier":
      return d.cashier ?? null;
    case "customer":
      return d.customer ?? null;
    case "contacts":
      return d.contacts ?? null;
    case "customerPhone":
      return d.customerPhone ?? null;
    case "saleComment":
      return d.saleComment ?? null;
    case "inn":
      return d.inn ?? null;
    case "legalName":
      return d.legalName ?? null;
    case "address":
      return d.address ?? null;
    case "productCount":
      return String(d.items.reduce((s, it) => s + it.qty, 0));
    default:
      return null;
  }
}

/** Build the receipt body HTML from a template config + sale data. */
export function buildReceiptHtml(
  template: ReceiptTemplate,
  d: ReceiptData,
  strings: ReceiptTplStrings,
): string {
  const L = strings.out;
  const info = normalizeFields(template.infoFields, INFO_FIELD_KEYS);
  const footer = normalizeFields(template.footerLinks, FOOTER_LINK_KEYS);
  const on = (key: string, list = info) =>
    list.find((f) => f.key === key)?.enabled ?? false;

  const cur = d.currency ?? "сум";
  const parts: string[] = ['<div class="rc">'];

  // Logo
  if (template.showLogo && template.logoUrl) {
    parts.push(`<img class="rc-logo" src="${esc(template.logoUrl)}" alt="logo" />`);
  }

  // Store name (info field storeName)
  if (on("storeName")) {
    parts.push(`<div class="rc-store">${esc(d.storeName)}</div>`);
  }

  // Info lines (in configured order), skipping structural keys handled below.
  const structural = new Set([
    "storeName",
    "showProducts",
    "itemSums",
    "itemDiscounts",
    "receiptSums",
    "receiptDiscounts",
  ]);
  const infoLines: string[] = [];
  for (const f of info) {
    if (!f.enabled || structural.has(f.key)) continue;
    const val = infoLineValue(f.key, d);
    if (val == null || val === "") continue;
    const outKey = INFO_KEY_TO_OUT[f.key];
    const label = outKey ? L[outKey] : f.key;
    infoLines.push(
      `<div><span>${esc(label)}</span><span>${esc(val)}</span></div>`,
    );
  }
  // Sale number always shown at the top of the info block.
  infoLines.unshift(
    `<div><span>${esc(L.saleNumber)}</span><span>${esc(d.saleNumber)}</span></div>`,
  );
  parts.push(`<div class="rc-info">${infoLines.join("")}</div>`);

  parts.push('<div class="rc-hr"></div>');

  // Products
  if (on("showProducts")) {
    const showItemSums = on("itemSums");
    const showItemDiscounts = on("itemDiscounts");
    d.items.forEach((it, i) => {
      const lineSum = it.qty * it.price - (it.discount ?? 0);
      let block = `<div class="rc-item"><div class="rc-item-name">${i + 1}. ${esc(it.name)}</div>`;
      if (template.showProductAttributes && it.attributes) {
        block += `<div class="rc-muted">${esc(it.attributes)}</div>`;
      }
      block += `<div class="rc-row"><span>${it.qty} × ${money(it.price, cur)}</span>`;
      block += showItemSums ? `<span>${money(lineSum, cur)}</span>` : `<span></span>`;
      block += `</div>`;
      if (showItemDiscounts && (it.discount ?? 0) > 0) {
        block += `<div class="rc-row rc-muted"><span>${esc(L.discount)}</span><span>-${money(it.discount!, cur)}</span></div>`;
      }
      block += `</div>`;
      parts.push(block);
    });
    parts.push('<div class="rc-hr"></div>');
  }

  // Totals
  parts.push('<div class="rc-totals">');
  if (on("receiptSums")) {
    parts.push(
      `<div class="rc-row"><span>${esc(L.subtotal)}</span><span>${money(d.subtotal, cur)}</span></div>`,
    );
  }
  if (on("receiptDiscounts") && d.discount > 0) {
    const pct = d.subtotal > 0 ? Math.round((d.discount / d.subtotal) * 100) : 0;
    parts.push(
      `<div class="rc-row"><span>${esc(L.discount)}${pct ? ` (${pct}%)` : ""}</span><span>-${money(d.discount, cur)}</span></div>`,
    );
  }
  parts.push(
    `<div class="rc-row rc-total"><span>${esc(L.total)}</span><span>${money(d.total, cur)}</span></div>`,
  );
  parts.push("</div>");

  // Customer balance / debt
  if (template.showCustomerBalance && d.customerBalance != null) {
    parts.push(
      `<div class="rc-row"><span>${esc(L.balance)}</span><span>${money(d.customerBalance, cur)}</span></div>`,
    );
  }
  if (template.showCustomerDebt && d.customerDebt != null) {
    parts.push(
      `<div class="rc-row"><span>${esc(L.debt)}</span><span>${money(d.customerDebt, cur)}</span></div>`,
    );
  }

  // Extra image
  if (template.extraImageUrl) {
    parts.push(`<img class="rc-extra" src="${esc(template.extraImageUrl)}" alt="" />`);
  }

  // Footer note (rich text)
  if (template.footerText) {
    parts.push(`<div class="rc-note">${sanitizeNoteHtml(template.footerText)}</div>`);
  }

  // Footer links + barcode (in configured order)
  const linkLines: string[] = [];
  let barcode = "";
  for (const f of footer) {
    if (!f.enabled) continue;
    if (f.key === "barcode") {
      barcode = barcodeHtml(d.saleNumber);
    } else if (f.value) {
      const label = strings.footerLinks[f.key] ?? f.key;
      linkLines.push(`<div>${esc(label)}: ${esc(f.value)}</div>`);
    }
  }
  if (linkLines.length) {
    parts.push(`<div class="rc-footer-links">${linkLines.join("")}</div>`);
  }
  if (barcode) parts.push(barcode);

  // Powered by
  if (template.showPoweredBy) {
    parts.push(`<div class="rc-powered">${esc(L.poweredBy)}</div>`);
  }

  parts.push("</div>");
  return parts.join("");
}

/** Sample sale used by the editor's live preview. */
export function sampleReceiptData(storeName?: string): ReceiptData {
  const now = new Date();
  return {
    saleNumber: "1024",
    storeName: storeName || "Store",
    legalName: 'ООО "Riviera Trade"',
    inn: "301234567",
    address: "г. Ташкент, ул. Амира Темура, 15",
    contacts: "+998 90 123 45 67",
    date: now.toLocaleDateString("ru-RU"),
    time: now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    seller: "Азиз",
    cashier: "Дилноза",
    customer: "Иван Петров",
    customerPhone: "+998 91 234 56 78",
    customerBalance: 50000,
    customerDebt: 0,
    saleComment: "",
    items: [
      { name: "Футболка", qty: 2, price: 100000, discount: 20000, attributes: "Размер M, Синий" },
      { name: "Джинсы", qty: 1, price: 250000 },
    ],
    subtotal: 450000,
    discount: 20000,
    total: 430000,
    currency: "сум",
  };
}

/**
 * Print a built receipt via a hidden iframe so the app page is not disturbed.
 * widthMm is the thermal paper width (58 or 80).
 */
export function printReceiptHtml(bodyHtml: string, widthMm: number): void {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8" />
    <title>Чек</title>
    <style>
      @page { size: ${widthMm}mm auto; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      ${receiptCss(widthMm)}
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>${bodyHtml}</body></html>`);
  doc.close();

  const win = iframe.contentWindow;
  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };
  // Give the browser a tick to lay out (and load the logo image) before print.
  const doPrint = () => {
    win?.focus();
    win?.print();
    cleanup();
  };
  const img = iframe.contentDocument?.querySelector("img");
  if (img && !(img as HTMLImageElement).complete) {
    img.addEventListener("load", doPrint, { once: true });
    img.addEventListener("error", doPrint, { once: true });
    setTimeout(doPrint, 1500);
  } else {
    setTimeout(doPrint, 150);
  }
}
