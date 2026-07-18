import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import StockTakeCount from "@/components/stock-take/StockTakeCount";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventarizatsiya | Pimpo",
  description: "Stock-take count",
};

export default async function StockTakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <PageBreadcrumb pageTitle="Inventarizatsiya" titleKey="stockTakes.title" />
      <BackButton href="/stock-takes" />
      <StockTakeCount id={id} />
    </div>
  );
}
