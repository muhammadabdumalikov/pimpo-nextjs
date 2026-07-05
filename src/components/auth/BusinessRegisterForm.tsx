"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  register,
  login,
  setAuthToken,
  setAccount,
  getAuthToken,
} from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";

export default function BusinessRegisterForm() {
  const { t } = useTranslations();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    login: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in → skip straight to the dashboard.
  useEffect(() => {
    if (getAuthToken()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!isChecked) {
      setError(t("auth.mustAgree"));
      return;
    }
    if (formData.login.trim().length < 3) {
      setError(t("auth.loginTooShort"));
      return;
    }
    if (formData.password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create the business (= owner/admin account). New accounts always
      // start on the free plan; paid tiers are provisioned manually later.
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        login: formData.login.trim(),
        password: formData.password,
      });

      // 2. Log the owner straight in.
      const session = await login({
        login: formData.login.trim(),
        password: formData.password,
      });
      setAuthToken(session.accessToken);
      setAccount(session.account);

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.registerError")
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          {t("auth.backHome")}
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t("auth.registerTitle")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("auth.registerSubtitle")}
            </p>
          </div>

          {/* Plan — signup always creates a free account. */}
          <div className="mb-5 flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/10">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("auth.selectedPlan")}
              </p>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                {t("auth.plan.free")}
              </p>
            </div>
            <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
              0 {t("auth.perMonth")}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:text-error-400 dark:border-error-800">
                  {error}
                </div>
              )}
              <div>
                <Label>
                  {t("auth.businessNameLabel")}{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  name="name"
                  type="text"
                  placeholder={t("auth.businessNamePlaceholder")}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  error={!!error}
                />
              </div>
              <div>
                <Label>
                  {t("auth.usernameLabel")}{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  name="login"
                  type="text"
                  placeholder={t("auth.usernamePlaceholder")}
                  value={formData.login}
                  onChange={handleChange}
                  required
                  error={!!error}
                />
              </div>
              <div>
                <Label>
                  {t("auth.emailLabel")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  name="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  error={!!error}
                />
              </div>
              <div>
                <Label>
                  {t("auth.passwordLabel")}{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.passwordPlaceholder")}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    error={!!error}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  {t("auth.passwordHint")}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  className="w-5 h-5"
                  checked={isChecked}
                  onChange={setIsChecked}
                />
                <p className="inline-block font-normal text-gray-500 dark:text-gray-400 text-theme-sm">
                  {t("auth.agreeTerms")}
                </p>
              </div>
              <div>
                <Button
                  className="w-full"
                  size="sm"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? t("auth.registering") : t("auth.createAccount")}
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              {t("auth.haveAccount")}{" "}
              <Link
                href="/signin"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                {t("auth.signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
