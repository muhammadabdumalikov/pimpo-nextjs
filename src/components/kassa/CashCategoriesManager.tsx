"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon, TrashBinIcon } from "@/icons/index";
import {
  getCashCategories,
  createCashCategory,
  updateCashCategory,
  type CashCategory,
} from "@/lib/api";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

export default function CashCategoriesManager() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<"in" | "out" | "both">("both");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CashCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setCategories(await getCashCategories());
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setName("");
    setDirection("both");
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCashCategory({ name: name.trim(), direction });
      showToast("success", t("kassa.add"), "Success");
      setModalOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await updateCashCategory(toDelete.id, { isActive: false });
      setToDelete(null);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setDeleting(false);
    }
  };

  const dirLabel = (d: CashCategory["direction"]) =>
    d === "in"
      ? t("kassa.dirIn")
      : d === "out"
        ? t("kassa.dirOut")
        : t("kassa.dirBoth");

  return (
    <div className={CARD}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("kassa.categories")}
        </h3>
        <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
          {t("kassa.newCategory")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : categories.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-3 font-medium">{t("kassa.name")}</th>
                <th className="px-3 py-3 font-medium">
                  {t("kassa.direction")}
                </th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-100 dark:border-gray-800/60"
                >
                  <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                    {c.name}
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                    {dirLabel(c.direction)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setToDelete(c)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-error-50 hover:text-error-500 dark:text-gray-400 dark:hover:bg-error-500/10"
                        aria-label={t("kassa.delete")}
                      >
                        <TrashBinIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
          <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
            {t("kassa.empty")}
          </p>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        className="max-w-md w-full mx-4 p-6 sm:p-8"
      >
        <h2 className="mb-5 text-xl font-semibold text-gray-800 dark:text-white/90">
          {t("kassa.newCategory")}
        </h2>
        <div className="space-y-4">
          <div>
            <Label>{t("kassa.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("kassa.direction")}</Label>
            <SelectField
              value={direction}
              onChange={(v) => setDirection(v as "in" | "out" | "both")}
              options={[
                { value: "both", label: t("kassa.dirBoth") },
                { value: "in", label: t("kassa.dirIn") },
                { value: "out", label: t("kassa.dirOut") },
              ]}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setModalOpen(false)}
            disabled={saving}
          >
            {t("kassa.cancel")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {t("kassa.save")}
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={confirmDelete}
        title={t("kassa.deleteConfirm")}
        message={toDelete?.name ?? ""}
        confirmLabel={t("kassa.delete")}
        cancelLabel={t("kassa.cancel")}
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
