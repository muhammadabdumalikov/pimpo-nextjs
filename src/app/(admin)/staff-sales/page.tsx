import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StaffSales from "@/components/ecommerce/StaffSales";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Xodimlar sotuvi | KPOS",
  description: "Kassir (xodim) bo'yicha sotuv hisoboti.",
};

export default function StaffSalesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Staff Sales" titleKey="sidebar.staffSales" />
      <div className="space-y-6">
        <StaffSales />
      </div>
    </div>
  );
}
