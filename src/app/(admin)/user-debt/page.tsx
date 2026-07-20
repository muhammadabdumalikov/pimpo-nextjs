import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UserDebtList from "@/components/ecommerce/UserDebtList";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js User Debt List | KPOS - Next.js Dashboard Template",
  description:
    "This is Next.js User Debt List page for KPOS Tailwind CSS Admin Dashboard Template",
};

export default function UserDebtPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="User Debt" titleKey="sidebar.userDebt" />
      <div className="space-y-6">
        <UserDebtList />
      </div>
    </div>
  );
}
