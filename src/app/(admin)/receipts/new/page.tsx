import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import CreateReceipt from "@/components/procurement/CreateReceipt";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Purchase Order | Pimpo",
  description: "Create a purchase order and receive goods into stock",
};

export default function NewReceiptPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="New Purchase Order" titleKey="goodsReceipt.createTitle" />
      <BackButton href="/receipts" />
      <div className="space-y-6">
        <CreateReceipt />
      </div>
    </div>
  );
}
