import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import SuppliersReport from "@/components/reports/SuppliersReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ta'minotchilar | Pimpo",
  description: "Ta'minotchilar hisoboti — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Ta'minotchilar" titleKey="sidebar.reportsSuppliers" />
      <BackButton href="/reports" />
      <SuppliersReport />
    </div>
  );
}
