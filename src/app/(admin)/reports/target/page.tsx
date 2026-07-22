import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import TargetReport from "@/components/reports/TargetReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reja / fakt | Pimpo",
  description: "Oylik reja vs fakt — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Reja / fakt" titleKey="sidebar.reportsTarget" />
      <BackButton href="/reports" />
      <TargetReport />
    </div>
  );
}
