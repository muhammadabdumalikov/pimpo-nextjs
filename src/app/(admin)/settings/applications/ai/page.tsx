import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BackButton from "@/components/common/BackButton";
import AiProviderSettings from "@/components/settings/AiProviderSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI yordamchi | Pimpo",
  description: "AI assistant — bring your own API key",
};

export default function AiIntegrationPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="AI yordamchi" titleKey="ai.title" />
      <BackButton href="/settings/applications" />
      <div className="space-y-6">
        <AiProviderSettings />
      </div>
    </div>
  );
}
