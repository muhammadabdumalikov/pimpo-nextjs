import type { Metadata } from "next";
import { ProductV2Metrics } from "@/components/ecommerce/ProductV2Metrics";
import MonthlySalesChartV2 from "@/components/ecommerce/MonthlySalesChartV2";
import MonthlyTargetV2 from "@/components/ecommerce/MonthlyTargetV2";
import RecentProductsV2 from "@/components/ecommerce/RecentProductsV2";

export const metadata: Metadata = {
  title:
    "Next.js Product V2 Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Product V2 Dashboard for TailAdmin Dashboard Template",
};

export default function DashboardV2() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <ProductV2Metrics />
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-7">
        <MonthlySalesChartV2 />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTargetV2 />
      </div>

      <div className="col-span-12">
        <RecentProductsV2 />
      </div>
    </div>
  );
}
