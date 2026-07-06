"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import { useToast } from "@/context/ToastContext";
import AddCategoryModal from "@/components/ecommerce/AddCategoryModal";
import EditCategoryModal from "@/components/ecommerce/EditCategoryModal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { getCategories, deleteCategory, type Category } from "@/lib/api";

export default function CategoriesList() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const list = await getCategories();
      setCategories(list);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to load categories", "Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddSuccess = (category: Category) => {
    setCategories((prev) => [...prev, category]);
    showToast("success", t("categories.addSuccess") || "Category added successfully", "Success");
  };

  const handleEditSuccess = (updated: Category) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    showToast("success", t("categories.editSuccess") || "Category updated successfully", "Success");
    setEditingCategory(null);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeletingCategoryId(categoryToDelete.id);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      showToast("success", t("categories.deleteSuccess") || "Category deleted successfully", "Success");
      setCategoryToDelete(null);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to delete category", "Error");
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("categories.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("categories.description")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            <PlusIcon />
            {t("categories.addCategory")}
          </button>
        </div>
      </div>

      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        existingIds={categories.map((c) => c.id)}
      />

      <EditCategoryModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onSuccess={handleEditSuccess}
        category={editingCategory}
      />

      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => !deletingCategoryId && setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t("categories.deleteConfirmTitle") || "Delete category?"}
        message={t("categories.deleteConfirm") || "Are you sure you want to delete this category?"}
        confirmLabel={t("categories.delete") || "Delete"}
        cancelLabel={t("categories.cancel") || "Cancel"}
        variant="danger"
        isLoading={!!categoryToDelete && deletingCategoryId === categoryToDelete.id}
        loadingLabel={t("categories.deleting") || "Deleting..."}
      />

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="fill-gray-500 dark:fill-gray-400"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
              fill=""
            />
          </svg>
        </span>
        <input
          type="text"
          placeholder={t("categories.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
      </div>

      {/* Categories grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-300 hover:bg-gray-50/80 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700 dark:hover:bg-white/[0.06]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-200 text-lg font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {cat.image ? (
                    <img src={cat.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    cat.name.slice(0, 1)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800 dark:text-white/90">
                    {cat.name}
                  </p>
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("categories.products")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingCategory(cat)}
                  disabled={deletingCategoryId === cat.id}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white/90"
                  aria-label={t("categories.edit")}
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(cat)}
                  disabled={deletingCategoryId === cat.id}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                  aria-label={t("categories.delete")}
                >
                  {deletingCategoryId === cat.id ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                  ) : (
                    <TrashBinIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("categories.noCategories")}
          </p>
        </div>
      )}
    </div>
  );
}
