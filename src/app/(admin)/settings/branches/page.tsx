import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BranchesManagement from "@/components/settings/BranchesManagement";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Do'konlar | Pimpo",
  description: "Manage branches / stores",
};

export default function BranchesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Do'konlar" titleKey="branches.title" />
      <div className="space-y-6">
        <BranchesManagement />
      </div>
    </div>
  );
}
