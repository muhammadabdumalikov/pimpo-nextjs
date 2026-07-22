import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import TrafficReport from "@/components/reports/TrafficReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yuklama | Pimpo",
  description: "Soat va hafta kunlari bo'yicha yuklama — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Yuklama" titleKey="sidebar.reportsTraffic" />
      <BackButton href="/reports" />
      <TrafficReport />
    </div>
  );
}
