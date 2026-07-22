import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import TransfersReport from "@/components/reports/TransfersReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transferlar | Pimpo",
  description: "Filiallararo transferlar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Transferlar" titleKey="sidebar.reportsTransfers" />
      <BackButton href="/reports" />
      <TransfersReport />
    </div>
  );
}
