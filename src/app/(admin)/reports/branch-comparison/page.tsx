import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import BranchComparisonReport from "@/components/reports/BranchComparisonReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Filiallar | Pimpo",
  description: "Filiallar taqqoslash — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Filiallar" titleKey="sidebar.reportsBranchComparison" />
      <BackButton href="/reports" />
      <BranchComparisonReport />
    </div>
  );
}
