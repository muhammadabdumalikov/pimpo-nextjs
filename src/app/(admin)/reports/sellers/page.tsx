import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import SellersReport from "@/components/reports/SellersReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sotuvchilar | Pimpo",
  description: "Sotuvchilar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Sotuvchilar" titleKey="sidebar.reportsSellers" />
      <BackButton href="/reports" />
      <SellersReport />
    </div>
  );
}
