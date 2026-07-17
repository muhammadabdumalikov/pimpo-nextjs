"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { PlusIcon } from "@/icons/index";
import { digitsOnly, formatNumberInput } from "@/lib/number";
import {
  getReceipt,
  getAccounts,
  addReceiptPayment,
  createReceiptReturn,
  receiveReceipt,
  type GoodsReceipt,
  type Account,
} from "@/lib/api";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n));
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReceiptDetail({ id }: { id: string }) {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnQtys, setReturnQtys] = useState<Record<string, string>>({});
  const [returnNote, setReturnNote] = useState("");
  const [returnSaving, setReturnSaving] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const load = async () => {
    const res = await getReceipt(id);
    setReceipt(res);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await getReceipt(id);
        if (active) setReceipt(res);
      } catch (err: unknown) {
        showToast("error", (err as Error)?.message || "Failed to load receipt", "Error");
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openPay = async () => {
    setAmount("");
    setNote("");
    setPayOpen(true);
    if (accounts.length === 0) {
      try {
        setAccounts(await getAccounts());
      } catch {
        /* selects just show empty */
      }
    }
  };

  const submitPayment = async () => {
    const amt = Number(digitsOnly(amount));
    if (!accountId) {
      showToast("error", t("goodsReceipt.paymentAccount"), "Error");
      return;
    }
    if (!amt || amt <= 0) {
      showToast("error", t("goodsReceipt.paymentAmount"), "Error");
      return;
    }
    setSaving(true);
    try {
      await addReceiptPayment(id, {
        accountId,
        amount: amt,
        note: note.trim() || undefined,
      });
      showToast("success", t("goodsReceipt.paymentSuccess"), "Success");
      setPayOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const doReceive = async () => {
    setReceiving(true);
    try {
      await receiveReceipt(id);
      showToast("success", t("goodsReceipt.receiveSuccess"), "Success");
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setReceiving(false);
    }
  };

  const openReturn = () => {
    setReturnQtys({});
    setReturnNote("");
    setReturnOpen(true);
  };

  const submitReturn = async () => {
    const items = Object.entries(returnQtys)
      .map(([productId, q]) => ({ productId, quantity: Number(q) || 0 }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) {
      showToast("error", t("goodsReceipt.returnQty"), "Error");
      return;
    }
    setReturnSaving(true);
    try {
      await createReceiptReturn(id, { items, note: returnNote.trim() || undefined });
      showToast("success", t("goodsReceipt.returnSuccess"), "Success");
      setReturnOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setReturnSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t("goodsReceipt.notFound")}
        </p>
        <Link href="/receipts" className="mt-3 text-theme-sm text-brand-500 hover:underline">
          {t("goodsReceipt.backToList")}
        </Link>
      </div>
    );
  }

  const total = Number(receipt.totalAmount);
  const paid = Number(receipt.paidAmount);
  const remaining = Math.max(0, total - paid);

  const statusBadge = () => {
    const s = receipt.paymentStatus;
    const cls =
      s === "paid"
        ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
        : s === "partial"
          ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
          : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400";
    const label =
      s === "paid"
        ? t("goodsReceipt.statusPaid")
        : s === "partial"
          ? t("goodsReceipt.statusPartial")
          : t("goodsReceipt.statusUnpaid");
    return (
      <span className={`rounded-full px-2.5 py-1 text-theme-xs font-medium ${cls}`}>
        {label}
      </span>
    );
  };

  const payments = receipt.payments ?? [];
  const returns = receipt.returns ?? [];

  // Aggregate the receipt's lines by product for the return form.
  const returnable = Array.from(
    (receipt.items ?? []).reduce((map, it) => {
      if (!it.productId) return map;
      const cur = map.get(it.productId);
      if (cur) cur.qty += it.quantity;
      else map.set(it.productId, { name: it.productName, qty: it.quantity });
      return map;
    }, new Map<string, { name: string; qty: number }>()),
  ).map(([productId, v]) => ({ productId, ...v }));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              {t("goodsReceipt.detailTitle")}
            </h3>
            <dl className="space-y-1 text-theme-sm text-gray-500 dark:text-gray-400">
              <div className="flex gap-2">
                <dt>{t("goodsReceipt.date")}:</dt>
                <dd className="text-gray-700 dark:text-gray-300">{formatDateTime(receipt.createdAt)}</dd>
              </div>
              <div className="flex gap-2">
                <dt>{t("goodsReceipt.supplier")}:</dt>
                <dd className="text-gray-700 dark:text-gray-300">{receipt.supplierName || "—"}</dd>
              </div>
              {receipt.note && (
                <div className="flex gap-2">
                  <dt>{t("goodsReceipt.note")}:</dt>
                  <dd className="text-gray-700 dark:text-gray-300">{receipt.note}</dd>
                </div>
              )}
              {receipt.usdRate && (
                <div className="flex gap-2">
                  <dt>{t("goodsReceipt.usdRate")}:</dt>
                  <dd className="text-gray-700 dark:text-gray-300">
                    1 USD = {formatMoney(Number(receipt.usdRate))} UZS
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <Link href="/receipts" className="text-theme-sm text-brand-500 hover:underline">
            {t("goodsReceipt.backToList")}
          </Link>
        </div>

        {/* Payment summary */}
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:grid-cols-4">
          <div>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{t("goodsReceipt.total")}</p>
            <p className="mt-0.5 font-semibold text-gray-800 dark:text-white/90">{formatMoney(total)} {receipt.currency}</p>
          </div>
          <div>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{t("goodsReceipt.paid")}</p>
            <p className="mt-0.5 font-semibold text-success-600 dark:text-success-400">{formatMoney(paid)} {receipt.currency}</p>
          </div>
          <div>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{t("goodsReceipt.remaining")}</p>
            <p className="mt-0.5 font-semibold text-error-600 dark:text-error-400">{formatMoney(remaining)} {receipt.currency}</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">{t("goodsReceipt.paymentStatus")}</p>
            {statusBadge()}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {receipt.status === "draft" ? (
            <>
              <span className="mr-auto text-theme-sm text-warning-600 dark:text-warning-400">
                {t("goodsReceipt.draftHint")}
              </span>
              <Button size="sm" onClick={doReceive} disabled={receiving}>
                {t("goodsReceipt.receive")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={openReturn}>
                {t("goodsReceipt.returnGoods")}
              </Button>
              <Button size="sm" startIcon={<PlusIcon />} onClick={openPay}>
                {t("goodsReceipt.addPayment")}
              </Button>
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[680px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-3 py-3 font-medium">{t("goodsReceipt.product")}</th>
                <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.quantity")}</th>
                <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.priceIn")}</th>
                <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.priceOut")}</th>
                <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.priceWholesale")}</th>
                <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {(receipt.items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800/60">
                  <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">{item.productName}</td>
                  <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                  <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">
                    {formatMoney(Number(item.priceIn))}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">
                    {item.priceOut ? formatMoney(Number(item.priceOut)) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">
                    {item.priceWholesale ? formatMoney(Number(item.priceWholesale)) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                    {formatMoney(Number(item.lineTotal))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-3 py-3 text-right font-semibold text-gray-800 dark:text-white/90">
                  {t("goodsReceipt.total")}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-gray-800 dark:text-white/90">
                  {formatMoney(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments history */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("goodsReceipt.paymentsHistory")}
        </h3>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[480px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.date")}</th>
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.paymentAccount")}</th>
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.note")}</th>
                  <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.paymentAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800/60">
                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {formatDateTime(p.paidAt ?? p.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{p.accountName ?? "—"}</td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{p.note ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(Number(p.amount))} {p.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 dark:border-gray-800">
            <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
              {t("goodsReceipt.noPayments")}
            </p>
          </div>
        )}
      </div>

      {/* Returns history */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("goodsReceipt.returnsHistory")}
        </h3>
        {returns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[420px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.date")}</th>
                  <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.itemCount")}</th>
                  <th className="px-3 py-3 font-medium">{t("goodsReceipt.note")}</th>
                  <th className="px-3 py-3 font-medium text-right">{t("goodsReceipt.total")}</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800/60">
                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{r.itemCount}</td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">{r.note ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-800 dark:text-white/90">
                      {formatMoney(Number(r.totalAmount))} {r.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 dark:border-gray-800">
            <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
              {t("goodsReceipt.noReturns")}
            </p>
          </div>
        )}
      </div>

      <Drawer
        isOpen={payOpen}
        onClose={() => !saving && setPayOpen(false)}
        title={t("goodsReceipt.addPayment")}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={saving}>
              {t("goodsReceipt.cancel")}
            </Button>
            <Button onClick={submitPayment} disabled={saving}>
              {t("goodsReceipt.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>{t("goodsReceipt.paymentAccount")}</Label>
            <SelectField
              value={accountId}
              onChange={setAccountId}
              placeholder={t("goodsReceipt.selectAccount")}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>
          <div>
            <Label>{t("goodsReceipt.paymentAmount")}</Label>
            <Input
              inputMode="numeric"
              value={formatNumberInput(amount)}
              onChange={(e) => setAmount(digitsOnly(e.target.value))}
              placeholder={formatMoney(remaining)}
            />
          </div>
          <div>
            <Label>{t("goodsReceipt.note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </Drawer>

      <Drawer
        isOpen={returnOpen}
        onClose={() => !returnSaving && setReturnOpen(false)}
        title={t("goodsReceipt.returnGoods")}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setReturnOpen(false)} disabled={returnSaving}>
              {t("goodsReceipt.cancel")}
            </Button>
            <Button onClick={submitReturn} disabled={returnSaving}>
              {t("goodsReceipt.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {returnable.map((p) => (
            <div key={p.productId} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                  {p.name}
                </p>
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {t("goodsReceipt.quantity")}: {p.qty}
                </p>
              </div>
              <Input
                type="number"
                min="0"
                max={String(p.qty)}
                value={returnQtys[p.productId] ?? ""}
                onChange={(e) =>
                  setReturnQtys((q) => ({ ...q, [p.productId]: e.target.value }))
                }
                placeholder="0"
                className="w-24"
              />
            </div>
          ))}
          <div>
            <Label>{t("goodsReceipt.note")}</Label>
            <Input value={returnNote} onChange={(e) => setReturnNote(e.target.value)} />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
