import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AddProductForm from "@/components/ecommerce/AddProductForm";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Add Product | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Add Product page for TailAdmin Tailwind CSS Admin Dashboard Template",
};

export default function AddProduct() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Add Products" />
      <div className="space-y-6">
        <AddProductForm />
      </div>
    </div>
  );
}
