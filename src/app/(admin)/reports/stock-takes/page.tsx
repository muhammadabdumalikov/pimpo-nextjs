import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import StockTakesReport from "@/components/reports/StockTakesReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventarizatsiya | Pimpo",
  description: "Inventarizatsiya — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Inventarizatsiya" titleKey="sidebar.reportsStockTakes" />
      <BackButton href="/reports" />
      <StockTakesReport />
    </div>
  );
}
