import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import InventoryManagement from "@/components/ecommerce/InventoryManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Inventory Management | Pimpo - Next.js Dashboard Template",
  description:
    "This is Next.js Inventory Management page for Pimpo Tailwind CSS Admin Dashboard Template",
};

export default function InventoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Inventory" />
      <div className="space-y-6">
        <InventoryManagement />
      </div>
    </div>
  );
}

