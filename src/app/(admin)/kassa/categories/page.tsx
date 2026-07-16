import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CashCategoriesManager from "@/components/kassa/CashCategoriesManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Toifalar | Pimpo",
  description: "Manage cash operation categories",
};

export default function KassaCategoriesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Toifalar" titleKey="kassa.categories" />
      <CashCategoriesManager />
    </div>
  );
}
