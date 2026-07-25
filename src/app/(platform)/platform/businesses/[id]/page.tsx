"use client";
/* eslint-disable react/no-unescaped-entities -- this internal admin panel hardcodes Uzbek copy (with oʻ/gʻ apostrophes) rather than routing through i18n JSON */

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LuArrowLeft,
  LuPackage,
  LuStore,
  LuUsers,
  LuTrash2,
  LuPencil,
  LuBan,
  LuCircleCheck,
} from "react-icons/lu";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import SelectField from "@/components/form/SelectField";
import { Modal } from "@/components/ui/modal";
import ConfirmModal from "@/components/ui/confirm-modal/ConfirmModal";
import { useToast } from "@/context/ToastContext";
import {
  getPlatformBusiness,
  getPlatformPlans,
  updatePlatformBusiness,
  deletePlatformBusiness,
  setPlatformSubscription,
  topUpPlatformBalance,
  createPlatformDiscount,
  deletePlatformDiscount,
  type PlatformBusinessDetail,
  type PlatformPlan,
  type PlatformTier,
} from "@/lib/platformApi";

const TIER_LABEL: Record<string, string> = {
  free: "Bepul",
  basic: "Standard",
  pro: "Business",
  proplus: "Business+",
};

function fmtSom(n: number): string {
  return n.toLocaleString("uz-UZ") + " so'm";
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
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
/** ISO date (or null) → "YYYY-MM-DD" for a <input type="date">. */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800/60">
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <div>
        <p className="text-theme-xs text-gray-400">{label}</p>
        <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{value}</p>
      </div>
    </div>
  );
}

export default function PlatformBusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<PlatformBusinessDetail | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit profile modal
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ name: "", email: "", login: "", password: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Subscription form
  const [tier, setTier] = useState<PlatformTier>("free");
  const [unlimited, setUnlimited] = useState(true);
  const [expiry, setExpiry] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  // Billing
  const [topup, setTopup] = useState("");
  const [toppingUp, setToppingUp] = useState(false);
  const [discount, setDiscount] = useState({ label: "", percent: "", validUntil: "" });
  const [addingDiscount, setAddingDiscount] = useState(false);
  const [removingDiscount, setRemovingDiscount] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const load = useCallback(async () => {
    try {
      const detail = await getPlatformBusiness(id);
      setData(detail);
      // Seed the subscription form from the current state.
      const s = detail.subscription;
      setTier((s.planTier as PlatformTier) ?? "free");
      setUnlimited(!s.endDate);
      setExpiry(toDateInput(s.endDate));
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    void load();
    getPlatformPlans()
      .then(setPlans)
      .catch(() => undefined);
  }, [load]);

  const openEdit = () => {
    if (!data) return;
    setEdit({
      name: data.business.name,
      email: data.business.email ?? "",
      login: data.business.login,
      password: "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await updatePlatformBusiness(id, {
        name: edit.name,
        login: edit.login,
        // Only send email when non-empty (empty would fail the @IsEmail check).
        ...(edit.email.trim() ? { email: edit.email.trim() } : {}),
        // Only send a password when the admin typed a new one.
        ...(edit.password ? { password: edit.password } : {}),
      });
      showToast("success", "Ma'lumotlar yangilandi");
      setEditOpen(false);
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async () => {
    if (!data) return;
    setTogglingActive(true);
    try {
      await updatePlatformBusiness(id, { isActive: !data.business.isActive });
      showToast(
        "success",
        data.business.isActive ? "Do'kon bloklandi" : "Do'kon faollashtirildi",
      );
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Xatolik");
    } finally {
      setTogglingActive(false);
    }
  };

  const saveSubscription = async () => {
    setSavingSub(true);
    try {
      await setPlatformSubscription(id, {
        tier,
        // Unlimited → omit endDate; otherwise send a full ISO timestamp.
        ...(unlimited || !expiry
          ? {}
          : { endDate: new Date(expiry + "T00:00:00.000Z").toISOString() }),
      });
      showToast("success", "Obuna yangilandi");
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Obunani saqlashda xatolik");
    } finally {
      setSavingSub(false);
    }
  };

  const doTopUp = async () => {
    const amount = Number(topup.replace(/\s/g, ""));
    if (!amount || amount <= 0) return;
    setToppingUp(true);
    try {
      await topUpPlatformBalance(id, amount);
      showToast("success", "Balans to'ldirildi");
      setTopup("");
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Xatolik");
    } finally {
      setToppingUp(false);
    }
  };

  const addDiscount = async () => {
    const percent = Number(discount.percent);
    if (!discount.label || !percent) return;
    setAddingDiscount(true);
    try {
      await createPlatformDiscount(id, {
        label: discount.label,
        percent,
        ...(discount.validUntil
          ? { validUntil: new Date(discount.validUntil + "T00:00:00.000Z").toISOString() }
          : {}),
      });
      showToast("success", "Chegirma qo'shildi");
      setDiscount({ label: "", percent: "", validUntil: "" });
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Xatolik");
    } finally {
      setAddingDiscount(false);
    }
  };

  const removeDiscount = async (discountId: string) => {
    setRemovingDiscount(discountId);
    try {
      await deletePlatformDiscount(discountId);
      showToast("success", "Chegirma o'chirildi");
      await load();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Xatolik");
    } finally {
      setRemovingDiscount(null);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deletePlatformBusiness(id);
      showToast("success", "Do'kon o'chirildi");
      router.replace("/platform/businesses");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "O'chirishda xatolik");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }
  if (!data) return null;

  const b = data.business;
  const m = data.billing.monthly;
  // Show the actual plan name (matches the dropdown) rather than a hardcoded
  // label; fall back to the tier label. When expired, the effective tier is free.
  const currentLabel = data.subscription.isExpired
    ? TIER_LABEL.free
    : data.subscription.planName ??
      TIER_LABEL[data.subscription.tier] ??
      data.subscription.tier;
  const tierOptions = [
    { value: "free", label: TIER_LABEL.free },
    ...plans
      .filter((p) => p.tier !== "free")
      .map((p) => ({ value: p.tier, label: p.name })),
  ];
  // Ensure the current tier is always selectable even if the plan catalogue is empty.
  if (!tierOptions.some((o) => o.value === tier)) {
    tierOptions.push({ value: tier, label: TIER_LABEL[tier] ?? tier });
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/platform/businesses")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400"
      >
        <LuArrowLeft className="h-4 w-4" /> Do'konlar
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white">
            {b.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">{b.name}</h1>
              {b.isActive ? (
                <span className="inline-flex rounded-full bg-success-50 px-2.5 py-0.5 text-theme-xs font-medium text-success-600 dark:bg-success-500/10 dark:text-success-400">
                  Faol
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-error-50 px-2.5 py-0.5 text-theme-xs font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
                  Bloklangan
                </span>
              )}
            </div>
            <p className="text-theme-sm text-gray-400">
              @{b.login}
              {b.email ? ` · ${b.email}` : ""} · {fmtDate(b.createdAt)} dan beri
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" startIcon={<LuPencil className="h-4 w-4" />} onClick={openEdit}>
            Tahrirlash
          </Button>
          <Button
            variant="outline"
            size="sm"
            startIcon={
              b.isActive ? <LuBan className="h-4 w-4" /> : <LuCircleCheck className="h-4 w-4" />
            }
            onClick={toggleActive}
            disabled={togglingActive}
          >
            {b.isActive ? "Bloklash" : "Faollashtirish"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            startIcon={<LuTrash2 className="h-4 w-4" />}
            className="!text-error-500 hover:!bg-error-50 dark:hover:!bg-error-500/10"
            onClick={() => setConfirmDelete(true)}
          >
            O'chirish
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          icon={<LuPackage className="h-5 w-5 text-brand-500" />}
          tone="bg-brand-50 dark:bg-brand-500/10"
          label="Tovarlar"
          value={data.counts.products}
        />
        <StatTile
          icon={<LuStore className="h-5 w-5 text-blue-light-500" />}
          tone="bg-blue-light-50 dark:bg-blue-light-500/10"
          label="Filiallar"
          value={data.counts.branches}
        />
        <StatTile
          icon={<LuUsers className="h-5 w-5 text-success-500" />}
          tone="bg-success-50 dark:bg-success-500/10"
          label="Xodimlar"
          value={data.counts.staff}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Subscription */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">Obuna</h2>
          <p className="mb-4 text-theme-xs text-gray-400">
            Joriy: <span className="font-medium text-gray-600 dark:text-gray-300">{currentLabel}</span>
            {data.subscription.endDate
              ? ` · ${fmtDate(data.subscription.endDate)} gacha`
              : " · muddatsiz"}
            {data.subscription.isExpired && (
              <span className="text-error-500"> · muddati o'tgan</span>
            )}
          </p>

          <div className="space-y-4">
            <div>
              <Label>Tarif</Label>
              <SelectField
                options={tierOptions}
                value={tier}
                onChange={(v) => setTier(v as PlatformTier)}
                className="w-full"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={unlimited}
                onChange={(e) => setUnlimited(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
              />
              Muddatsiz (amal qilish muddatisiz)
            </label>

            {!unlimited && (
              <div>
                <Label htmlFor="expiry">Amal qilish muddati</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </div>
            )}

            <Button onClick={saveSubscription} disabled={savingSub} className="w-full">
              {savingSub ? "Saqlanmoqda…" : "Obunani saqlash"}
            </Button>
          </div>
        </div>

        {/* Billing */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Billing</h2>

          <div className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-theme-xs text-gray-400">Balans</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {fmtSom(data.billing.balance)}
            </p>
            <div className="mt-2 flex justify-between text-theme-xs text-gray-500 dark:text-gray-400">
              <span>Oylik to'lov</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{fmtSom(m.total)}</span>
            </div>
          </div>

          {/* Top up */}
          <div className="mb-5">
            <Label htmlFor="topup">Balansni to'ldirish</Label>
            <div className="flex gap-2">
              <Input
                id="topup"
                type="number"
                inputMode="numeric"
                placeholder="500000"
                value={topup}
                onChange={(e) => setTopup(e.target.value)}
              />
              <Button onClick={doTopUp} disabled={toppingUp || !topup}>
                {toppingUp ? "…" : "Qo'shish"}
              </Button>
            </div>
          </div>

          {/* Discounts */}
          <div>
            <p className="mb-2 text-theme-xs font-medium uppercase tracking-wide text-gray-400">
              Chegirmalar
            </p>
            {data.billing.discounts.length === 0 ? (
              <p className="mb-3 text-theme-sm text-gray-400">Chegirmalar yo'q</p>
            ) : (
              <ul className="mb-3 space-y-2">
                {data.billing.discounts.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-800/60"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {d.label}{" "}
                      <span className="text-brand-500">−{d.percent}%</span>
                      {d.validUntil && (
                        <span className="text-theme-xs text-gray-400">
                          {" "}
                          · {fmtDate(d.validUntil)} gacha
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => removeDiscount(d.id)}
                      disabled={removingDiscount === d.id}
                      className="rounded p-1.5 text-gray-400 transition hover:bg-error-50 hover:text-error-500 disabled:opacity-40 dark:hover:bg-error-500/10"
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Input
                placeholder="Nomi (masalan 6 oyga 10%)"
                value={discount.label}
                onChange={(e) => setDiscount({ ...discount, label: e.target.value })}
              />
              <Input
                type="number"
                placeholder="%"
                className="sm:w-20"
                value={discount.percent}
                onChange={(e) => setDiscount({ ...discount, percent: e.target.value })}
              />
              <Button
                onClick={addDiscount}
                disabled={addingDiscount || !discount.label || !discount.percent}
              >
                Qo'shish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => !savingEdit && setEditOpen(false)}
        className="mx-4 w-full max-w-md p-6 sm:p-8"
      >
        <h2 className="mb-5 text-xl font-semibold text-gray-800 dark:text-white/90">
          Do'konni tahrirlash
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="e-name" required>
              Do'kon nomi
            </Label>
            <Input
              id="e-name"
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="e-email">Email (ixtiyoriy)</Label>
            <Input
              id="e-email"
              type="email"
              value={edit.email}
              onChange={(e) => setEdit({ ...edit, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="e-login" required>
              Login
            </Label>
            <Input
              id="e-login"
              value={edit.login}
              onChange={(e) => setEdit({ ...edit, login: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="e-password">Yangi parol</Label>
            <Input
              id="e-password"
              type="password"
              placeholder="O'zgartirmaslik uchun bo'sh qoldiring"
              value={edit.password}
              onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              hint="Kamida 6 ta belgi"
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
            Bekor qilish
          </Button>
          <Button
            onClick={saveEdit}
            disabled={
              savingEdit ||
              !edit.name ||
              edit.login.length < 3 ||
              (edit.password.length > 0 && edit.password.length < 6)
            }
          >
            {savingEdit ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        onConfirm={doDelete}
        title="Do'konni o'chirish"
        message={`"${b.name}" do'koni va uning barcha ma'lumotlari butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.`}
        confirmLabel="O'chirish"
        cancelLabel="Bekor qilish"
        variant="danger"
        isLoading={deleting}
        loadingLabel="O'chirilmoqda…"
      />
    </div>
  );
}
