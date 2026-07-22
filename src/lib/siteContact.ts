// Public contact channels shown on the marketing landing.
//
// FILL THESE IN: each channel renders on the landing page only when its value
// is non-empty, so nothing fake ever shows. Until filled, the contact block
// stays hidden.
export const SITE_CONTACT = {
  /** Full Telegram link, e.g. "https://t.me/kpos_uz" */
  telegram: "",
  /** Display phone, e.g. "+998 90 123 45 67" (tel: link is derived from it) */
  phone: "+998 93 737 77 93",
};

export const hasAnyContact = () =>
  Boolean(SITE_CONTACT.telegram || SITE_CONTACT.phone);
