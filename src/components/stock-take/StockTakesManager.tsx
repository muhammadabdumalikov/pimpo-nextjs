"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon, TrashBinIcon } from "@/icons/index";
import {
  getStockTakes,
  createStockTake,
  createWriteOff,
  getProducts,
  getBranches,
  type StockTake,
  type Branch,
} from "@/lib/api";

// A pending write-off line in the drawer.
interface WriteOffLine {
  productId: string;
  name: string;
  qty: number;
  reason: string;
}

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

// Date + time in 24-hour format (uz-UZ), matching the rest of the app.
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("uz-UZ")}, ${d.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

// Diff money as a colored cell: >0 surplus (green), <0 shortage (red), 0 gray.
// The number carries its own sign (a "-" for shortages), so only positives get a
// leading "+" — no extra sign glyph (which caused a double "-" and a stray icon).
function DiffValue({ value }: { value: string | null }) {
  if (value == null)
    return (
      <span className="font-medium text-gray-500 dark:text-gray-400">—</span>
    );
  const n = Number(value);
  const cls =
    n > 0
      ? "text-success-600 dark:text-success-400"
      : n < 0
        ? "text-error-600 dark:text-error-400"
        : "text-gray-500 dark:text-gray-400";
  const text = n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
  return <span className={`font-medium ${cls}`}>{text}</span>;
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [storeId, setStoreId] = useState("");

  // Write-off drawer state.
  const [woOpen, setWoOpen] = useState(false);
  const [woLines, setWoLines] = useState<WriteOffLine[]>([]);
  const [woSaving, setWoSaving] = useState(false);
  const [woOptions, setWoOptions] = useState<
    { value: string; label: string; keywords?: string }[]
  >([]);
  const [woSearchLoading, setWoSearchLoading] = useState(false);

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
    getBranches()
      .then((res) => setBranches(res.branches))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default branch to preselect (the "Asosiy do'kon", else the first one).
  const defaultStoreId = (
    branches.find((b) => b.isDefault) ?? branches[0]
  )?.id;

  const openAdd = () => {
    setName("");
    setType("full");
    setStoreId(defaultStoreId ?? "");
    setModalOpen(true);
  };

  const start = async () => {
    if (!storeId) {
      showToast("error", t("stockTakes.storeRequired"), "Error");
      return;
    }
    setSaving(true);
    try {
      const created = await createStockTake({
        type,
        storeId,
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
  const storeOptions = branches.map((b) => ({ value: b.id, label: b.name }));

  const typeLabel = (v: StockTake["type"]) =>
    v === "full"
      ? t("stockTakes.full")
      : v === "writeoff"
        ? t("stockTakes.writeOff")
        : t("stockTakes.partial");

  const statusLabel = (v: StockTake["status"]) =>
    v === "completed"
      ? t("stockTakes.completed")
      : v === "cancelled"
        ? t("stockTakes.cancelled")
        : t("stockTakes.inProgress");

  const statusClass = (v: StockTake["status"]) =>
    v === "completed"
      ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
      : v === "cancelled"
        ? "bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
        : "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400";

  // ── Write-off drawer ──────────────────────────────────────────────────────
  const openWriteOff = () => {
    setWoLines([]);
    setWoOptions([]);
    setWoOpen(true);
  };

  const searchWoProducts = useCallback(async (query: string) => {
    try {
      setWoSearchLoading(true);
      const res = await getProducts(1, 20, query || undefined);
      setWoOptions(
        res.products.map((p) => ({
          value: p.id,
          label: p.name,
          keywords: [p.code, p.barcode].filter(Boolean).join(" "),
        })),
      );
    } catch {
      setWoOptions([]);
    } finally {
      setWoSearchLoading(false);
    }
  }, []);

  const addWoLine = (value: string) => {
    const opt = woOptions.find((o) => o.value === value);
    if (!opt) return;
    setWoLines((prev) =>
      prev.some((l) => l.productId === value)
        ? prev
        : [
            ...prev,
            { productId: value, name: opt.label, qty: 1, reason: "" },
          ],
    );
  };

  const updateWoLine = (productId: string, patch: Partial<WriteOffLine>) =>
    setWoLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)),
    );

  const removeWoLine = (productId: string) =>
    setWoLines((prev) => prev.filter((l) => l.productId !== productId));

  const submitWriteOff = async () => {
    const items = woLines
      .filter((l) => l.qty > 0)
      .map((l) => ({
        productId: l.productId,
        qty: l.qty,
        reason: l.reason.trim() || undefined,
      }));
    if (items.length === 0) return;
    setWoSaving(true);
    try {
      await createWriteOff({ items });
      showToast("success", t("stockTakes.writeOffDone"), "Success");
      setWoOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setWoSaving(false);
    }
  };

  return (
    <div className={`${CARD} min-h-fill`}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("stockTakes.title")}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            startIcon={<TrashBinIcon />}
            onClick={openWriteOff}
          >
            {t("stockTakes.writeOff")}
          </Button>
          <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
            {t("stockTakes.new")}
          </Button>
        </div>
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
                      {formatDateTime(s.startedAt)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                    {typeLabel(s.type)}
                  </td>
                  <td className="px-3 py-3">
                    <DiffValue value={s.diffValue} />
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${statusClass(
                        s.status,
                      )}`}
                    >
                      {statusLabel(s.status)}
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
            <Button onClick={start} disabled={saving || !storeId}>
              {t("stockTakes.start")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>
              {t("stockTakes.store")}{" "}
              <span className="text-error-500">*</span>
            </Label>
            <SelectField
              options={storeOptions}
              value={storeId}
              onChange={setStoreId}
              placeholder={t("stockTakes.selectStore")}
            />
          </div>
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

      {/* Write-off drawer — reduces stock immediately, no count/freeze. */}
      <Drawer
        isOpen={woOpen}
        onClose={() => !woSaving && setWoOpen(false)}
        title={t("stockTakes.writeOff")}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setWoOpen(false)}
              disabled={woSaving}
            >
              {t("stockTakes.cancel")}
            </Button>
            <Button
              onClick={submitWriteOff}
              disabled={woSaving || woLines.length === 0}
            >
              {t("stockTakes.writeOffConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("stockTakes.writeOffHint")}
          </p>
          <div>
            <Label>{t("stockTakes.product")}</Label>
            <SelectField
              options={woOptions}
              value=""
              onChange={addWoLine}
              onSearch={searchWoProducts}
              loading={woSearchLoading}
              placeholder={t("stockTakes.searchProduct")}
              searchPlaceholder={t("stockTakes.searchProduct")}
              portal
            />
          </div>

          {woLines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-theme-sm text-gray-400 dark:border-gray-800">
              {t("stockTakes.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {woLines.map((l) => (
                <div
                  key={l.productId}
                  className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {l.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeWoLine(l.productId)}
                      className="text-gray-400 hover:text-error-500"
                      aria-label={t("stockTakes.cancel")}
                    >
                      <TrashBinIcon />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="w-24">
                      <Label>{t("stockTakes.counted")}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={l.qty}
                        onChange={(e) =>
                          updateWoLine(l.productId, {
                            qty: e.target.value === "" ? 0 : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <Label>{t("stockTakes.reason")}</Label>
                      <Input
                        value={l.reason}
                        placeholder={t("stockTakes.reasonPlaceholder")}
                        onChange={(e) =>
                          updateWoLine(l.productId, { reason: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
