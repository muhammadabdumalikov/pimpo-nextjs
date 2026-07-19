import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import PnlReport from "@/components/reports/PnlReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foyda va zararlar | Pimpo",
  description: "Foyda va zararlar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Foyda va zararlar" titleKey="sidebar.reportsPnl" />
      <BackButton href="/reports" />
      <PnlReport />
    </div>
  );
}
