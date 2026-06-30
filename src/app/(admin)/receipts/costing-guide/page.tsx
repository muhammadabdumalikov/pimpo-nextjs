import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CostingGuide from "@/components/procurement/CostingGuide";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Costing Guide | Pimpo",
  description: "Inventory costing terminology — FIFO, weighted average, COGS",
};

export default function CostingGuidePage() {
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Costing Guide"
        titleKey="costingGuide.title"
      />
      <div className="space-y-6">
        <CostingGuide />
      </div>
    </div>
  );
}
