import SubscriptionManagement from "@/components/admin/SubscriptionManagement";
import SubscriptionStatus from "@/components/admin/SubscriptionStatus";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Obuna boshqaruvi | Pimpo",
  description: "Current subscription status and plan comparison",
};

export default function SubscriptionManagementPage() {
  return (
    <>
      <PageBreadcrumb pageTitle="Obuna boshqaruvi" titleKey="sidebar.subscriptionManagement" />
      <div className="space-y-6">
        <SubscriptionStatus />
        <SubscriptionManagement />
      </div>
    </>
  );
}
