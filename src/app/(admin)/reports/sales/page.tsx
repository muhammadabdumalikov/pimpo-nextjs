import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import SalesReport from "@/components/reports/SalesReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sotuvlar | Pimpo",
  description: "Sotuvlar dinamikasi — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Sotuvlar" titleKey="sidebar.reportsSales" />
      <BackButton href="/reports" />
      <SalesReport />
    </div>
  );
}
