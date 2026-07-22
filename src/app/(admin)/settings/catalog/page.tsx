import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SettingsComingSoon from "@/components/settings/SettingsComingSoon";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Katalog sozlamalari | Pimpo",
  description: "Catalog behavior settings",
};

export default function CatalogSettingsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Katalog sozlamalari" titleKey="settingsPages.catalog.title" />
      <div className="space-y-6">
        <SettingsComingSoon sectionKey="catalog" />
      </div>
    </div>
  );
}
