import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReceiptManagement from "@/components/settings/ReceiptManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Receipt Management | Pimpo - Next.js Dashboard Template",
  description:
    "This is Receipt Management page for Pimpo Tailwind CSS Admin Dashboard Template",
};

export default function ReceiptsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Receipt Management" titleKey="sidebar.receiptManagement" />
      <div className="space-y-6">
        <ReceiptManagement />
      </div>
    </div>
  );
}

