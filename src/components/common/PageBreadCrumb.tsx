import React from "react";

interface BreadcrumbProps {
  /** Literal title (used when `titleKey` is not provided). */
  pageTitle: string;
  /** Optional i18n key; when set, the translated value is shown instead. */
  titleKey?: string;
}

// The top page-title + "Bosh sahifa › …" breadcrumb bar is removed globally by
// design — every page already shows its own heading inside its content card.
// Kept as a no-op so the 35 existing call sites (and their pageTitle/titleKey
// props) don't need touching; delete the usages later for a full cleanup.
const PageBreadcrumb: React.FC<BreadcrumbProps> = () => null;

export default PageBreadcrumb;
