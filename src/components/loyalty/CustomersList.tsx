"use client";
import React, { useEffect, useState } from "react";
import { LuGift, LuUserRound } from "react-icons/lu";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Pagination from "@/components/ui/pagination/Pagination";
import Drawer from "@/components/ui/drawer";
import { useTranslations } from "@/hooks/useTranslations";
import { useToast } from "@/context/ToastContext";
import {
  getLoyaltyCustomers,
  getLoyaltyCustomerHistory,
  type LoyaltyCustomer,
  type LoyaltyTransaction,
} from "@/lib/api";

const nf = new Intl.NumberFormat("uz-UZ");
const money = (v: string | number) => nf.format(Math.round(Number(v) || 0));

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("uz-UZ")}, ${d.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

// Signed, colored amount for a ledger row (earn = +green, redeem/expire = −red).
function txSign(t: LoyaltyTransaction) {
  const n = Number(t.amount) || 0;
  const positive = n >= 0;
  return {
    positive,
    text: `${positive ? "+" : "−"}${money(Math.abs(n))}`,
  };
}

export default function CustomersList() {
  const { t } = useTranslations();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // History drawer.
  const [selected, setSelected] = useState<LoyaltyCustomer | null>(null);
  const [history, setHistory] = useState<LoyaltyTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLoyaltyCustomers(page, itemsPerPage, debounced || undefined)
      .then((res) => {
        if (!active) return;
        setCustomers(res.customers);
        setTotal(res.total);
      })
      .catch((e) => showToast("error", (e as Error).message, "Error"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, itemsPerPage, debounced]);

  const openHistory = (c: LoyaltyCustomer) => {
    setSelected(c);
    setHistory([]);
    setHistoryLoading(true);
    getLoyaltyCustomerHistory(c.id, 1, 50)
      .then((res) => setHistory(res.transactions))
      .catch((e) => showToast("error", (e as Error).message, "Error"))
      .finally(() => setHistoryLoading(false));
  };

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  return (
    <div className="min-h-fill overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {t("clients.title")}
        </h3>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("clients.subtitle")}
        </p>
      </div>

      {/* Search */}
      <div className="mb-4 max-w-md">
        <input
          type="text"
          placeholder={t("clients.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <LuUserRound className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("clients.empty")}
          </p>
        </div>
      ) : (
        <div className="custom-scrollbar overflow-x-auto">
          <Table>
            <TableHeader className="border-y border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("clients.customer")}
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("clients.balance")}
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("clients.tier")}
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("clients.totalSpent")}
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("clients.lastVisit")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {customers.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => openHistory(c)}
                  className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-sm font-semibold text-brand-500 dark:bg-brand-500/10">
                        {(c.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-800 dark:text-white/90">
                          {c.name}
                        </p>
                        <p className="truncate text-theme-xs text-gray-400 dark:text-gray-500">
                          {c.phone}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="tabular-nums font-semibold text-success-600 dark:text-success-500">
                      {money(c.bonusBalance)}
                    </span>{" "}
                    <span className="text-theme-xs text-gray-400">
                      {t("clients.points")}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {c.tier ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <LuGift size={12} />
                        {c.tier}
                      </span>
                    ) : (
                      <span className="text-theme-xs text-gray-300 dark:text-gray-600">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 tabular-nums text-theme-sm text-gray-600 dark:text-gray-300">
                    {money(c.totalSpent)}{" "}
                    <span className="text-theme-xs text-gray-400">so'm</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {formatDate(c.lastOrderAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={itemsPerPage}
        onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
        onItemsPerPageChange={(n) => {
          setItemsPerPage(n);
          setPage(1);
        }}
      />

      {/* Cashback history drawer */}
      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        widthClass="max-w-md"
      >
        {selected && (
          <div className="space-y-5">
            {/* Balance header */}
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50/60 to-transparent p-4 dark:border-gray-800 dark:from-brand-500/[0.07]">
              <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
                {t("clients.balance")}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-success-600 dark:text-success-500">
                {money(selected.bonusBalance)}{" "}
                <span className="text-base font-semibold text-success-600/70">
                  {t("clients.points")}
                </span>
              </p>
              <div className="mt-2 flex items-center gap-3 text-theme-xs text-gray-400">
                <span>{selected.phone}</span>
                {selected.tier && (
                  <span className="inline-flex items-center gap-1 text-brand-500">
                    <LuGift size={12} /> {selected.tier}
                  </span>
                )}
              </div>
            </div>

            {/* Ledger */}
            <div>
              <p className="mb-2 text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("clients.history")}
              </p>
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-theme-sm text-gray-400 dark:border-gray-800 dark:text-gray-500">
                  {t("clients.noHistory")}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {history.map((tx) => {
                    const s = txSign(tx);
                    return (
                      <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                            {t(`clients.tx.${tx.type}`)}
                          </p>
                          <p className="text-theme-xs text-gray-400">
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`tabular-nums font-semibold ${
                              s.positive
                                ? "text-success-600 dark:text-success-500"
                                : "text-error-600 dark:text-error-500"
                            }`}
                          >
                            {s.text}
                          </p>
                          <p className="text-theme-xs tabular-nums text-gray-400">
                            {money(tx.balanceAfter)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
