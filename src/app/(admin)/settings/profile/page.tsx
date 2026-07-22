import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ProfileSettings from "@/components/settings/ProfileSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil | Pimpo",
  description: "Personal profile settings",
};

export default function ProfileSettingsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Profil" titleKey="settingsPages.profile.title" />
      <div className="space-y-6">
        <ProfileSettings />
      </div>
    </div>
  );
}
