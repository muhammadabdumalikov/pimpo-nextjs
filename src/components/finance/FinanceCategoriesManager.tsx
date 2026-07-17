"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon, TrashBinIcon } from "@/icons/index";
import {
  getFinanceCategories,
  createFinanceCategory,
  updateFinanceCategory,
  type FinanceCategory,
} from "@/lib/api";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

type Tab = "all" | "income" | "expense";

export default function FinanceCategoriesManager() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<FinanceCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setCategories(await getFinanceCategories());
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

  const shown = useMemo(
    () => (tab === "all" ? categories : categories.filter((c) => c.kind === tab)),
    [categories, tab],
  );

  const openAdd = () => {
    setName("");
    setKind("expense");
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createFinanceCategory({ name: name.trim(), kind });
      showToast("success", t("finance.add"), "Success");
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
      await updateFinanceCategory(toDelete.id, { isActive: false });
      setToDelete(null);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setDeleting(false);
    }
  };

  const kindBadge = (k: FinanceCategory["kind"]) => (
    <span
      className={
        k === "income"
          ? "inline-flex rounded-full bg-success-50 px-2.5 py-0.5 text-theme-xs font-medium text-success-600 dark:bg-success-500/10 dark:text-success-400"
          : "inline-flex rounded-full bg-warning-50 px-2.5 py-0.5 text-theme-xs font-medium text-warning-600 dark:bg-warning-500/10 dark:text-warning-400"
      }
    >
      {k === "income" ? t("finance.income") : t("finance.expense")}
    </span>
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: t("finance.tabActive"), count: categories.length },
    {
      key: "income",
      label: t("finance.tabIncome"),
      count: categories.filter((c) => c.kind === "income").length,
    },
    {
      key: "expense",
      label: t("finance.tabExpense"),
      count: categories.filter((c) => c.kind === "expense").length,
    },
  ];

  return (
    <div className={CARD}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("finance.categoriesTitle")}
        </h3>
        <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
          {t("finance.newCategory")}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={
              tab === tb.key
                ? "rounded-lg bg-brand-500 px-3 py-1.5 text-theme-sm font-medium text-white"
                : "rounded-lg bg-gray-100 px-3 py-1.5 text-theme-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06]"
            }
          >
            {tb.label} ({tb.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : shown.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-3 font-medium">{t("finance.name")}</th>
                <th className="px-3 py-3 font-medium">{t("finance.kind")}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-100 dark:border-gray-800/60"
                >
                  <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                    {c.name}
                  </td>
                  <td className="px-3 py-3">{kindBadge(c.kind)}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setToDelete(c)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-error-50 hover:text-error-500 dark:text-gray-400 dark:hover:bg-error-500/10"
                        aria-label={t("finance.delete")}
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
            {t("finance.empty")}
          </p>
        </div>
      )}

      <Drawer
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={t("finance.newCategory")}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              {t("finance.cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {t("finance.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>{t("finance.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("finance.kind")}</Label>
            <SelectField
              value={kind}
              onChange={(v) => setKind(v as "income" | "expense")}
              options={[
                { value: "expense", label: t("finance.expense") },
                { value: "income", label: t("finance.income") },
              ]}
            />
          </div>
        </div>
      </Drawer>

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={confirmDelete}
        title={t("finance.deleteConfirm")}
        message={toDelete?.name ?? ""}
        confirmLabel={t("finance.delete")}
        cancelLabel={t("finance.cancel")}
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
