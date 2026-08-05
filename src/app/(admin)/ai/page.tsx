import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AiAssistant from "@/components/ai/AiAssistant";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI yordamchi | Pimpo",
  description: "AI yordamchi — do'kon ma'lumotlari bo'yicha savol-javob",
};

export default function AiPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="AI yordamchi" titleKey="ai.title" />
      <AiAssistant />
    </div>
  );
}
