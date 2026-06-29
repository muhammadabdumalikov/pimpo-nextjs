import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CategoriesList from "@/components/ecommerce/CategoriesList";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Categories | Pimpo - Next.js Dashboard Template",
  description: "Manage product categories for your store.",
};

export default function CategoriesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Categories" titleKey="sidebar.categories" />
      <div className="space-y-6">
        <CategoriesList />
      </div>
    </div>
  );
}
