import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AddProductForm from "@/components/ecommerce/AddProductForm";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Add Product | Pimpo - Next.js Dashboard Template",
  description:
    "This is Next.js Add Product page for Pimpo Tailwind CSS Admin Dashboard Template",
};

export default function AddProduct() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Add Product" titleKey="sidebar.addProduct" />
      <div className="space-y-6">
        <AddProductForm />
      </div>
    </div>
  );
}
