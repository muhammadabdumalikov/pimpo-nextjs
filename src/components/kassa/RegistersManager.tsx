"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon, PencilIcon } from "@/icons/index";
import {
  getRegisters,
  createRegister,
  updateRegister,
  type CashRegister,
} from "@/lib/api";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

export default function RegistersManager() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CashRegister | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setRegisters(await getRegisters());
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
    setEditing(null);
    setName("");
    setModalOpen(true);
  };
  const openEdit = (r: CashRegister) => {
    setEditing(r);
    setName(r.name);
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateRegister(editing.id, { name: name.trim() });
        showToast("success", t("kassa.save"), "Success");
      } else {
        await createRegister({ name: name.trim() });
        showToast("success", t("kassa.add"), "Success");
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={CARD}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("kassa.registers")}
        </h3>
        <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
          {t("kassa.newRegister")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : registers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-3 font-medium">{t("kassa.name")}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {registers.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 dark:border-gray-800/60"
                >
                  <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                    {r.name}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10"
                        aria-label={t("kassa.edit")}
                      >
                        <PencilIcon className="h-5 w-5" />
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
          {editing ? t("kassa.edit") : t("kassa.newRegister")}
        </h2>
        <div>
          <Label>{t("kassa.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
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
    </div>
  );
}
