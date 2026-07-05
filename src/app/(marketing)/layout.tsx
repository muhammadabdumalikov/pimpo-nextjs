import React from "react";

// Public marketing pages. Global providers (Auth, Locale, Theme, ...) come from
// the root layout, so this group only needs to render its children — no sidebar,
// no auth guard (unlike the (admin) group).
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
