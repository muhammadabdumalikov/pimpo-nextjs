"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  type Branch,
} from "@/lib/api";

export default function BranchesManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await getBranches();
    setBranches(res.branches);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await getBranches();
        if (active) setBranches(res.branches);
      } catch (err: unknown) {
        showToast("error", (err as Error)?.message || "Failed to load branches", "Error");
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
    setAddress("");
    setOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setName(b.name);
    setAddress(b.address ?? "");
    setOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) {
      showToast("error", t("branches.nameRequired"), "Error");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), address: address.trim() || undefined };
      if (editing) await updateBranch(editing.id, payload);
      else await createBranch(payload);
      showToast("success", t("common.save"), "Success");
      setOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Branch) => {
    if (!window.confirm(t("branches.deleteConfirm"))) return;
    try {
      await deleteBranch(b.id);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("branches.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("branches.description")}
          </p>
        </div>
        <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
          {t("branches.add")}
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
                <th className="px-3 py-3 font-medium">{t("branches.name")}</th>
                <th className="px-3 py-3 font-medium">{t("branches.address")}</th>
                <th className="px-3 py-3 font-medium text-right">{t("branches.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-3">
                    <span className="font-medium text-gray-800 dark:text-white/90">{b.name}</span>
                    {b.isDefault && (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        {t("branches.default")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{b.address || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                        aria-label={t("branches.edit")}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      {!b.isDefault && (
                        <button
                          type="button"
                          onClick={() => remove(b)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 dark:text-gray-400 dark:hover:bg-error-500/10"
                          aria-label={t("branches.delete")}
                        >
                          <TrashBinIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
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
        title={editing ? t("branches.editTitle") : t("branches.addTitle")}
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
            <Label>{t("branches.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("branches.namePlaceholder")}
            />
          </div>
          <div>
            <Label>{t("branches.address")}</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("branches.addressPlaceholder")}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
