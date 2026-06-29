import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CreateReceipt from "@/components/procurement/CreateReceipt";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "New Goods Receipt | Pimpo",
  description: "Receive goods into stock",
};

export default function NewReceiptPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="New Goods Receipt" titleKey="goodsReceipt.createTitle" />
      <div className="space-y-6">
        <CreateReceipt />
      </div>
    </div>
  );
}
