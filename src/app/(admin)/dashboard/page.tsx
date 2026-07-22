import type { Metadata } from "next";
import TodayOverview from "@/components/ecommerce/TodayOverview";
import { ProductMetrics } from "@/components/ecommerce/ProductMetrics";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import RecentProducts from "@/components/ecommerce/RecentProducts";

export const metadata: Metadata = {
  title: "Boshqaruv paneli | KPOS",
  description: "KPOS POS boshqaruv paneli — sotuv, nasiya va inventar bir joyda.",
};

export default function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <TodayOverview />
      </div>

      <div className="col-span-12">
        <ProductMetrics />
      </div>

      <div className="col-span-12 space-y-6 xl:col-span-7">
        <MonthlySalesChart />
      </div>

      <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      <div className="col-span-12">
        <RecentProducts />
      </div>
    </div>
  );
}
