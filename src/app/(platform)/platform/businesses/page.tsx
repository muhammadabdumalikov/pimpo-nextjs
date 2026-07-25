"use client";
/* eslint-disable react/no-unescaped-entities -- this internal admin panel hardcodes Uzbek copy (with oʻ/gʻ apostrophes) rather than routing through i18n JSON */

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LuSearch, LuPlus, LuTrash2, LuBan, LuCircleCheck, LuEye } from "react-icons/lu";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import ConfirmModal from "@/components/ui/confirm-modal/ConfirmModal";
import { useToast } from "@/context/ToastContext";
import {
  getPlatformBusinesses,
  createPlatformBusiness,
  updatePlatformBusiness,
  deletePlatformBusiness,
  type PlatformBusinessRow,
} from "@/lib/platformApi";

const TIER_LABEL: Record<string, string> = {
  free: "Bepul",
  basic: "Standard",
  pro: "Business",
  proplus: "Business+",
};
const TIER_STYLE: Record<string, string> = {
  free: "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300",
  basic: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10 dark:text-blue-light-400",
  pro: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  proplus: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function PlatformBusinessesPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [rows, setRows] = useState<PlatformBusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", login: "", password: "" });
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [toDelete, setToDelete] = useState<PlatformBusinessRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Per-row action in-flight (block/activate)
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (term: string) => {
      setLoading(true);
      try {
        setRows(await getPlatformBusinesses(term));
      } catch (e) {
        showToast("error", e instanceof Error ? e.message : "Yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  // Debounced search.
  useEffect(() => {
    const id = setTimeout(() => void load(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search, load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      // Email is optional — only send it when the admin actually typed one.
      const email = form.email.trim();
      await createPlatformBusiness({
        name: form.name,
        login: form.login,
        password: form.password,
        ...(email ? { email } : {}),
      });
      showToast("success", "Do'kon yaratildi");
      setCreateOpen(false);
      setForm({ name: "", email: "", login: "", password: "" });
      await load(search.trim());
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Yaratishda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: PlatformBusinessRow) => {
    setBusyId(b.id);
    try {
      await updatePlatformBusiness(b.id, { isActive: !b.isActive });
      showToast("success", b.isActive ? "Do'kon bloklandi" : "Do'kon faollashtirildi");
      await load(search.trim());
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePlatformBusiness(toDelete.id);
      showToast("success", "Do'kon o'chirildi");
      setToDelete(null);
      await load(search.trim());
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "O'chirishda xatolik");
    } finally {
      setDeleting(false);
    }
  };

  // Email is optional; name, a 3+ char login and a 6+ char password are required.
  const canCreate = form.name && form.login.length >= 3 && form.password.length >= 6;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Do'konlar</h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            Barcha do'konlar, obunalar va holatlarini boshqarish
          </p>
        </div>
        <Button startIcon={<LuPlus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          Yangi do'kon
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nomi, login yoki email bo'yicha qidirish"
          className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-5 py-3 font-medium">Do'kon</th>
                <th className="px-5 py-3 font-medium">Tarif</th>
                <th className="px-5 py-3 font-medium">Holat</th>
                <th className="px-5 py-3 text-right font-medium">Tovarlar</th>
                <th className="px-5 py-3 text-right font-medium">Filiallar</th>
                <th className="px-5 py-3 text-right font-medium">Xodimlar</th>
                <th className="px-5 py-3 font-medium">Yaratilgan</th>
                <th className="px-5 py-3 text-right font-medium">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-gray-400">
                    Do'kon topilmadi
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-gray-100 text-sm last:border-0 dark:border-gray-800/60"
                  >
                    <td className="px-5 py-3">
                      <button
                        onClick={() => router.push(`/platform/businesses/${b.id}`)}
                        className="text-left"
                      >
                        <span className="block font-medium text-gray-800 hover:text-brand-500 dark:text-white/90">
                          {b.name}
                        </span>
                        <span className="block text-theme-xs text-gray-400">
                          @{b.login}
                          {b.email ? ` · ${b.email}` : ""}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${TIER_STYLE[b.tier]}`}
                      >
                        {TIER_LABEL[b.tier]}
                      </span>
                      {b.subscriptionExpired && (
                        <span className="ml-1 text-theme-xs text-error-500">muddati o'tgan</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {b.isActive ? (
                        <span className="inline-flex rounded-full bg-success-50 px-2.5 py-0.5 text-theme-xs font-medium text-success-600 dark:bg-success-500/10 dark:text-success-400">
                          Faol
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-error-50 px-2.5 py-0.5 text-theme-xs font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
                          Bloklangan
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {b.productCount}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {b.branchCount}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {b.staffCount}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {fmtDate(b.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Ko'rish"
                          onClick={() => router.push(`/platform/businesses/${b.id}`)}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/[0.06]"
                        >
                          <LuEye className="h-4 w-4" />
                        </button>
                        <button
                          title={b.isActive ? "Bloklash" : "Faollashtirish"}
                          disabled={busyId === b.id}
                          onClick={() => toggleActive(b)}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-white/[0.06]"
                        >
                          {b.isActive ? (
                            <LuBan className="h-4 w-4 hover:text-error-500" />
                          ) : (
                            <LuCircleCheck className="h-4 w-4 hover:text-success-500" />
                          )}
                        </button>
                        <button
                          title="O'chirish"
                          onClick={() => setToDelete(b)}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        className="mx-4 w-full max-w-md p-6 sm:p-8"
      >
        <h2 className="mb-5 text-xl font-semibold text-gray-800 dark:text-white/90">
          Yangi do'kon
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="c-name" required>
              Do'kon nomi
            </Label>
            <Input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Salom Market"
            />
          </div>
          <div>
            <Label htmlFor="c-email">Email (ixtiyoriy)</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="salom@market.uz"
            />
          </div>
          <div>
            <Label htmlFor="c-login" required>
              Login
            </Label>
            <Input
              id="c-login"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="salom_market"
              hint="Kamida 3 ta belgi"
            />
          </div>
          <div>
            <Label htmlFor="c-password" required>
              Parol
            </Label>
            <Input
              id="c-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              hint="Kamida 6 ta belgi"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
            Bekor qilish
          </Button>
          <Button onClick={handleCreate} disabled={saving || !canCreate}>
            {saving ? "Saqlanmoqda…" : "Yaratish"}
          </Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={handleDelete}
        title="Do'konni o'chirish"
        message={`"${toDelete?.name}" do'koni va uning barcha ma'lumotlari butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.`}
        confirmLabel="O'chirish"
        cancelLabel="Bekor qilish"
        variant="danger"
        isLoading={deleting}
        loadingLabel="O'chirilmoqda…"
      />
    </div>
  );
}
