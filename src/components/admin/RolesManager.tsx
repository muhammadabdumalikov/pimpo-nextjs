"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import {
  assignableMenuItems,
  menuGroupLabelKeys,
  type MenuGroup,
} from "@/data/menuCatalog";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  type Role,
} from "@/lib/api";

const GROUP_ORDER: MenuGroup[] = [
  "dashboard",
  "catalog",
  "sales",
  "customers",
  "settings",
  "other",
];

export default function RolesManager() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groupedMenus = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: assignableMenuItems.filter((m) => m.group === group),
    })).filter((g) => g.items.length > 0);
  }, []);

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      setRoles(await getRoles());
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to load roles", "Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setSelected(new Set());
    setError("");
    setIsModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setName(role.name);
    setSelected(new Set(role.menuKeys));
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(assignableMenuItems.map((m) => m.key)));
  const clearAll = () => setSelected(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("roles.errors.nameRequired") || "Role name is required");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const menuKeys = Array.from(selected);
      if (editing) {
        const updated = await updateRole(editing.id, { name: trimmed, menuKeys });
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showToast("success", t("roles.editSuccess") || "Role updated", "Success");
      } else {
        const created = await createRole({ name: trimmed, menuKeys });
        setRoles((prev) => [...prev, created]);
        showToast("success", t("roles.addSuccess") || "Role created", "Success");
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to save role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setDeletingId(roleToDelete.id);
    try {
      await deleteRole(roleToDelete.id);
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
      showToast("success", t("roles.deleteSuccess") || "Role deleted", "Success");
      setRoleToDelete(null);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to delete role", "Error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("roles.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("roles.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
        >
          <PlusIcon />
          {t("roles.addRole")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : roles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800 dark:text-white/90">
                    {role.name}
                  </p>
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {role.menuKeys.length} {t("roles.menus")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(role)}
                    disabled={deletingId === role.id}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10"
                    aria-label={t("roles.edit")}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleToDelete(role)}
                    disabled={deletingId === role.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-error-500/10"
                    aria-label={t("roles.delete")}
                  >
                    {deletingId === role.id ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                    ) : (
                      <TrashBinIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("roles.noRoles")}
          </p>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        className="max-w-2xl w-full mx-4 p-6 sm:p-8"
      >
        <form onSubmit={handleSubmit}>
          <h2 className="mb-5 text-xl font-semibold text-gray-800 dark:text-white/90">
            {editing ? t("roles.editRoleTitle") : t("roles.addRoleTitle")}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
              {error}
            </div>
          )}

          <div className="mb-5">
            <Label>
              {t("roles.nameLabel")} <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder={t("roles.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <Label>{t("roles.menus")}</Label>
            <div className="flex items-center gap-3 text-theme-sm">
              <button type="button" onClick={selectAll} className="text-brand-500 hover:text-brand-600">
                {t("roles.selectAll")}
              </button>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <button type="button" onClick={clearAll} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                {t("roles.clearAll")}
              </button>
            </div>
          </div>

          <div className="max-h-[45vh] space-y-5 overflow-y-auto rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            {groupedMenus.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-2 text-theme-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {t(menuGroupLabelKeys[group])}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(item.key)}
                        onChange={() => toggle(item.key)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                      />
                      {t(item.labelKey)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={closeModal} disabled={isSubmitting}>
              {t("roles.cancel")}
            </Button>
            <Button type="submit" size="md" disabled={isSubmitting}>
              {isSubmitting ? t("roles.saving") : t("roles.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!roleToDelete}
        onClose={() => !deletingId && setRoleToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t("roles.deleteConfirmTitle") || "Delete role?"}
        message={t("roles.deleteConfirm") || "Are you sure?"}
        confirmLabel={t("roles.delete") || "Delete"}
        cancelLabel={t("roles.cancel") || "Cancel"}
        variant="danger"
        isLoading={!!roleToDelete && deletingId === roleToDelete.id}
        loadingLabel={t("roles.deleting") || "Deleting..."}
      />
    </div>
  );
}
