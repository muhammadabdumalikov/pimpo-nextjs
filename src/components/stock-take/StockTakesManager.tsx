"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon } from "@/icons/index";
import {
  getStockTakes,
  createStockTake,
  type StockTake,
} from "@/lib/api";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

// Diff money as a colored cell: >0 surplus (green), <0 shortage (red), 0 gray.
function DiffValue({ value }: { value: string | null }) {
  const n = value == null ? 0 : Number(value);
  const cls =
    n > 0
      ? "text-success-600 dark:text-success-400"
      : n < 0
        ? "text-error-600 dark:text-error-400"
        : "text-gray-500 dark:text-gray-400";
  const sign = n > 0 ? "➕" : n < 0 ? "➖" : "➡️";
  return (
    <span className={`font-medium ${cls}`}>
      {sign} {value == null ? "—" : Number(value).toLocaleString()}
    </span>
  );
}

export default function StockTakesManager() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<StockTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"full" | "partial">("full");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getStockTakes({ page: 1, limit: 50 });
      setItems(res.items);
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
    setType("full");
    setModalOpen(true);
  };

  const start = async () => {
    setSaving(true);
    try {
      const created = await createStockTake({
        type,
        name: name.trim() || undefined,
      });
      showToast("success", t("stockTakes.start"), "Success");
      setModalOpen(false);
      router.push(`/stock-takes/${created.id}`);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    { value: "full", label: t("stockTakes.full") },
    { value: "partial", label: t("stockTakes.partial") },
  ];

  return (
    <div className={CARD}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("stockTakes.title")}
        </h3>
        <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
          {t("stockTakes.new")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-3 font-medium">{t("stockTakes.name")}</th>
                <th className="px-3 py-3 font-medium">{t("stockTakes.type")}</th>
                <th className="px-3 py-3 font-medium">{t("stockTakes.diffValue")}</th>
                <th className="px-3 py-3 font-medium">{t("stockTakes.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/stock-takes/${s.id}`)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-800 dark:text-white/90">
                      {s.name}
                    </div>
                    <div className="text-theme-xs text-gray-400">
                      {new Date(s.startedAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                    {s.type === "full"
                      ? t("stockTakes.full")
                      : t("stockTakes.partial")}
                  </td>
                  <td className="px-3 py-3">
                    <DiffValue value={s.diffValue} />
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${
                        s.status === "completed"
                          ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                          : "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400"
                      }`}
                    >
                      {s.status === "completed"
                        ? t("stockTakes.completed")
                        : t("stockTakes.inProgress")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
          <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
            {t("stockTakes.empty")}
          </p>
        </div>
      )}

      <Drawer
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={t("stockTakes.new")}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              {t("stockTakes.cancel")}
            </Button>
            <Button onClick={start} disabled={saving}>
              {t("stockTakes.start")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>{t("stockTakes.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("stockTakes.type")}</Label>
            <SelectField
              options={typeOptions}
              value={type}
              onChange={(v) => setType(v as "full" | "partial")}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
