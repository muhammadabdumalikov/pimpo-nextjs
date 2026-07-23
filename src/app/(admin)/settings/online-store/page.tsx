import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StoreSettings from "@/components/settings/StoreSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onlayn do'kon | Pimpo",
  description: "Online storefront settings",
};

export default function OnlineStoreSettingsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Onlayn do'kon" titleKey="onlineStore.title" />
      <div className="space-y-6">
        <StoreSettings />
      </div>
    </div>
  );
}
