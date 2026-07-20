import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProductPerformance from "@/components/ecommerce/ProductPerformance";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Product Performance | KPOS - Next.js Dashboard Template",
  description:
    "This is Next.js Product Performance page for KPOS Tailwind CSS Admin Dashboard Template",
};

export default function ProductPerformancePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Product Performance" titleKey="sidebar.productPerformance" />
      <div className="space-y-6">
        <ProductPerformance />
      </div>
    </div>
  );
}

