"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon, TrashBinIcon } from "@/icons/index";
import {
  getStockTransfers,
  getStockTransfer,
  createStockTransfer,
  getProducts,
  getBranches,
  type StockTransfer,
  type StockTransferItem,
  type Branch,
} from "@/lib/api";

// A pending transfer line in the drawer.
interface TransferLine {
  productId: string;
  name: string;
  qty: number;
  available: number;
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

export default function TransfersManager() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [items, setItems] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Create drawer state.
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [options, setOptions] = useState<
    { value: string; label: string; keywords?: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // productId → available-in-source, captured from the scoped product search.
  const availRef = useRef<Map<string, number>>(new Map());

  // Detail drawer state.
  const [detail, setDetail] = useState<
    (StockTransfer & { items: StockTransferItem[] }) | null
  >(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getStockTransfers({ page: 1, limit: 50 });
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

  const defaultBranchId = (branches.find((b) => b.isDefault) ?? branches[0])?.id;

  const openAdd = () => {
    const from = defaultBranchId ?? "";
    setFromBranchId(from);
    setToBranchId(branches.find((b) => b.id !== from)?.id ?? "");
    setLines([]);
    setOptions([]);
    availRef.current = new Map();
    setOpen(true);
  };

  // Product search is scoped to the SOURCE branch, so options carry that
  // branch's on-hand as the label/availability (a transfer can only move what
  // the source actually holds).
  const searchProducts = useCallback(
    async (query: string) => {
      if (!fromBranchId) {
        setOptions([]);
        return;
      }
      try {
        setSearchLoading(true);
        const res = await getProducts(1, 20, query || undefined, fromBranchId);
        const next = new Map(availRef.current);
        for (const p of res.products) next.set(p.id, p.quantity);
        availRef.current = next;
        setOptions(
          res.products.map((p) => ({
            value: p.id,
            label: `${p.name} — ${p.quantity}`,
            keywords: [p.code, p.barcode].filter(Boolean).join(" "),
          })),
        );
      } catch {
        setOptions([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [fromBranchId],
  );

  // Changing the source branch invalidates the picked lines (availability and
  // even which products exist differ per branch).
  const onFromChange = (v: string) => {
    setFromBranchId(v);
    if (toBranchId === v) {
      setToBranchId(branches.find((b) => b.id !== v)?.id ?? "");
    }
    setLines([]);
    setOptions([]);
    availRef.current = new Map();
  };

  const addLine = (value: string) => {
    const opt = options.find((o) => o.value === value);
    if (!opt) return;
    const available = availRef.current.get(value) ?? 0;
    const name = opt.label.split(" — ")[0];
    setLines((prev) =>
      prev.some((l) => l.productId === value)
        ? prev
        : [
            ...prev,
            { productId: value, name, qty: available > 0 ? 1 : 0, available },
          ],
    );
  };

  const updateLine = (productId: string, patch: Partial<TransferLine>) =>
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)),
    );

  const removeLine = (productId: string) =>
    setLines((prev) => prev.filter((l) => l.productId !== productId));

  const hasInvalidLine = lines.some(
    (l) => l.qty <= 0 || l.qty > l.available,
  );

  const submit = async () => {
    const payload = lines
      .filter((l) => l.qty > 0 && l.qty <= l.available)
      .map((l) => ({ productId: l.productId, quantity: l.qty }));
    if (payload.length === 0 || !fromBranchId || !toBranchId) return;
    if (fromBranchId === toBranchId) {
      showToast("error", t("transfers.sameBranch"), "Error");
      return;
    }
    setSaving(true);
    try {
      await createStockTransfer({
        fromBranchId,
        toBranchId,
        items: payload,
      });
      showToast("success", t("transfers.done"), "Success");
      setOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: string) => {
    try {
      const d = await getStockTransfer(id);
      setDetail(d);
      setDetailOpen(true);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    }
  };

  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name ?? id;
  const toOptions = branches
    .filter((b) => b.id !== fromBranchId)
    .map((b) => ({ value: b.id, label: b.name }));
  const fromOptions = branches.map((b) => ({ value: b.id, label: b.name }));

  const notEnoughBranches = branches.length < 2;

  return (
    <div className={`${CARD} min-h-fill`}>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("transfers.title")}
        </h3>
        <Button
          size="sm"
          startIcon={<PlusIcon />}
          onClick={openAdd}
          disabled={notEnoughBranches}
        >
          {t("transfers.new")}
        </Button>
      </div>

      {notEnoughBranches && !loading && (
        <div className="mb-4 rounded-xl border border-dashed border-gray-200 py-3 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {t("transfers.needTwoBranches")}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-3 font-medium">{t("transfers.route")}</th>
                <th className="px-3 py-3 font-medium">
                  {t("transfers.itemCount")}
                </th>
                <th className="px-3 py-3 font-medium">
                  {t("transfers.totalQty")}
                </th>
                <th className="px-3 py-3 font-medium">
                  {t("transfers.totalValue")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => openDetail(s.id)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-800 dark:text-white/90">
                      {(s.fromBranchName ?? branchName(s.fromBranchId)) +
                        " → " +
                        (s.toBranchName ?? branchName(s.toBranchId))}
                    </div>
                    <div className="text-theme-xs text-gray-400">
                      {formatDateTime(s.createdAt)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                    {s.itemCount}
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                    {Number(s.totalQty).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                    {Number(s.totalValue).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
          <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
            {t("transfers.empty")}
          </p>
        </div>
      )}

      {/* Create transfer drawer. */}
      <Drawer
        isOpen={open}
        onClose={() => !saving && setOpen(false)}
        title={t("transfers.new")}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              {t("transfers.cancel")}
            </Button>
            <Button
              onClick={submit}
              disabled={
                saving ||
                lines.length === 0 ||
                hasInvalidLine ||
                !fromBranchId ||
                !toBranchId
              }
            >
              {t("transfers.confirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>
                {t("transfers.from")} <span className="text-error-500">*</span>
              </Label>
              <SelectField
                options={fromOptions}
                value={fromBranchId}
                onChange={onFromChange}
                placeholder={t("transfers.selectFrom")}
              />
            </div>
            <div className="flex-1">
              <Label>
                {t("transfers.to")} <span className="text-error-500">*</span>
              </Label>
              <SelectField
                options={toOptions}
                value={toBranchId}
                onChange={setToBranchId}
                placeholder={t("transfers.selectTo")}
              />
            </div>
          </div>

          <div>
            <Label>{t("transfers.product")}</Label>
            <SelectField
              options={options}
              value=""
              onChange={addLine}
              onSearch={searchProducts}
              loading={searchLoading}
              placeholder={
                fromBranchId
                  ? t("transfers.searchProduct")
                  : t("transfers.selectFromFirst")
              }
              searchPlaceholder={t("transfers.searchProduct")}
              portal
            />
          </div>

          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-theme-sm text-gray-400 dark:border-gray-800">
              {t("transfers.noLines")}
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map((l) => (
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
                      onClick={() => removeLine(l.productId)}
                      className="text-gray-400 hover:text-error-500"
                      aria-label={t("transfers.cancel")}
                    >
                      <TrashBinIcon />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-28">
                      <Label>{t("transfers.qty")}</Label>
                      <Input
                        type="number"
                        min="0"
                        step={0.001}
                        max={String(l.available)}
                        value={l.qty}
                        error={l.qty > l.available || l.qty <= 0}
                        onChange={(e) =>
                          updateLine(l.productId, {
                            qty:
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="pb-2 text-theme-xs text-gray-500 dark:text-gray-400">
                      {t("transfers.available")}: {l.available.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      {/* Detail drawer — the moved rows of a past transfer. */}
      <Drawer
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("transfers.detailTitle")}
      >
        {detail && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-3 text-theme-sm dark:border-gray-800">
              <div className="font-medium text-gray-800 dark:text-white/90">
                {(detail.fromBranchName ?? branchName(detail.fromBranchId)) +
                  " → " +
                  (detail.toBranchName ?? branchName(detail.toBranchId))}
              </div>
              <div className="mt-1 text-theme-xs text-gray-400">
                {formatDateTime(detail.createdAt)}
                {detail.createdByCashierName
                  ? ` · ${detail.createdByCashierName}`
                  : ""}
              </div>
              {detail.note && (
                <div className="mt-1 text-gray-500 dark:text-gray-400">
                  {detail.note}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                    <th className="px-3 py-2 font-medium">
                      {t("transfers.product")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("transfers.qty")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("transfers.lineValue")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items.map((it) => (
                    <tr
                      key={it.id}
                      className="border-b border-gray-100 dark:border-gray-800/60"
                    >
                      <td className="px-3 py-2 text-gray-800 dark:text-white/90">
                        {it.productName}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {it.quantity.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {Number(it.lineTotal).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
