import AiAssistant from "@/components/ai/AiAssistant";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI yordamchi | Pimpo",
  description: "AI yordamchi — do'kon ma'lumotlari bo'yicha savol-javob",
};

// No breadcrumb: the workspace card carries its own toolbar and fills the
// viewport height on its own.
export default function AiPage() {
  return <AiAssistant />;
}
