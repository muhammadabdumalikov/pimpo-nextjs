import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import AbcReport from "@/components/reports/AbcReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ABC-tahlil | Pimpo",
  description: "ABC-tahlil — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="ABC-tahlil" titleKey="sidebar.reportsAbc" />
      <BackButton href="/reports" />
      <AbcReport />
    </div>
  );
}
