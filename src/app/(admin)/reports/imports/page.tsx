import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import ImportsReport from "@/components/reports/ImportsReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Importlar | Pimpo",
  description: "Importlar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Importlar" titleKey="sidebar.reportsImports" />
      <BackButton href="/reports" />
      <ImportsReport />
    </div>
  );
}
