import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SuppliersManagement from "@/components/procurement/SuppliersManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Suppliers | Pimpo",
  description: "Manage suppliers for goods receipts",
};

export default function SuppliersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Suppliers" />
      <div className="space-y-6">
        <SuppliersManagement />
      </div>
    </div>
  );
}
