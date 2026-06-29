import SubscriptionManagement from "@/components/admin/SubscriptionManagement";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Management | Pimpo - Next.js Dashboard Template",
  description: "Manage menu permissions for subscription tiers",
};

export default function SubscriptionManagementPage() {
  return (
    <>
      <PageBreadcrumb pageTitle="Subscription Management" titleKey="sidebar.subscriptionManagement" />
      <SubscriptionManagement />
    </>
  );
}
