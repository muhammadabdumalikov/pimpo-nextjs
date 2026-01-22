import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProductsListV2 from "@/components/ecommerce/ProductsListV2";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Products V2 | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Products V2 page for TailAdmin Tailwind CSS Admin Dashboard Template",
};

export default function ProductsV2() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Products V2" />
      <div className="space-y-6">
        <ProductsListV2 />
      </div>
    </div>
  );
}
