import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import DeadStockReport from "@/components/reports/DeadStockReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "O'lik zaxira | Pimpo",
  description: "O'lik va sekin zaxira — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="O'lik zaxira" titleKey="sidebar.reportsDeadStock" />
      <BackButton href="/reports" />
      <DeadStockReport />
    </div>
  );
}
