import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import AssortmentReport from "@/components/reports/AssortmentReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assortiment | Pimpo",
  description: "Kategoriya va brend kesimida sotuv/marja — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Assortiment" titleKey="sidebar.reportsAssortment" />
      <BackButton href="/reports" />
      <AssortmentReport />
    </div>
  );
}
