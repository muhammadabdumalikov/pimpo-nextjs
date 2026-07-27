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
import Pagination from "@/components/ui/pagination/Pagination";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import { formatMoney } from "@/lib/reportFormat";
import {
  getStaff,
  getRoles,
  getBranches,
  getStaffSeatUsage,
  createStaff,
  updateStaff,
  deleteStaff,
  type Staff,
  type Role,
  type Branch,
  type SalaryType,
  type StaffSeatUsage,
} from "@/lib/api";

const ITEMS_PER_PAGE = 10;

const SALARY_TYPES: SalaryType[] = ["none", "fixed", "percent", "mixed"];

interface StaffForm {
  name: string;
  hasAccount: boolean;
  login: string;
  password: string;
  roleId: string;
  position: string;
  phone: string;
  branchId: string;
  salaryType: SalaryType;
  baseSalary: string;
  salesPercent: string;
  percentBase: "revenue" | "profit";
  isActive: boolean;
}

const EMPTY_FORM: StaffForm = {
  name: "",
  hasAccount: false,
  login: "",
  password: "",
  roleId: "",
  position: "",
  phone: "",
  branchId: "",
  salaryType: "none",
  baseSalary: "",
  salesPercent: "",
  percentBase: "revenue",
  isActive: true,
};

export default function StaffManager() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [seats, setSeats] = useState<StaffSeatUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Staff | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  const totalPages = Math.max(1, Math.ceil(staff.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const paginated = staff.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const som = t("reportsPage.som") || "so'm";

  // Seats are exhausted when every slot the plan allows is already taken. Used
  // to explain up front why the account toggle is unavailable, rather than
  // letting the save fail with a 403.
  const seatsFull =
    seats !== null && seats.limit !== null && seats.used >= seats.limit;

  const load = async () => {
    try {
      setIsLoading(true);
      const [staffList, roleList, branchRes, seatUsage] = await Promise.all([
        getStaff(),
        getRoles(),
        getBranches(),
        getStaffSeatUsage(),
      ]);
      setStaff(staffList);
      setRoles(roleList);
      setBranches(branchRes.branches);
      setSeats(seatUsage);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to load staff", "Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setIsModalOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    setForm({
      name: member.name,
      hasAccount: member.hasAccount,
      login: member.login ?? "",
      password: "",
      roleId: member.roleId ?? "",
      position: member.position ?? "",
      phone: member.phone ?? "",
      branchId: member.branchId ?? "",
      salaryType: member.salaryType,
      baseSalary: Number(member.baseSalary) ? String(Number(member.baseSalary)) : "",
      salesPercent: Number(member.salesPercent)
        ? String(Number(member.salesPercent))
        : "",
      percentBase: member.percentBase,
      isActive: member.isActive,
    });
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const wantsBase = form.salaryType === "fixed" || form.salaryType === "mixed";
  const wantsPercent =
    form.salaryType === "percent" || form.salaryType === "mixed";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const login = form.login.trim();
    if (!name) return setError(t("staff.errors.nameRequired") || "Name is required");

    if (form.hasAccount) {
      if (!login) return setError(t("staff.errors.loginRequired") || "Login is required");
      if (!form.roleId) return setError(t("staff.errors.roleRequired") || "Role is required");
      // Only a brand-new account needs a password up front; editing an existing
      // one keeps the stored password unless a replacement is typed.
      const needsPassword = !editing || !editing.hasAccount;
      if (needsPassword && !form.password) {
        return setError(t("staff.errors.passwordRequired") || "Password is required");
      }
    }

    if (wantsBase && !(Number(form.baseSalary) > 0)) {
      return setError(t("staff.errors.baseSalaryRequired") || "Salary is required");
    }
    if (wantsPercent && !(Number(form.salesPercent) > 0)) {
      return setError(t("staff.errors.percentRequired") || "Percent is required");
    }

    const payload = {
      name,
      hasAccount: form.hasAccount,
      position: form.position.trim(),
      phone: form.phone.trim(),
      branchId: form.branchId,
      salaryType: form.salaryType,
      baseSalary: wantsBase ? Number(form.baseSalary) : 0,
      salesPercent: wantsPercent ? Number(form.salesPercent) : 0,
      percentBase: form.percentBase,
      ...(form.hasAccount
        ? {
            login,
            roleId: form.roleId,
            ...(form.password ? { password: form.password } : {}),
          }
        : {}),
    };

    setIsSubmitting(true);
    setError("");
    try {
      if (editing) {
        await updateStaff(editing.id, { ...payload, isActive: form.isActive });
        showToast("success", t("staff.editSuccess") || "Staff updated", "Success");
      } else {
        await createStaff(payload);
        showToast("success", t("staff.addSuccess") || "Staff created", "Success");
      }
      setIsModalOpen(false);
      // Reload rather than patching in place: granting or revoking an account
      // changes the seat count shown in the header too.
      await load();
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
      setSeats((prev) =>
        prev && toDelete.hasAccount ? { ...prev, used: prev.used - 1 } : prev,
      );
      showToast("success", t("staff.deleteSuccess") || "Staff deleted", "Success");
      setToDelete(null);
    } catch (err: unknown) {
      showToast("error", (err as Error)?.message || "Failed to delete staff", "Error");
    } finally {
      setDeletingId(null);
    }
  };

  const salaryLabel = (member: Staff) => {
    const base = Number(member.baseSalary);
    const percent = Number(member.salesPercent);
    const percentText = `${percent}% ${
      member.percentBase === "profit"
        ? t("staff.ofProfit") || "foydadan"
        : t("staff.ofRevenue") || "tushumdan"
    }`;
    switch (member.salaryType) {
      case "fixed":
        return formatMoney(base, som);
      case "percent":
        return percentText;
      case "mixed":
        return `${formatMoney(base, som)} + ${percentText}`;
      default:
        return "—";
    }
  };

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("staff.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("staff.description")}
          </p>
          {seats && (
            <p className="mt-2 text-theme-xs text-gray-400">
              {t("staff.seatUsage")}:{" "}
              <span
                className={`font-medium ${
                  seatsFull ? "text-warning-600 dark:text-warning-400" : ""
                }`}
              >
                {seats.used}
                {seats.limit !== null ? ` / ${seats.limit}` : ""}
              </span>
              {" · "}
              {t("staff.seatUsageHint")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={openAdd}
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
                <th className="px-3 py-3 font-medium">{t("staff.positionLabel")}</th>
                <th className="px-3 py-3 font-medium">{t("staff.accessLabel")}</th>
                <th className="px-3 py-3 font-medium">{t("staff.salaryLabel")}</th>
                <th className="px-3 py-3 font-medium">{t("staff.status")}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((member) => (
                <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800/60">
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-800 dark:text-white/90">
                      {member.name}
                    </div>
                    {member.branchName && (
                      <div className="text-theme-xs text-gray-400">{member.branchName}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                    {member.position || "—"}
                  </td>
                  <td className="px-3 py-3">
                    {member.hasAccount ? (
                      <div>
                        <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                          {member.roleName ?? t("staff.hasAccount")}
                        </span>
                        <div className="mt-1 text-theme-xs text-gray-400">{member.login}</div>
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-theme-xs font-medium text-gray-500 dark:bg-white/5 dark:text-gray-400">
                        {t("staff.noAccount")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                    {salaryLabel(member)}
                  </td>
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

      {/* Pagination — always shown (controls disable on a single page) */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={staff.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), totalPages))}
        onItemsPerPageChange={(n) => {
          setItemsPerPage(n);
          setCurrentPage(1);
        }}
      />

      {/* Add / Edit modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8"
      >
        <form onSubmit={handleSubmit}>
          <h2 className="mb-5 pr-10 text-xl font-semibold text-gray-800 dark:text-white/90">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("staff.positionLabel")}</Label>
                <Input
                  type="text"
                  placeholder={t("staff.positionPlaceholder")}
                  value={form.position}
                  onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t("staff.phoneLabel")}</Label>
                <Input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            {branches.length > 1 && (
              <div>
                <Label>{t("staff.branchLabel")}</Label>
                <SelectField
                  value={form.branchId}
                  onChange={(value) => setForm((p) => ({ ...p, branchId: value }))}
                  placeholder={t("staff.selectBranch")}
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                />
              </div>
            )}

            {/* ── System access ─────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.hasAccount}
                  disabled={!form.hasAccount && (seatsFull || roles.length === 0)}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, hasAccount: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:opacity-50"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("staff.grantAccess")}
                  </span>
                  <span className="mt-0.5 block text-theme-xs text-gray-400">
                    {t("staff.grantAccessHint")}
                  </span>
                </span>
              </label>

              {!form.hasAccount && seatsFull && (
                <p className="mt-3 rounded-lg bg-warning-50 p-2 text-theme-xs text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
                  {t("staff.seatsFullHint")}
                </p>
              )}

              {form.hasAccount && (
                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <div>
                    <Label>
                      {t("staff.loginLabel")} <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder={t("staff.loginPlaceholder")}
                      value={form.login}
                      onChange={(e) => setForm((p) => ({ ...p, login: e.target.value }))}
                      disabled={!!editing && !!editing.hasAccount}
                    />
                  </div>

                  <div>
                    <Label>
                      {t("staff.passwordLabel")}
                      {(!editing || !editing.hasAccount) && (
                        <span className="text-error-500"> *</span>
                      )}
                    </Label>
                    <Input
                      type="password"
                      placeholder={t("staff.passwordPlaceholder")}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    />
                    {editing && editing.hasAccount && (
                      <p className="mt-1 text-theme-xs text-gray-400">
                        {t("staff.passwordEditHint")}
                      </p>
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
                      searchable
                      searchPlaceholder={t("staff.searchRole") || "Search role..."}
                      options={roles.map((role) => ({ value: role.id, label: role.name }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Payroll ───────────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <Label>{t("staff.salaryTypeLabel")}</Label>
              <SelectField
                value={form.salaryType}
                onChange={(value) =>
                  setForm((p) => ({ ...p, salaryType: value as SalaryType }))
                }
                placeholder={t("staff.selectSalaryType")}
                options={SALARY_TYPES.map((type) => ({
                  value: type,
                  label: t(`staff.salaryTypes.${type}`),
                }))}
              />

              {(wantsBase || wantsPercent) && (
                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                  {wantsBase && (
                    <div>
                      <Label>
                        {t("staff.baseSalaryLabel")}{" "}
                        <span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step={1000}
                        placeholder="3000000"
                        value={form.baseSalary}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, baseSalary: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  {wantsPercent && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label>
                          {t("staff.salesPercentLabel")}{" "}
                          <span className="text-error-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step={0.1}
                          placeholder="5"
                          value={form.salesPercent}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, salesPercent: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>{t("staff.percentBaseLabel")}</Label>
                        <SelectField
                          value={form.percentBase}
                          onChange={(value) =>
                            setForm((p) => ({
                              ...p,
                              percentBase: value as "revenue" | "profit",
                            }))
                          }
                          options={[
                            { value: "revenue", label: t("staff.percentBases.revenue") },
                            { value: "profit", label: t("staff.percentBases.profit") },
                          ]}
                        />
                      </div>
                    </div>
                  )}

                  {wantsPercent && !form.hasAccount && (
                    <p className="rounded-lg bg-warning-50 p-2 text-theme-xs text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
                      {t("staff.percentNeedsAccountHint")}
                    </p>
                  )}
                </div>
              )}
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
