import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AccountsState from "@/components/finance/AccountsState";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Hisoblar holati | Pimpo",
  description: "Current balance per account (cash / non-cash, UZS / USD)",
};

export default function FinanceStatePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Hisoblar holati" titleKey="sidebar.financeState" />
      <AccountsState />
    </div>
  );
}
