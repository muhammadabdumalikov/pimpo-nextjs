import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import ShiftsReport from "@/components/reports/ShiftsReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kassa smenalari | Pimpo",
  description: "Kassa smenalari yig'masi — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Kassa smenalari" titleKey="sidebar.reportsShifts" />
      <BackButton href="/reports" />
      <ShiftsReport />
    </div>
  );
}
