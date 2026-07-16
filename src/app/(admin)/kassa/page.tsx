import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import KassaShifts from "@/components/kassa/KassaShifts";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Kassa | Pimpo",
  description: "Cashier shifts: open, cash in/out, close with Z-report",
};

export default function KassaPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Kassa" titleKey="sidebar.kassa" />
      <KassaShifts />
    </div>
  );
}
