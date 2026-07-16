import AllSales from "@/components/sales/AllSales";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "All Sales | KPOS",
  description: "All sales history with daily totals",
};

export default function SalesPage() {
  return <AllSales />;
}
