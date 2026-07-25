import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CustomersList from "@/components/loyalty/CustomersList";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Mijozlar | KPOS",
  description: "Mijozlar va ularning keshbek balansi",
};

export default function CustomersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Mijozlar" titleKey="sidebar.customers" />
      <CustomersList />
    </div>
  );
}
