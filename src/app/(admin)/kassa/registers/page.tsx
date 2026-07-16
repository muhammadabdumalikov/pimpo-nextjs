import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import RegistersManager from "@/components/kassa/RegistersManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Kassalar | Pimpo",
  description: "Manage cash registers",
};

export default function KassaRegistersPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Kassalar" titleKey="kassa.registers" />
      <RegistersManager />
    </div>
  );
}
