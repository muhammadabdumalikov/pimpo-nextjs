import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import IntegrationsManagement from "@/components/settings/IntegrationsManagement";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ilovalar | Pimpo",
  description: "Integrations — connected Telegram chats",
};

export default function ApplicationsPage() {
  return (
    <div>
      <PageBreadcrumb
        pageTitle="Ilovalar"
        titleKey="settingsPages.integrations.title"
      />
      <div className="space-y-6">
        <IntegrationsManagement />
      </div>
    </div>
  );
}
