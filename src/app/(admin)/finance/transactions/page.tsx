import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import FinanceTransactions from "@/components/finance/FinanceTransactions";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Moliyaviy tranzaksiyalar | Pimpo",
  description: "All money movements: income, expense, transfer",
};

export default function FinanceTransactionsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Tranzaksiyalar" titleKey="sidebar.financeTransactions" />
      <FinanceTransactions />
    </div>
  );
}
