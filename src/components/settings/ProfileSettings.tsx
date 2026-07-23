"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { LuCamera, LuTrash2 } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import {
  updateMyProfile,
  changeMyPassword,
  uploadStorageFile,
} from "@/lib/api";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB
const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];

// Settings → Profil (SOZLAMALAR.md S5): name + avatar + password change for
// the acting account (owner or staff). Active sessions come in a later pass —
// they need session tracking on top of the stateless JWT auth.
export default function ProfileSettings() {
  const { t } = useTranslations();
  const { account, refreshAccount } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // The account arrives async from AuthContext — hydrate the form once ready.
  useEffect(() => {
    if (account) setName(account.name);
  }, [account]);

  if (!account) return null;

  const initial = (account.name || "?").charAt(0).toUpperCase();

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === account.name) return;
    setSavingName(true);
    try {
      await updateMyProfile({ name: trimmed });
      await refreshAccount();
      showToast("success", t("profilePage.savedName"), "Success");
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSavingName(false);
    }
  };

  const onAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!AVATAR_MIMES.includes(file.type)) {
      showToast("error", t("profilePage.avatarType"), "Error");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      showToast("error", t("profilePage.avatarTooBig"), "Error");
      return;
    }
    setAvatarBusy(true);
    try {
      const { url } = await uploadStorageFile(file, "avatars");
      await updateMyProfile({ avatarUrl: url });
      await refreshAccount();
      showToast("success", t("profilePage.savedAvatar"), "Success");
    } catch (err) {
      showToast("error", (err as Error).message, "Error");
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      await updateMyProfile({ avatarUrl: null });
      await refreshAccount();
    } catch (err) {
      showToast("error", (err as Error).message, "Error");
    } finally {
      setAvatarBusy(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      showToast("error", t("profilePage.passwordTooShort"), "Error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("error", t("profilePage.passwordMismatch"), "Error");
      return;
    }
    setSavingPassword(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", t("profilePage.passwordChanged"), "Success");
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="grid min-h-fill content-start gap-6 lg:grid-cols-2">
      {/* Profile: avatar + name + read-only account facts */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("profilePage.infoTitle")}
        </h3>
        <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("profilePage.infoDescription")}
        </p>

        <div className="mb-6 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            {account.avatarUrl ? (
              <Image
                src={account.avatarUrl}
                alt={account.name}
                fill
                sizes="80px"
                className="rounded-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-brand-50 text-2xl font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                {initial}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              startIcon={<LuCamera size={16} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
            >
              {t("profilePage.changeAvatar")}
            </Button>
            {account.avatarUrl && (
              <Button
                size="sm"
                variant="outline"
                startIcon={<LuTrash2 size={16} />}
                onClick={removeAvatar}
                disabled={avatarBusy}
              >
                {t("profilePage.removeAvatar")}
              </Button>
            )}
            <p className="w-full text-theme-xs text-gray-400">
              {t("profilePage.avatarHint")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_MIMES.join(",")}
              className="hidden"
              onChange={onAvatarPicked}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>{t("profilePage.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
            />
          </div>
          <div>
            <Label>{t("profilePage.login")}</Label>
            <Input value={account.login} disabled />
          </div>
          {account.type === "staff" && account.roleName && (
            <div>
              <Label>{t("profilePage.role")}</Label>
              <Input value={account.roleName} disabled />
            </div>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={saveName}
              disabled={savingName || !name.trim() || name.trim() === account.name}
            >
              {t("profilePage.save")}
            </Button>
          </div>
        </div>
      </div>

      {/* Security: password change */}
      <div className="h-fit rounded-2xl border border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("profilePage.securityTitle")}
        </h3>
        <p className="mb-6 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("profilePage.securityDescription")}
        </p>

        <div className="space-y-4">
          <div>
            <Label>{t("profilePage.currentPassword")}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("profilePage.newPassword")}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint={t("profilePage.passwordHint")}
            />
          </div>
          <div>
            <Label>{t("profilePage.confirmPassword")}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={savePassword}
              disabled={
                savingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {t("profilePage.changePassword")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
