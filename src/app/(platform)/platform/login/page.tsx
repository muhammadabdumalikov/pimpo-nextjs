"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { platformLogin, setPlatformToken, getPlatformToken } from "@/lib/platformApi";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already signed in → straight to the console.
  useEffect(() => {
    if (getPlatformToken()) router.replace("/platform");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await platformLogin({ login, password });
      setPlatformToken(token);
      router.replace("/platform");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirishda xatolik");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-xl font-bold text-white">
            P
          </span>
          <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Pimpo Admin
            </h1>
            <p className="text-theme-sm text-gray-400">Platforma boshqaruv paneli</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="login" required>
              Login
            </Label>
            <Input
              id="login"
              type="text"
              placeholder="admin"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password" required>
              Parol
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !login || !password}
          >
            {loading ? "Tekshirilmoqda…" : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  );
}
