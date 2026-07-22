import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UnitsManagement from "@/components/settings/UnitsManagement";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "O'lchov birliklari | Pimpo",
  description: "Units of measure and precision",
};

export default function UnitsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="O'lchov birliklari" titleKey="settingsPages.units.title" />
      <div className="space-y-6">
        <UnitsManagement />
      </div>
    </div>
  );
}
