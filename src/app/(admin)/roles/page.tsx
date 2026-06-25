import RolesManager from "@/components/admin/RolesManager";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roles | Pimpo",
  description: "Manage roles and which sidebar menus each role can see",
};

export default function RolesPage() {
  return (
    <>
      <PageBreadcrumb pageTitle="Roles" />
      <RolesManager />
    </>
  );
}
