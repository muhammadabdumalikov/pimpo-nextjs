import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Checkout from "@/components/checkout/Checkout";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Checkout | Pimpo - Next.js Dashboard Template",
  description:
    "This is Checkout page for Pimpo Tailwind CSS Admin Dashboard Template",
};

export default function CheckoutPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Checkout" />
      <div className="space-y-6">
        <Checkout />
      </div>
    </div>
  );
}

