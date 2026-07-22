import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import TransferSuggestionsReport from "@/components/reports/TransferSuggestionsReport";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transfer tavsiyasi | Pimpo",
  description: "Filiallararo rebalans tavsiyalari — Pimpo hisobotlar",
};

export default function Page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Transfer tavsiyasi" titleKey="sidebar.reportsTransferSuggestions" />
      <BackButton href="/reports" />
      <TransferSuggestionsReport />
    </div>
  );
}
