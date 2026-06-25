import StaffManager from "@/components/admin/StaffManager";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff | Pimpo",
  description: "Create staff accounts and assign roles",
};

export default function StaffPage() {
  return (
    <>
      <PageBreadcrumb pageTitle="Staff" />
      <StaffManager />
    </>
  );
}
