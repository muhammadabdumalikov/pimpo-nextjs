import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import ProductPerformance from "@/components/ecommerce/ProductPerformance";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mahsulotlar samaradorligi | Pimpo",
  description: "Mahsulotlar samaradorligi — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Mahsulotlar samaradorligi" titleKey="sidebar.productPerformance" />
      <BackButton href="/reports" />
      <ProductPerformance />
    </div>
  );
}
