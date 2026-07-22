import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import PaymentMethodsReport from "@/components/reports/PaymentMethodsReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "To'lov usullari | Pimpo",
  description: "To'lov usullari bo'yicha — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="To'lov usullari" titleKey="sidebar.reportsPaymentMethods" />
      <BackButton href="/reports" />
      <PaymentMethodsReport />
    </div>
  );
}
