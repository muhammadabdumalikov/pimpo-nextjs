import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PaymentMethodsManagement from "@/components/settings/PaymentMethodsManagement";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "To'lov turlari | Pimpo",
  description: "Configurable payment methods",
};

export default function PaymentMethodsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="To'lov turlari" titleKey="settingsPages.paymentMethods.title" />
      <div className="space-y-6">
        <PaymentMethodsManagement />
      </div>
    </div>
  );
}
