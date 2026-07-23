"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { Drawer } from "@/components/ui/drawer";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  type Unit,
} from "@/lib/api";

// How a quantity of 1 renders at each precision — the clearest way to show
// what "aniqlik" means (mirrors BiLLZ: Штука `1`, Метр `.00`, Кг `.000`).
const precisionExample = (p: number) => (p === 0 ? "1" : (1).toFixed(p));

// Sozlamalar → O'lchov birliklari (SOZLAMALAR.md S2): per-business unit
// catalogue with precision. Product/checkout wiring lands in a later pass.
export default function UnitsManagement() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [precision, setPrecision] = useState("0");
  const [saving, setSaving] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const precisionOptions = [0, 1, 2, 3].map((p) => ({
    value: String(p),
    label: `${precisionExample(p)} — ${t(`unitsPage.precision${p}`)}`,
  }));

  const load = async () => {
    const res = await getUnits();
    setUnits(res.units);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await getUnits();
        if (active) setUnits(res.units);
      } catch (err: unknown) {
        showToast("error", (err as Error)?.message || "Failed to load units", "Error");
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
    setShortName("");
    setPrecision("0");
    setOpen(true);
  };

  const openEdit = (u: Unit) => {
    setEditing(u);
    setName(u.name);
    setShortName(u.shortName);
    setPrecision(String(u.precision));
    setOpen(true);
  };

  const submit = async () => {
    if (!name.trim() || !shortName.trim()) {
      showToast("error", t("unitsPage.nameRequired"), "Error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        shortName: shortName.trim(),
        precision: Number(precision),
      };
      if (editing) await updateUnit(editing.id, payload);
      else await createUnit(payload);
      showToast("success", t("common.save"), "Success");
      setOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!unitToDelete) return;
    setDeleting(true);
    try {
      await deleteUnit(unitToDelete.id);
      setUnitToDelete(null);
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
            {t("unitsPage.title")}
          </h3>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("unitsPage.description")}
          </p>
        </div>
        <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
          {t("unitsPage.add")}
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
                <th className="px-3 py-3 font-medium">{t("unitsPage.name")}</th>
                <th className="px-3 py-3 font-medium">{t("unitsPage.shortName")}</th>
                <th className="px-3 py-3 font-medium">{t("unitsPage.precision")}</th>
                <th className="px-3 py-3 font-medium text-right">{t("unitsPage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-3">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {u.name}
                    </span>
                    {u.businessId === null && (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        {t("unitsPage.system")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                    {u.shortName}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-theme-xs text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                      {precisionExample(u.precision)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {/* System units (businessId null) are immutable */}
                    {u.businessId !== null && (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                          aria-label={t("unitsPage.edit")}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setUnitToDelete(u)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 dark:text-gray-400 dark:hover:bg-error-500/10"
                          aria-label={t("unitsPage.delete")}
                        >
                          <TrashBinIcon className="h-5 w-5" />
                        </button>
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
        title={editing ? t("unitsPage.editTitle") : t("unitsPage.addTitle")}
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
            <Label>{t("unitsPage.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("unitsPage.namePlaceholder")}
              maxLength={100}
            />
          </div>
          <div>
            <Label>{t("unitsPage.shortName")}</Label>
            <Input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder={t("unitsPage.shortNamePlaceholder")}
              maxLength={20}
            />
          </div>
          <div>
            <Label>{t("unitsPage.precision")}</Label>
            <Select
              options={precisionOptions}
              onChange={(v) => setPrecision(v)}
              defaultValue={precision}
            />
            <p className="mt-1.5 text-theme-xs text-gray-400">
              {t("unitsPage.precisionHint")}
            </p>
          </div>
        </div>
      </Drawer>

      <ConfirmModal
        isOpen={!!unitToDelete}
        onClose={() => !deleting && setUnitToDelete(null)}
        onConfirm={confirmRemove}
        title={t("unitsPage.deleteTitle")}
        message={
          unitToDelete ? `${unitToDelete.name} (${unitToDelete.shortName})` : ""
        }
        confirmLabel={t("unitsPage.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
