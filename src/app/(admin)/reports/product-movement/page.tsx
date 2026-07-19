import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import ProductMovementReport from "@/components/reports/ProductMovementReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tovar harakati | Pimpo",
  description: "Tovar harakati — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Tovar harakati" titleKey="sidebar.reportsProductMovement" />
      <BackButton href="/reports" />
      <ProductMovementReport />
    </div>
  );
}
