import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReportsIndex from "@/components/reports/ReportsIndex";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hisobotlar | Pimpo",
  description: "Hisobotlar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Hisobotlar" titleKey="sidebar.reports" />
      <ReportsIndex />
    </div>
  );
}
