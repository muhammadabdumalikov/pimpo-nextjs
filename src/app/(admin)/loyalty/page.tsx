import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LoyaltyProgram from "@/components/loyalty/LoyaltyProgram";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Sodiqlik dasturi | KPOS",
  description: "Keshbek va bonus asosidagi sodiqlik dasturini sozlash",
};

export default function LoyaltyPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Sodiqlik dasturi" titleKey="sidebar.loyalty" />
      <LoyaltyProgram />
    </div>
  );
}
