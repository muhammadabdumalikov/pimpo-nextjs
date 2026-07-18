import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReceiptsManagement from "@/components/procurement/ReceiptsManagement";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase Orders | Pimpo",
  description: "Purchase orders (заказы поставщикам)",
};

export default function ReceiptsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Purchase Orders" titleKey="goodsReceipt.title" />
      <div className="space-y-6">
        <ReceiptsManagement />
      </div>
    </div>
  );
}
