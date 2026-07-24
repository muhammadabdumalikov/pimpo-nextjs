import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AppsGrid from "@/components/settings/AppsGrid";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ilovalar | Pimpo",
  description: "Integrations — available apps",
};

export default function ApplicationsPage() {
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Ilovalar"
        titleKey="settingsPages.integrations.title"
      />
      <div className="space-y-6">
        <AppsGrid />
      </div>
    </div>
  );
}
