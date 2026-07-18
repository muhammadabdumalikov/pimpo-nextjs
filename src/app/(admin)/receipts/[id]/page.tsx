import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import ReceiptDetail from "@/components/procurement/ReceiptDetail";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchase Order | Pimpo",
  description: "Purchase order details",
};

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <PageBreadcrumb pageTitle="Purchase Order" titleKey="goodsReceipt.detailTitle" />
      <BackButton href="/receipts" />
      <div className="space-y-6">
        <ReceiptDetail id={id} />
      </div>
    </div>
  );
}
