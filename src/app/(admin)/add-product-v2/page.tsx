import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AddProductFormV2 from "@/components/ecommerce/AddProductFormV2";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Add Product V2 | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Add Product V2 page for TailAdmin Tailwind CSS Admin Dashboard Template",
};

export default function AddProductV2() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Add Product V2" />
      <div className="space-y-6">
        <AddProductFormV2 />
      </div>
    </div>
  );
}
