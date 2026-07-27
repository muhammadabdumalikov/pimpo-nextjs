import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Payroll from "@/components/finance/Payroll";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Ish haqi | Pimpo",
  description: "Xodimlar ish haqi: hisoblash, to'lov, avans va qoldiq",
};

export default function PayrollPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Ish haqi" titleKey="sidebar.financePayroll" />
      <Payroll />
    </div>
  );
}
