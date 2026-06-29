import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UpgradePlan from "@/components/admin/UpgradePlan";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Upgrade Plan | Pimpo - Next.js Dashboard Template",
  description: "Upgrade your subscription plan to unlock more features",
};

export default function UpgradePlanPage() {
  return (
    <>
      <PageBreadcrumb pageTitle="Upgrade Plan" titleKey="sidebar.upgradePlan" />
      <UpgradePlan />
    </>
  );
}
