import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import CancelledReport from "@/components/reports/CancelledReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bekor qilingan cheklar | Pimpo",
  description: "Bekor qilingan cheklar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Bekor qilingan cheklar" titleKey="sidebar.reportsCancelled" />
      <BackButton href="/reports" />
      <CancelledReport />
    </div>
  );
}
