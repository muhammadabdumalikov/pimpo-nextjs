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
import { getAccounts, createAccount, type Account } from "@/lib/api";

const CARD =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6";

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

/** Balance of an account for a currency (0 if none). */
const balOf = (a: Account, currency: string) =>
  Number(a.balances.find((b) => b.currency === currency)?.balance ?? 0);

export default function AccountsState() {
  const { t } = useTranslations();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"cash" | "noncash">("noncash");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setAccounts(await getAccounts());
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

  const totals = useMemo(() => {
    const sum = (kind: "cash" | "noncash", cur: string) =>
      accounts
        .filter((a) => a.type === kind)
        .reduce((s, a) => s + balOf(a, cur), 0);
    return {
      cashUZS: sum("cash", "UZS"),
      cashUSD: sum("cash", "USD"),
      noncashUZS: sum("noncash", "UZS"),
      noncashUSD: sum("noncash", "USD"),
    };
  }, [accounts]);

  const openAdd = () => {
    setName("");
    setType("noncash");
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createAccount({ name: name.trim(), type });
      showToast("success", t("finance.add"), "Success");
      setModalOpen(false);
      await load();
    } catch (e) {
      showToast("error", (e as Error).message, "Error");
    } finally {
      setSaving(false);
    }
  };

  const SummaryCard = ({
    title,
    uzs,
    usd,
  }: {
    title: string;
    uzs: number;
    usd: number;
  }) => (
    <div className={CARD}>
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {fmt(uzs)} <span className="text-base text-gray-400">UZS</span>
      </p>
      {usd !== 0 && (
        <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
          {fmt(usd)} USD
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          title={t("finance.cashTotal")}
          uzs={totals.cashUZS}
          usd={totals.cashUSD}
        />
        <SummaryCard
          title={t("finance.noncashTotal")}
          uzs={totals.noncashUZS}
          usd={totals.noncashUSD}
        />
      </div>

      <div className={CARD}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("finance.stateTitle")}
          </h3>
          <Button size="sm" startIcon={<PlusIcon />} onClick={openAdd}>
            {t("finance.newAccount")}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          </div>
        ) : accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-theme-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="px-3 py-3 font-medium">{t("finance.account")}</th>
                  <th className="px-3 py-3 font-medium">{t("finance.type")}</th>
                  <th className="px-3 py-3 font-medium text-right">UZS</th>
                  <th className="px-3 py-3 font-medium text-right">USD</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 dark:border-gray-800/60"
                  >
                    <td className="px-3 py-3 font-medium text-gray-800 dark:text-white/90">
                      {a.name}
                    </td>
                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                      {a.type === "cash"
                        ? t("finance.cashType")
                        : t("finance.noncashType")}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-800 dark:text-white/90">
                      {fmt(balOf(a, "UZS"))}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-800 dark:text-white/90">
                      {balOf(a, "USD") !== 0 ? fmt(balOf(a, "USD")) : "—"}
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
        title={t("finance.newAccount")}
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
            <Label>{t("finance.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("finance.type")}</Label>
            <SelectField
              value={type}
              onChange={(v) => setType(v as "cash" | "noncash")}
              options={[
                { value: "noncash", label: t("finance.noncashType") },
                { value: "cash", label: t("finance.cashType") },
              ]}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
