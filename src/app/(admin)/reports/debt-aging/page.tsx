import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import DebtAgingReport from "@/components/reports/DebtAgingReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nasiya (aging) | Pimpo",
  description: "Nasiya qarzlar aging — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Nasiya (aging)" titleKey="sidebar.reportsDebtAging" />
      <BackButton href="/reports" />
      <DebtAgingReport />
    </div>
  );
}
