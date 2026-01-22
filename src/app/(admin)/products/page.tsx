import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProductsList from "@/components/ecommerce/ProductsList";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Products | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Products page for TailAdmin Tailwind CSS Admin Dashboard Template",
};

export default function Products() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Products" />
      <div className="space-y-6">
        <ProductsList />
      </div>
    </div>
  );
}
