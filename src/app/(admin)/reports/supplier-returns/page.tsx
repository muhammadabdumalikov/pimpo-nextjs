import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import SupplierReturnsReport from "@/components/reports/SupplierReturnsReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qaytarishlar | Pimpo",
  description: "Qaytarishlar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Qaytarishlar" titleKey="sidebar.reportsSupplierReturns" />
      <BackButton href="/reports" />
      <SupplierReturnsReport />
    </div>
  );
}
