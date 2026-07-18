import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import CostingGuide from "@/components/procurement/CostingGuide";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Costing Guide | KPOS",
  description: "Inventory costing terminology — FIFO, weighted average, COGS",
};

export default function CostingGuidePage() {
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Costing Guide"
        titleKey="costingGuide.title"
      />
      <BackButton href="/receipts" />
      <div className="space-y-6">
        <CostingGuide />
      </div>
    </div>
  );
}
