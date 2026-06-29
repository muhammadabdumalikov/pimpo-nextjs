import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Checkout from "@/components/checkout/Checkout";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Cart | Pimpo - Next.js Dashboard Template",
  description:
    "This is Cart page for Pimpo Tailwind CSS Admin Dashboard Template",
};

export default function CartPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Cart" titleKey="sidebar.checkout" />
      <div className="space-y-6">
        <Checkout />
      </div>
    </div>
  );
}

