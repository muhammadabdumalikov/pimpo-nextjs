import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReceiptsManagement from "@/components/procurement/ReceiptsManagement";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Goods Receipts | Pimpo",
  description: "Incoming stock receipts (приход товаров)",
};

export default function ReceiptsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Goods Receipts" titleKey="goodsReceipt.title" />
      <div className="space-y-6">
        <ReceiptsManagement />
      </div>
    </div>
  );
}
