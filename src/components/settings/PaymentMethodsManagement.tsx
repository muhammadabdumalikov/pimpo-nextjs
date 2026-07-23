"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import { LuLock } from "react-icons/lu";
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  type PaymentMethod,
} from "@/lib/api";

// Sozlamalar → To'lov turlari (SOZLAMALAR.md S1): system methods (Naqd, Karta,
// UzCard…) can be shown/hidden at the till; custom methods are full CRUD. The
// visible set drives the checkout payment drawer.
export default function PaymentMethodsManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const res = await getPaymentMethods();
    setMethods(res.paymentMethods);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await getPaymentMethods();
        if (active) setMethods(res.paymentMethods);
      } catch (err: unknown) {
        showToast(
          "error",
          (err as Error)?.message || "Failed to load payment methods",
          "Error",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setName(m.name);
    setOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      showToast("error", t("paymentMethodsPage.nameRequired"), "Error");
      return;
    }
    setSaving(true);
    try {
      if (editing) await updatePaymentMethod(editing.id, { name: name.trim() });
      else await createPaymentMethod({ name: name.trim() });
      showToast("success", t("common.save"), "Success");
      setOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisible = async (m: PaymentMethod, next: boolean) => {
    // Optimistic: the Switch already flipped visually; sync state and revert
    // via reload on failure.
    setMethods((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, isVisible: next } : x)),
    );
    try {
      await updatePaymentMethod(m.id, { isVisible: next });
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
      await load();
    }
  };

  const confirmRemove = async () => {
    if (!methodToDelete) return;
    setDeleting(true);
    try {
      await deletePaymentMethod(methodToDelete.id);
      setMethodToDelete(null);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("paymentMethodsPage.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("paymentMethodsPage.description")}
          </p>
        </div>
        <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
          {t("paymentMethodsPage.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[520px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-9 py-3 font-medium">{t("paymentMethodsPage.name")}</th>
                <th className="px-9 py-3 font-medium">{t("paymentMethodsPage.type")}</th>
                <th className="px-9 py-3 font-medium">{t("paymentMethodsPage.visibility")}</th>
                <th className="px-9 py-3 pl-10 font-medium">{t("paymentMethodsPage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-9 py-3">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {m.name}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-theme-xs font-medium ${
                        m.type === "system"
                          ? "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
                          : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                      }`}
                    >
                      {m.type === "system"
                        ? t("paymentMethodsPage.system")
                        : t("paymentMethodsPage.custom")}
                    </span>
                  </td>
                  <td className="px-9 py-3">
                    {/* Stable key — Switch itself re-syncs (animated) when a
                        failed toggle reloads the row's isVisible */}
                    <Switch
                      key={m.id}
                      label=""
                      defaultChecked={m.isVisible}
                      onChange={(checked) => toggleVisible(m, checked)}
                    />
                  </td>
                  <td className="px-9 py-3 pl-10">
                    {m.type === "custom" ? (
                      <div className="flex justify-start gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                          aria-label={t("paymentMethodsPage.edit")}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMethodToDelete(m)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 dark:text-gray-400 dark:hover:bg-error-500/10"
                          aria-label={t("paymentMethodsPage.delete")}
                        >
                          <TrashBinIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      // System methods can only be shown/hidden (the toggle),
                      // never renamed or deleted — so the row is locked. The
                      // p-2 matches the custom-row buttons so the icon lines up
                      // in the same column position.
                      <div className="flex justify-start">
                        <span
                          className="p-2 text-gray-300 dark:text-gray-600"
                          title={t("paymentMethodsPage.systemLocked")}
                        >
                          <LuLock className="h-5 w-5" />
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        isOpen={open}
        onClose={() => !saving && setOpen(false)}
        title={
          editing
            ? t("paymentMethodsPage.editTitle")
            : t("paymentMethodsPage.addTitle")
        }
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>{t("paymentMethodsPage.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("paymentMethodsPage.namePlaceholder")}
              maxLength={100}
            />
          </div>
        </div>
      </Drawer>

      <ConfirmModal
        isOpen={!!methodToDelete}
        onClose={() => !deleting && setMethodToDelete(null)}
        onConfirm={confirmRemove}
        title={t("paymentMethodsPage.deleteTitle")}
        message={methodToDelete?.name ?? ""}
        confirmLabel={t("paymentMethodsPage.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
