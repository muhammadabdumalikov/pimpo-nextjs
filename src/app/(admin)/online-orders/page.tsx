import type { Metadata } from "next";
import OnlineOrders from "@/components/online-orders/OnlineOrders";

export const metadata: Metadata = {
  title: "Online Orders | KPOS",
  description: "Orders placed through the online storefront",
};

export default function OnlineOrdersPage() {
  return <OnlineOrders />;
}
