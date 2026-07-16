import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CashOperations from "@/components/kassa/CashOperations";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Kassa operatsiyalari | Pimpo",
  description: "Cash in/out operations for a register's open shift",
};

export default function CashOperationsPage() {
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Kassa operatsiyalari"
        titleKey="kassa.operations"
      />
      <CashOperations />
    </div>
  );
}
