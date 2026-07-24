import BackButton from "@/components/common/BackButton";
import BillzMigration from "@/components/settings/BillzMigration";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "BiLLZ | Pimpo",
  description: "BiLLZ 2.0 → KPOS data migration wizard",
};

export default function BillzIntegrationPage() {
  return (
    <div>
      <BackButton href="/settings/applications" />
      <div className="space-y-6">
        <BillzMigration />
      </div>
    </div>
  );
}
