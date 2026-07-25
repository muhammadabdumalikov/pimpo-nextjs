import BackButton from "@/components/common/BackButton";
import IntegrationsManagement from "@/components/settings/IntegrationsManagement";
import TelegramNotifications from "@/components/settings/TelegramNotifications";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Telegram | KPOS",
  description: "Telegram integration — connected chats",
};

export default function TelegramIntegrationPage() {
  return (
    <div>
      <BackButton href="/settings/applications" />
      <div className="space-y-6">
        <IntegrationsManagement />
        <TelegramNotifications />
      </div>
    </div>
  );
}
