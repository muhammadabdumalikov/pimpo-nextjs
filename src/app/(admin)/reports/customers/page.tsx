import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import CustomersReport from "@/components/reports/CustomersReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mijozlar | Pimpo",
  description: "Mijozlar — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Mijozlar" titleKey="sidebar.reportsCustomers" />
      <BackButton href="/reports" />
      <CustomersReport />
    </div>
  );
}
