import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import StockTakesManager from "@/components/stock-take/StockTakesManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Inventarizatsiya | Pimpo",
  description: "Stock-takes: count and reconcile inventory",
};

export default function StockTakesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Inventarizatsiya" titleKey="stockTakes.title" />
      <StockTakesManager />
    </div>
  );
}
