"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
} from "@/lib/api";

export default function SuppliersManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await getSuppliers(1, 1000);
      setSuppliers(res.suppliers);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to load suppliers", "Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", phone: "", note: "" });
    setError("");
    setIsModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      phone: supplier.phone ?? "",
      note: supplier.note ?? "",
    });
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError(t("suppliers.errors.nameRequired") || "Name is required");

    setIsSubmitting(true);
    setError("");
    try {
      const payload = {
        name,
        phone: form.phone.trim() || undefined,
        note: form.note.trim() || undefined,
      };
      if (editing) {
        const updated = await updateSupplier(editing.id, payload);
        setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showToast("success", t("suppliers.editSuccess") || "Supplier updated", "Success");
      } else {
        const created = await createSupplier(payload);
        setSuppliers((prev) => [created, ...prev]);
        showToast("success", t("suppliers.addSuccess") || "Supplier created", "Success");
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to save supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeletingId(toDelete.id);
    try {
      await deleteSupplier(toDelete.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== toDelete.id));
      showToast("success", t("suppliers.deleteSuccess") || "Supplier deleted", "Success");
      setToDelete(null);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to delete supplier", "Error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("suppliers.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("suppliers.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon />
          {t("suppliers.addSupplier")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : suppliers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-3 font-medium">{t("suppliers.nameLabel")}</th>
                <th className="px-3 py-3 font-medium">{t("suppliers.phoneLabel")}</th>
                <th className="px-3 py-3 font-medium">{t("suppliers.noteLabel")}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800/60">
                  <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">{s.name}</td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{s.phone || "—"}</td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{s.note || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        disabled={deletingId === s.id}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10"
                        aria-label={t("suppliers.edit")}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(s)}
                        disabled={deletingId === s.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-error-500/10"
                        aria-label={t("suppliers.delete")}
                      >
                        {deletingId === s.id ? (
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                        ) : (
                          <TrashBinIcon className="h-5 w-5" />
                        )}
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
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("suppliers.noSuppliers")}
          </p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} className="max-w-lg w-full mx-4 p-6 sm:p-8">
        <form onSubmit={handleSubmit}>
          <h2 className="mb-5 text-xl font-semibold text-gray-800 dark:text-white/90">
            {editing ? t("suppliers.editSupplierTitle") : t("suppliers.addSupplierTitle")}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label>
                {t("suppliers.nameLabel")} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder={t("suppliers.namePlaceholder")}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>{t("suppliers.phoneLabel")}</Label>
              <Input
                type="text"
                placeholder={t("suppliers.phonePlaceholder")}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>

            <div>
              <Label>{t("suppliers.noteLabel")}</Label>
              <Input
                type="text"
                placeholder={t("suppliers.notePlaceholder")}
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={closeModal} disabled={isSubmitting}>
              {t("suppliers.cancel")}
            </Button>
            <Button type="submit" size="md" disabled={isSubmitting}>
              {isSubmitting ? t("suppliers.saving") : t("suppliers.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => !deletingId && setToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t("suppliers.deleteConfirmTitle") || "Delete supplier?"}
        message={t("suppliers.deleteConfirm") || "Are you sure?"}
        confirmLabel={t("suppliers.delete") || "Delete"}
        cancelLabel={t("suppliers.cancel") || "Cancel"}
        variant="danger"
        isLoading={!!toDelete && deletingId === toDelete.id}
        loadingLabel={t("suppliers.deleting") || "Deleting..."}
      />
    </div>
  );
}
