import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import InventoryManagement from "@/components/ecommerce/InventoryManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Ombor holati | Pimpo",
  description: "Product stock levels and status",
};

export default function InventoryPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Ombor holati" titleKey="inventory.title" />
      <InventoryManagement />
    </div>
  );
}
