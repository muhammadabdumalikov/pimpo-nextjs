import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ReceiptTemplateManagement from "@/components/settings/receipt-template/ReceiptTemplateManagement";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Receipt Management | KPOS - Next.js Dashboard Template",
  description:
    "This is Receipt Management page for KPOS Tailwind CSS Admin Dashboard Template",
};

export default function ReceiptsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Receipt Management" titleKey="sidebar.receiptManagement" />
      <div className="space-y-6">
        <ReceiptTemplateManagement />
      </div>
    </div>
  );
}

