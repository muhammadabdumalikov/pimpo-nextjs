import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SubscriptionManagement from "@/components/admin/SubscriptionManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Subscription Management | TailAdmin - Next.js Dashboard Template",
  description: "Manage menu permissions for subscription tiers",
};

export default function SubscriptionManagementPage() {
  return (
    <>
      <PageBreadcrumb pageTitle="Subscription Management" />
      <SubscriptionManagement />
    </>
  );
}
