import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SuppliersManagement from "@/components/procurement/SuppliersManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Suppliers | KPOS",
  description: "Manage suppliers for goods receipts",
};

export default function SuppliersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Suppliers" titleKey="sidebar.suppliers" />
      <div className="space-y-6">
        <SuppliersManagement />
      </div>
    </div>
  );
}
