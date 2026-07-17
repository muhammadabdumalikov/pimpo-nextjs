import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FinanceCategoriesManager from "@/components/finance/FinanceCategoriesManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Moliyaviy toifalar | Pimpo",
  description: "Manage finance income/expense categories",
};

export default function FinanceCategoriesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Moliyaviy toifalar" titleKey="sidebar.financeCategories" />
      <FinanceCategoriesManager />
    </div>
  );
}
