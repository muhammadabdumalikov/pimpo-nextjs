import BackButton from "@/components/common/BackButton";
import StoreSettings from "@/components/settings/StoreSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onlayn do'kon | Pimpo",
  description: "Online storefront settings",
};

// An app detail page, so it wears the back-to-grid affordance the other three
// use instead of a breadcrumb — the grid is where you came from.
export default function OnlineStoreSettingsPage() {
  return (
    <div>
      <BackButton href="/settings/applications" />
      <div className="space-y-6">
        <StoreSettings />
      </div>
    </div>
  );
}
