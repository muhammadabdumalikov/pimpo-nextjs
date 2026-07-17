import PageBreadcrumb from "@/components/common/PageBreadCrumb";
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
      <StockTakeCount id={id} />
    </div>
  );
}
