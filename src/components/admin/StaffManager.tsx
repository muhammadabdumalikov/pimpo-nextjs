"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import {
  getStaff,
  getRoles,
  createStaff,
  updateStaff,
  deleteStaff,
  type Staff,
  type Role,
} from "@/lib/api";

export default function StaffManager() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    name: "",
    login: "",
    password: "",
    roleId: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Staff | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      const [staffList, roleList] = await Promise.all([getStaff(), getRoles()]);
      setStaff(staffList);
      setRoles(roleList);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to load staff", "Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", login: "", password: "", roleId: roles[0]?.id ?? "", isActive: true });
    setError("");
    setIsModalOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    setForm({
      name: member.name,
      login: member.login,
      password: "",
      roleId: member.roleId,
      isActive: member.isActive,
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
    const login = form.login.trim();
    if (!name) return setError(t("staff.errors.nameRequired") || "Name is required");
    if (!login) return setError(t("staff.errors.loginRequired") || "Login is required");
    if (!form.roleId) return setError(t("staff.errors.roleRequired") || "Role is required");
    if (!editing && !form.password) {
      return setError(t("staff.errors.passwordRequired") || "Password is required");
    }

    setIsSubmitting(true);
    setError("");
    try {
      if (editing) {
        const updated = await updateStaff(editing.id, {
          name,
          roleId: form.roleId,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        });
        setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showToast("success", t("staff.editSuccess") || "Staff updated", "Success");
      } else {
        const created = await createStaff({
          name,
          login,
          password: form.password,
          roleId: form.roleId,
        });
        setStaff((prev) => [...prev, created]);
        showToast("success", t("staff.addSuccess") || "Staff created", "Success");
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to save staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeletingId(toDelete.id);
    try {
      await deleteStaff(toDelete.id);
      setStaff((prev) => prev.filter((s) => s.id !== toDelete.id));
      showToast("success", t("staff.deleteSuccess") || "Staff deleted", "Success");
      setToDelete(null);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to delete staff", "Error");
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("staff.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("staff.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          disabled={roles.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon />
          {t("staff.addStaff")}
        </button>
      </div>

      {!isLoading && roles.length === 0 && (
        <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700 dark:border-warning-800 dark:bg-warning-900/20 dark:text-warning-400">
          {t("staff.noRolesWarning")}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : staff.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-3 font-medium">{t("staff.nameLabel")}</th>
                <th className="px-3 py-3 font-medium">{t("staff.loginLabel")}</th>
                <th className="px-3 py-3 font-medium">{t("staff.roleLabel")}</th>
                <th className="px-3 py-3 font-medium">{t("staff.status")}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800/60">
                  <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">{member.name}</td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{member.login}</td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{member.roleName ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${
                        member.isActive
                          ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                          : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                      }`}
                    >
                      {member.isActive ? t("staff.active") : t("staff.inactive")}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(member)}
                        disabled={deletingId === member.id}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10"
                        aria-label={t("staff.edit")}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(member)}
                        disabled={deletingId === member.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-error-500/10"
                        aria-label={t("staff.delete")}
                      >
                        {deletingId === member.id ? (
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
            {t("staff.noStaff")}
          </p>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} className="max-w-lg w-full mx-4 p-6 sm:p-8">
        <form onSubmit={handleSubmit}>
          <h2 className="mb-5 text-xl font-semibold text-gray-800 dark:text-white/90">
            {editing ? t("staff.editStaffTitle") : t("staff.addStaffTitle")}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label>
                {t("staff.nameLabel")} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder={t("staff.namePlaceholder")}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>
                {t("staff.loginLabel")} <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder={t("staff.loginPlaceholder")}
                value={form.login}
                onChange={(e) => setForm((p) => ({ ...p, login: e.target.value }))}
                disabled={!!editing}
              />
            </div>

            <div>
              <Label>
                {t("staff.passwordLabel")}
                {!editing && <span className="text-error-500"> *</span>}
              </Label>
              <Input
                type="password"
                placeholder={t("staff.passwordPlaceholder")}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
              {editing && (
                <p className="mt-1 text-theme-xs text-gray-400">{t("staff.passwordEditHint")}</p>
              )}
            </div>

            <div>
              <Label>
                {t("staff.roleLabel")} <span className="text-error-500">*</span>
              </Label>
              <SelectField
                value={form.roleId}
                onChange={(value) => setForm((p) => ({ ...p, roleId: value }))}
                placeholder={t("staff.selectRole")}
                options={roles.map((role) => ({ value: role.id, label: role.name }))}
              />
            </div>

            {editing && (
              <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                />
                {t("staff.active")}
              </label>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={closeModal} disabled={isSubmitting}>
              {t("staff.cancel")}
            </Button>
            <Button type="submit" size="md" disabled={isSubmitting}>
              {isSubmitting ? t("staff.saving") : t("staff.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!toDelete}
        onClose={() => !deletingId && setToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t("staff.deleteConfirmTitle") || "Delete staff?"}
        message={t("staff.deleteConfirm") || "Are you sure?"}
        confirmLabel={t("staff.delete") || "Delete"}
        cancelLabel={t("staff.cancel") || "Cancel"}
        variant="danger"
        isLoading={!!toDelete && deletingId === toDelete.id}
        loadingLabel={t("staff.deleting") || "Deleting..."}
      />
    </div>
  );
}
