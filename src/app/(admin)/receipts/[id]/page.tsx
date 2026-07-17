import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReceiptDetail from "@/components/procurement/ReceiptDetail";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goods Receipt | KPOS",
  description: "Goods receipt details",
};

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <PageBreadcrumb pageTitle="Goods Receipt" titleKey="goodsReceipt.detailTitle" />
      <div className="space-y-6">
        <ReceiptDetail id={id} />
      </div>
    </div>
  );
}
