import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import ReorderReport from "@/components/reports/ReorderReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qayta buyurtma | Pimpo",
  description: "Qayta buyurtma / tugash prognozi — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Qayta buyurtma" titleKey="sidebar.reportsReorder" />
      <BackButton href="/reports" />
      <ReorderReport />
    </div>
  );
}
