"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import { PlusIcon } from "@/icons/index";
import { digitsOnly, formatNumberInput } from "@/lib/number";
import {
  getFinanceTransactions,
  getAccounts,
  getFinanceCategories,
  createIncome,
  createExpense,
  createTransfer,
  type FinanceTransaction,
  type Account,
  type FinanceCategory,
  type Currency,
} from "@/lib/api";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

type FormType = "income" | "expense" | "transfer";
type Tab = "all" | "income" | "expense" | "transfer";

export default function FinanceTransactions() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [data, setData] = useState<FinanceTransaction[]>([]);
  const [summary, setSummary] = useState<
    { kind: string; currency: string; total: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);

  // Add form
  const [modalOpen, setModalOpen] = useState(false);
  const [formType, setFormType] = useState<FormType>("expense");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("UZS");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (kind?: Tab) => {
    try {
      setLoading(true);
      const res = await getFinanceTransactions(
        kind && kind !== "all" ? { kind } : {},
      );
      setData(res.transactions);
      setSummary(res.summary);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    (async () => {
      try {
        const [acc, cats] = await Promise.all([
          getAccounts(),
          getFinanceCategories(),
        ]);
        setAccounts(acc);
        setCategories(cats);
      } catch {
        /* forms just show empty selects */
      }
    })();
  }, []);

  // Summary cards always reflect the whole ledger, so sum from a fresh call is
  // fine; here we sum the current (filtered) response's summary for UZS.
  const sumKind = (kind: string) =>
    summary
      .filter((s) => s.kind === kind && s.currency === "UZS")
      .reduce((n, s) => n + Number(s.total), 0);

  const cards = [
    { label: t("finance.incomeSum"), value: sumKind("income") },
    { label: t("finance.expenseSum"), value: sumKind("expense") },
    { label: t("finance.transferSum"), value: sumKind("transfer") },
    { label: t("finance.shiftCloseSum"), value: sumKind("shift_close") },
  ];

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );
  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => (formType === "income" ? c.kind === "income" : c.kind === "expense"))
        .map((c) => ({ value: c.id, label: c.name })),
    [categories, formType],
  );

  const openAdd = () => {
    setFormType("expense");
    setAccountId("");
    setToAccountId("");
    setAmount("");
    setCurrency("UZS");
    setCategoryId("");
    setNote("");
    setModalOpen(true);
  };

  const save = async () => {
    const amt = Number(digitsOnly(amount));
    if (!amt || amt <= 0) {
      showToast("error", t("finance.amount"), "Error");
      return;
    }
    setSaving(true);
    try {
      if (formType === "transfer") {
        if (!accountId || !toAccountId || accountId === toAccountId) {
          showToast("error", t("finance.account"), "Error");
          setSaving(false);
          return;
        }
        await createTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount: amt,
          currency,
          note: note.trim() || undefined,
        });
      } else {
        if (!accountId) {
          showToast("error", t("finance.account"), "Error");
          setSaving(false);
          return;
        }
        const payload = {
          accountId,
          amount: amt,
          currency,
          categoryId: categoryId || undefined,
          note: note.trim() || undefined,
        };
        if (formType === "income") await createIncome(payload);
        else await createExpense(payload);
      }
      showToast("success", t("finance.add"), "Success");
      setModalOpen(false);
      await load(tab);
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const kindLabel = (k: FinanceTransaction["kind"]) =>
    k === "income"
      ? t("finance.income")
      : k === "expense"
        ? t("finance.expense")
        : k === "transfer"
          ? t("finance.transfer")
          : t("finance.shiftClose");

  const signed = (txn: FinanceTransaction) => {
    const n = Number(txn.amount);
    if (txn.kind === "expense") return `−${fmt(n)}`;
    if (txn.kind === "income" || txn.kind === "shift_close") return `+${fmt(n)}`;
    return fmt(n);
  };

  const amountClass = (k: FinanceTransaction["kind"]) =>
    k === "expense"
      ? "text-error-500"
      : k === "income" || k === "shift_close"
        ? "text-success-600 dark:text-success-400"
        : "text-gray-800 dark:text-white/90";

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: t("finance.all") },
    { key: "income", label: t("finance.tabIncome") },
    { key: "expense", label: t("finance.tabExpense") },
    { key: "transfer", label: t("finance.transfer") },
  ];

  const dt = (s: string) => new Date(s).toLocaleString("uz-UZ");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={CARD}>
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {c.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
              {fmt(c.value)} <span className="text-sm text-gray-400">UZS</span>
            </p>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                className={
                  tab === tb.key
                    ? "rounded-lg bg-brand-500 px-3 py-1.5 text-theme-sm font-medium text-white"
                    : "rounded-lg bg-gray-100 px-3 py-1.5 text-theme-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06]"
                }
              >
                {tb.label}
              </button>
            ))}
          </div>
          <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
            {t("finance.addTransaction")}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          </div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">{t("finance.date")}</th>
                  <th className="px-3 py-3 font-medium">{t("finance.type")}</th>
                  <th className="px-3 py-3 font-medium text-right">
                    {t("finance.amount")}
                  </th>
                  <th className="px-3 py-3 font-medium">{t("finance.account")}</th>
                  <th className="px-3 py-3 font-medium">{t("finance.category")}</th>
                  <th className="px-3 py-3 font-medium">{t("finance.user")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((txn) => (
                  <tr
                    key={txn.id}
                    className="border-b border-gray-100 dark:border-gray-800/60"
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {dt(txn.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-gray-800 dark:text-white/90">
                      {kindLabel(txn.kind)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-medium ${amountClass(txn.kind)}`}
                    >
                      {signed(txn)} {txn.currency}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                      {txn.kind === "transfer"
                        ? `${txn.accountName ?? "—"} → ${txn.toAccountName ?? "—"}`
                        : (txn.accountName ?? "—")}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                      {txn.categoryName ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                      {txn.cashierName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
            <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">
              {t("finance.empty")}
            </p>
          </div>
        )}
      </div>

      <Drawer
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={t("finance.addTransaction")}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              {t("finance.cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {t("finance.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>{t("finance.type")}</Label>
            <SelectField
              value={formType}
              onChange={(v) => setFormType(v as FormType)}
              options={[
                { value: "expense", label: t("finance.expense") },
                { value: "income", label: t("finance.income") },
                { value: "transfer", label: t("finance.transfer") },
              ]}
            />
          </div>

          <div>
            <Label>
              {formType === "transfer" ? t("finance.fromAccount") : t("finance.account")}
            </Label>
            <SelectField
              value={accountId}
              onChange={setAccountId}
              placeholder={t("finance.selectAccount")}
              options={accountOptions}
            />
          </div>

          {formType === "transfer" && (
            <div>
              <Label>{t("finance.toAccount")}</Label>
              <SelectField
                value={toAccountId}
                onChange={setToAccountId}
                placeholder={t("finance.selectAccount")}
                options={accountOptions.filter((o) => o.value !== accountId)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("finance.amount")}</Label>
              <Input
                value={formatNumberInput(amount)}
                onChange={(e) => setAmount(digitsOnly(e.target.value))}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label>{t("finance.currency")}</Label>
              <SelectField
                value={currency}
                onChange={(v) => setCurrency(v as Currency)}
                options={[
                  { value: "UZS", label: "UZS" },
                  { value: "USD", label: "USD" },
                ]}
              />
            </div>
          </div>

          {formType !== "transfer" && (
            <div>
              <Label>{t("finance.category")}</Label>
              <SelectField
                value={categoryId}
                onChange={setCategoryId}
                placeholder={t("finance.selectCategory")}
                options={categoryOptions}
              />
            </div>
          )}

          <div>
            <Label>{t("finance.note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
