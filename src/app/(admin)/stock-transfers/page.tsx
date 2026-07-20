import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import TransfersManager from "@/components/stock-transfer/TransfersManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Filiallararo ko'chirish | Pimpo",
  description: "Move stock between branches",
};

export default function StockTransfersPage() {
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Filiallararo ko'chirish"
        titleKey="transfers.title"
      />
      <TransfersManager />
    </div>
  );
}
