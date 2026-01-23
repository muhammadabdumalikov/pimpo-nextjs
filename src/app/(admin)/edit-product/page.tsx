"use client";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AddProductForm from "@/components/ecommerce/AddProductForm";
import { useSearchParams } from "next/navigation";
import React from "react";

export default function EditProduct() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');

  if (!productId) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Edit Product" />
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
            <p className="text-gray-500 dark:text-gray-400">Product ID is required</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Edit Product" />
      <div className="space-y-6">
        <AddProductForm productId={productId} />
      </div>
    </div>
  );
}
