import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import StockReport from "@/components/reports/StockReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qoldiqlar | Pimpo",
  description: "Qoldiqlar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Qoldiqlar" titleKey="sidebar.reportsStock" />
      <BackButton href="/reports" />
      <StockReport />
    </div>
  );
}
