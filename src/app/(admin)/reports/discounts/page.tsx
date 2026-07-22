import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import DiscountsReport from "@/components/reports/DiscountsReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chegirmalar | Pimpo",
  description: "Chegirmalar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Chegirmalar" titleKey="sidebar.reportsDiscounts" />
      <BackButton href="/reports" />
      <DiscountsReport />
    </div>
  );
}
