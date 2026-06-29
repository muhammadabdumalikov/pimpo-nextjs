"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import { PlusIcon, DownloadIcon, ChevronLeftIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon, TrashBinIcon } from "@/icons/index";
import DatePicker from "../form/date-picker";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import SelectField from "../form/SelectField";
import { Modal } from "../ui/modal";
import { useModal } from "@/hooks/useModal";
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";
import { getDebtGroups, createDebt, updateDebt, deleteDebt, getDebtCount, getOrder, type Order, type DebtGroup } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

// Define the TypeScript interface for the debt (matching backend)
interface UserDebt {
  id: string;
  businessId: string;
  userId: string;
  orderId?: string | null;
  amount: string;
  status: "Paid" | "Pending" | "Overdue";
  dueDate: string | Date | null;
  createdAt: string | Date;
  description?: string | null;
  user?: {
    name: string;
    phone: string;
  };
}

export default function UserDebtList() {
  const { t } = useTranslations();
  const { getLimit, isLimitReached } = useSubscription();
  const { showToast } = useToast();
  // Customer groups come pre-grouped, sorted, paginated from the backend.
  const [groups, setGroups] = useState<DebtGroup[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // Filters + sort.
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "count">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDebts, setTotalDebts] = useState(0);
  const [selectedDebts, setSelectedDebts] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UserDebt>>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addDebtModal = useModal();
  // Order/receipt drill-in for a debt that came from a POS sale.
  const orderModal = useModal();
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const handleViewOrder = async (orderId: string) => {
    orderModal.openModal();
    setViewingOrder(null);
    setOrderLoading(true);
    try {
      const order = await getOrder(orderId);
      setViewingOrder(order);
    } catch (e) {
      showToast("error", (e as Error)?.message || "Failed to load order");
    } finally {
      setOrderLoading(false);
    }
  };
  const [addFormData, setAddFormData] = useState({
    userName: "",
    phone: "",
    amount: "",
    status: "Pending" as "Paid" | "Pending" | "Overdue",
    dueDate: "",
    description: "",
  });
  const itemsPerPage = 7;
  const searchDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check debt limit
  const debtLimit = getLimit('debts');
  const debtLimitReached = debtLimit !== null && isLimitReached('debts', totalDebts);

  // Helper function to parse amount string to number
  const parseAmount = (amount: string): number => {
    return parseFloat(amount.replace(/[$,]/g, "")) || 0;
  };

  // Helper function to format number to a UZS currency string (so'm).
  const formatAmount = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseAmount(amount) : amount;
    return `${new Intl.NumberFormat('uz-UZ').format(Math.round(numAmount))} so'm`;
  };

  // Format date helper
  const formatDate = (date: string | Date | null): string => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Date + time (with hours/minutes) for precise debt/sale timestamps.
  const formatDateTime = (date: string | Date | null): string => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Load customer groups (grouped + sorted + paginated server-side).
  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const [response, countRes] = await Promise.all([
        getDebtGroups(
          currentPage,
          itemsPerPage,
          searchQuery || undefined,
          statusFilter || undefined,
          dateFrom || undefined,
          dateTo || undefined,
          sortBy,
          sortDir,
        ),
        getDebtCount().catch(() => totalDebts),
      ]);
      setGroups(response.groups);
      setTotalGroups(response.total);
      setTotalDebts(countRes);
    } catch (error: any) {
      console.error('Failed to load debts:', error);
      showToast('error', error.message || 'Failed to load debts', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reload when the page changes.
  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Debounce search / filters / sort and reset to page 1.
  useEffect(() => {
    if (searchDebounceTimeout.current) {
      clearTimeout(searchDebounceTimeout.current);
    }
    searchDebounceTimeout.current = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 on new search/filter/sort
      loadGroups();
    }, 400);

    return () => {
      if (searchDebounceTimeout.current) {
        clearTimeout(searchDebounceTimeout.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, dateFrom, dateTo, sortBy, sortDir]);

  // The server already returns the page, grouped + sorted.
  const paginatedGroups = groups;
  const totalPages = Math.max(1, Math.ceil(totalGroups / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;

  // Toggle a customer's row; their debts are already nested in the group.
  const toggleUserExpansion = (userName: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userName)) next.delete(userName);
      else next.add(userName);
      return next;
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelectAll = (checked: boolean) => {
    // Debt IDs from the expanded customers on the current page.
    const pageIds: string[] = [];
    paginatedGroups.forEach(group => {
      if (expandedUsers.has(group.userName)) {
        pageIds.push(...group.debts.map(d => d.id));
      }
    });
    if (checked) {
      setSelectedDebts([...new Set([...selectedDebts, ...pageIds])]);
    } else {
      setSelectedDebts(selectedDebts.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectDebt = (debtId: string, checked: boolean) => {
    if (checked) {
      setSelectedDebts([...selectedDebts, debtId]);
    } else {
      setSelectedDebts(selectedDebts.filter(id => id !== debtId));
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "success";
      case "Pending":
        return "warning";
      case "Overdue":
        return "error";
      default:
        return "primary";
    }
  };

  const handleAddNew = () => {
    addDebtModal.openModal();
    setAddFormData({
      userName: "",
      phone: "",
      amount: "",
      status: "Pending",
      dueDate: "",
      description: "",
    });
  };

  const handleEdit = (debt: UserDebt) => {
    setEditingId(debt.id);
    setEditFormData({
      amount: debt.amount,
      status: debt.status,
      dueDate: debt.dueDate
        ? typeof debt.dueDate === 'string'
          ? debt.dueDate
          : debt.dueDate.toISOString()
        : "",
      description: debt.description || "",
    });
  };

  const handleSave = async (id: string) => {
    try {
      setIsSubmitting(true);
      await updateDebt(id, {
        amount: editFormData.amount,
        status: editFormData.status,
        dueDate: editFormData.dueDate as string,
        description: editFormData.description,
      });
      showToast('success', t('userDebt.updateSuccess') || 'Debt updated successfully', 'Success');
      setEditingId(null);
      setEditFormData({});
      // Reload groups (nested debts refresh with it).
      await loadGroups();
    } catch (error: any) {
      console.error('Failed to update debt:', error);
      showToast('error', error.message || t('userDebt.updateError') || 'Failed to update debt', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFormChange = (field: string, value: string) => {
    setAddFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addFormData.userName || !addFormData.phone || !addFormData.amount || !addFormData.dueDate) {
      showToast('error', 'Please fill in all required fields', 'Error');
      return;
    }

    try {
      setIsSubmitting(true);
      // Convert date from "Y-m-d" format to ISO string
      const dueDateISO = new Date(addFormData.dueDate + 'T00:00:00Z').toISOString();
      await createDebt({
        userName: addFormData.userName,
        phone: addFormData.phone,
        amount: addFormData.amount,
        status: addFormData.status,
        dueDate: dueDateISO,
        description: addFormData.description || undefined,
      });
      showToast('success', t('userDebt.addSuccess') || 'Debt added successfully', 'Success');
      addDebtModal.closeModal();
      setAddFormData({
        userName: "",
        phone: "",
        amount: "",
        status: "Pending",
        dueDate: "",
        description: "",
      });
      await loadGroups();
    } catch (error: any) {
      console.error('Failed to create debt:', error);
      showToast('error', error.message || t('userDebt.addError') || 'Failed to add debt', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFormDateChange = (dates: Date[], dateStr: string) => {
    handleAddFormChange("dueDate", dateStr);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('userDebt.deleteConfirm') || 'Are you sure you want to delete this debt?')) {
      return;
    }

    try {
      await deleteDebt(id);
      showToast('success', t('userDebt.deleteSuccess') || 'Debt deleted successfully', 'Success');
      setSelectedDebts(selectedDebts.filter(debtId => debtId !== id));
      // If the deleted debt was being edited, cancel editing
      if (editingId === id) {
        setEditingId(null);
        setEditFormData({});
      }
      // Reload groups (nested debts refresh with it).
      await loadGroups();
    } catch (error: any) {
      console.error('Failed to delete debt:', error);
      showToast('error', error.message || t('userDebt.deleteError') || 'Failed to delete debt', 'Error');
    }
  };

  const handleEditChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (dates: Date[], dateStr: string) => {
    // dateStr is in "Y-m-d" format from flatpickr
    // Store as ISO string for API
    handleEditChange("dueDate", dateStr);
  };

  const statusOptions = [
    { value: "Paid", label: t('userDebt.paid') },
    { value: "Pending", label: t('userDebt.pending') },
    { value: "Overdue", label: t('userDebt.overdue') },
  ];


  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
            {t('userDebt.title')}
          </h3>
          <p className="text-gray-500 text-theme-sm dark:text-gray-400">
            {t('userDebt.description')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
            <DownloadIcon />
            {t('userDebt.export')}
          </button>
          {debtLimitReached ? (
            <div className="flex items-center gap-2 text-sm text-warning-600 dark:text-warning-500">
              <span>{t('userDebt.limitReached').replace('{limit}', String(debtLimit))}</span>
            </div>
          ) : (
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <PlusIcon />
              {t('userDebt.addDebt')}
            </button>
          )}
          {debtLimit !== null && !debtLimitReached && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('userDebt.limitInfo').replace('{current}', String(totalDebts)).replace('{limit}', String(debtLimit))}
            </span>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
            <svg
              className="fill-gray-500 dark:fill-gray-400"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                fill=""
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder={t('userDebt.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Sort groups */}
          <SelectField
            className="min-w-[170px]"
            value={sortBy}
            onChange={(value) => setSortBy(value as "date" | "amount" | "count")}
            options={[
              { value: "date", label: t('userDebt.sortByDate') || 'Sort: Date' },
              { value: "amount", label: t('userDebt.sortByAmount') || 'Sort: Total debt' },
              { value: "count", label: t('userDebt.sortByCount') || 'Sort: Debt count' },
            ]}
          />
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? (t('userDebt.ascending') || 'Ascending') : (t('userDebt.descending') || 'Descending')}
            aria-label={sortDir === "asc" ? (t('userDebt.ascending') || 'Ascending') : (t('userDebt.descending') || 'Descending')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs transition hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            {/* Up/down sort icon */}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 3.5 3 8.5h3V20h2V8.5h3L7 3.5Zm10 17 4-5h-3V4h-2v11.5h-3l4 5Z" />
            </svg>
          </button>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-theme-sm font-medium shadow-theme-xs transition ${
              showFilters || statusFilter || dateFrom || dateTo
                ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200'
            }`}
          >
            <svg className="w-4 h-4" width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.29004 5.90393H17.7067" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17.7075 14.0961H2.29085" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {t('userDebt.filter')}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('userDebt.status') || 'Status'}</label>
            <SelectField
              className="w-full"
              buttonClassName="h-10"
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder={t('userDebt.allStatuses') || 'All statuses'}
              options={[
                { value: "", label: t('userDebt.allStatuses') || 'All statuses' },
                { value: "Pending", label: t('userDebt.pending') || 'Pending' },
                { value: "Overdue", label: t('userDebt.overdue') || 'Overdue' },
                { value: "Paid", label: t('userDebt.paid') || 'Paid' },
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('userDebt.dateFrom') || 'From'}</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('userDebt.dateTo') || 'To'}</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              disabled={!statusFilter && !dateFrom && !dateTo}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              {t('userDebt.clearFilters') || 'Clear'}
            </button>
          </div>
        </div>
      )}

      {/* Debts Table */}
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6" style={{ scrollbarGutter: 'stable' }}>
        <Table className="w-full min-w-[760px]! [table-layout:fixed]">
          {/* Table Header */}
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-12"
              >
                <span></span>
              </TableCell>
              <TableCell
                isHeader
                className="py-3 pr-4 sm:pl-2 sm:pr-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[28%]"
              >
                {t('userDebt.descriptionLabel')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[20%]"
              >
                {t('userDebt.phone')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[15%]"
              >
                {t('userDebt.amount')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[15%]"
              >
                {t('userDebt.status')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[12%]"
              >
                {t('userDebt.dueDate')}
              </TableCell>
              <TableCell
                isHeader
                className="py-3 px-4 sm:px-6 font-medium text-gray-500 text-start text-sm dark:text-gray-400 w-[13%]"
              >
                {t('userDebt.actions')}
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('userDebt.loading') || 'Loading debts...'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  {t('userDebt.noDebts') || 'No debts found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedGroups.map((group) => {
              const isExpanded = expandedUsers.has(group.userName);
              return (
                <React.Fragment key={group.userName}>
                  {/* User Group Row */}
                  <TableRow className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02] bg-gray-50/50 dark:bg-white/[0.02]">
                    <TableCell className="py-3 px-4 sm:px-6 w-12">
                      <button
                        onClick={() => toggleUserExpansion(group.userName)}
                        className="p-1 text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-transform"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="py-3 pr-4 sm:pl-2 sm:pr-6 w-[25%]">
                      <p className="font-semibold text-gray-800 text-base dark:text-white/90">
                        {group.userName}
                      </p>
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[20%]">
                      <span className="text-gray-500 text-base dark:text-gray-400">
                        {group.phone}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[15%]">
                      <p className="font-semibold text-gray-800 text-base dark:text-white/90">
                        {formatAmount(group.totalDebt)}
                      </p>
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[15%]">
                      <span className="text-gray-500 text-base dark:text-gray-400">
                        {group.debts.length} {group.debts.length === 1 ? t('userDebt.debt') : t('userDebt.debts')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[12%]">
                      <span className="text-gray-500 text-base dark:text-gray-400">
                        -
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 sm:px-6 w-[13%]">
                      <span className="text-gray-500 text-base dark:text-gray-400">
                        -
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Individual Debt Rows - Shown when expanded */}
                  {isExpanded && (
                      group.debts.map((debt) => {
                        const isEditing = editingId === debt.id;
                        return (
                          <TableRow key={debt.id} className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.02] bg-white dark:bg-gray-900/50">
                        <TableCell className="py-3 px-4 sm:px-6 w-12">
                          <span></span>
                        </TableCell>
                        <TableCell className="py-3 pl-8 sm:pl-10 pr-4 sm:pr-6 w-[28%]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.description || ""}
                              onChange={(e) => handleEditChange("description", e.target.value)}
                              placeholder={t('userDebt.descriptionPlaceholder')}
                              className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                            />
                          ) : (
                            <div>
                              <p className={`font-normal text-base ${debt.description ? 'text-gray-800 dark:text-white/90' : 'text-gray-400 italic'}`}>
                                {debt.description || t('userDebt.noDescription')}
                              </p>
                              <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                                <span>{formatDate(debt.createdAt)}</span>
                                {debt.orderId && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewOrder(debt.orderId!)}
                                    className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 font-medium text-brand-600 transition hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a.5.5 0 0 1-.74.44L11.5 12l-1.5.94L8.5 12 7 12.94 5.5 12l-1.76.94A.5.5 0 0 1 3 12.5v-9Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                                      <path d="M5.5 5.5h5M5.5 8h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                    </svg>
                                    {t('userDebt.viewItems') || 'View items'}
                                  </button>
                                )}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 sm:px-6 w-[20%]">
                            <span className="text-gray-500 text-base dark:text-gray-400">
                            {debt.user?.phone || ''}
                            </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 sm:px-6 w-[15%]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.amount || ""}
                              onChange={(e) => handleEditChange("amount", e.target.value)}
                              className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-base text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                            />
                          ) : (
                            <span className="text-gray-500 text-base dark:text-gray-400">
                              {formatAmount(debt.amount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 sm:px-6 w-[15%]">
                          {isEditing ? (
                            <SelectField
                              buttonClassName="h-9"
                              value={editFormData.status || ""}
                              onChange={(value) => handleEditChange("status", value as UserDebt["status"])}
                              options={statusOptions}
                            />
                          ) : (
                            <Badge color={getStatusBadgeColor(debt.status)}>
                              {t(`userDebt.${debt.status.toLowerCase()}`)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 sm:px-6 w-[12%]">
                          {isEditing ? (
                            <div className="[&>div]:mb-0 [&_input]:h-9 [&_input]:text-sm [&_input]:py-2">
                              <DatePicker
                                id={`due-date-${debt.id}`}
                                dateFormat="d.m.y" // should be in dd-mm-yy format
                                placeholder="Select due date"
                                mode="single"
                                defaultDate={editFormData.dueDate ? (typeof editFormData.dueDate === 'string' ? new Date(editFormData.dueDate) : editFormData.dueDate) : undefined}
                                onChange={handleDateChange}
                              />
                            </div>
                          ) : (
                            <span className="text-gray-500 text-base dark:text-gray-400">
                              {formatDate(debt.dueDate)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 sm:px-6 w-[13%]">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSave(debt.id)}
                                className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
                              >
                                {t('userDebt.save')}
                              </button>
                              <button
                                onClick={handleCancel}
                                className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                              >
                                {t('userDebt.cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(debt)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-yellow-900/20 dark:hover:border-yellow-700 dark:hover:text-yellow-400"
                                title={t('userDebt.edit')}
                              >
                                <PencilIcon/>
                              </button>
                              <button
                                onClick={() => handleDelete(debt.id)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-medium hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:border-red-700 dark:hover:text-red-400"
                                title={t('userDebt.delete')}
                              >
                                <TrashBinIcon/>
                              </button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                        );
                      })
                  )}
                </React.Fragment>
              );
            }))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 pt-4 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('userDebt.showing')} {totalGroups > 0 ? startIndex + 1 : 0} {t('userDebt.to')}{" "}
          {startIndex + paginatedGroups.length} {t('userDebt.of')} {totalGroups} {t('userDebt.results')}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 3) {
                page = i + 1;
              } else if (currentPage === 1) {
                page = i + 1;
              } else if (currentPage === totalPages) {
                page = totalPages - 2 + i;
              } else {
                page = currentPage - 1 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`flex w-10 h-10 items-center justify-center rounded-lg text-sm font-medium ${
                    currentPage === page
                      ? "bg-brand-500 text-white"
                      : "text-gray-700 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center h-10 w-10 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Add Debt Modal */}
      <Modal
        isOpen={addDebtModal.isOpen}
        onClose={addDebtModal.closeModal}
        className="max-w-[600px] p-5 lg:p-10"
      >
        <h4 className="font-semibold text-gray-800 mb-6 text-title-sm dark:text-white/90">
          {t('userDebt.addDebt')}
        </h4>
        <form onSubmit={handleAddFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('userDebt.user')} *</Label>
              <Input
                type="text"
                name="userName"
                value={addFormData.userName}
                onChange={(e) => handleAddFormChange("userName", e.target.value)}
                placeholder={t('userDebt.user') || "User name"}
                required
              />
            </div>
            <div>
              <Label>{t('userDebt.phone')} *</Label>
              <Input
                type="text"
                name="phone"
                value={addFormData.phone}
                onChange={(e) => handleAddFormChange("phone", e.target.value)}
                placeholder={t('userDebt.phone') || "Phone number"}
                required
              />
            </div>
            <div>
              <Label>{t('userDebt.amount')} *</Label>
              <Input
                type="text"
                name="amount"
                value={addFormData.amount}
                onChange={(e) => handleAddFormChange("amount", e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label>{t('userDebt.status')}</Label>
              <Select
                options={statusOptions}
                placeholder={t('userDebt.status') || "Select status"}
                onChange={(value) => handleAddFormChange("status", value)}
                defaultValue={addFormData.status}
              />
            </div>
            <div>
              <Label>{t('userDebt.dueDate')} *</Label>
              <DatePicker
                id="add-debt-due-date"
                dateFormat="Y-m-d"
                placeholder={t('userDebt.dueDate') || "Select due date"}
                mode="single"
                onChange={handleAddFormDateChange}
              />
            </div>
            <div>
              <Label>{t('userDebt.descriptionLabel')}</Label>
              <Input
                type="text"
                name="description"
                value={addFormData.description}
                onChange={(e) => handleAddFormChange("description", e.target.value)}
                placeholder={t('userDebt.descriptionPlaceholder') || "Description (optional)"}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={addDebtModal.closeModal}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              {t('userDebt.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              {isSubmitting ? t('userDebt.creating') || 'Creating...' : t('userDebt.addDebt')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Order / receipt detail for a debt that came from a POS sale */}
      <Modal
        isOpen={orderModal.isOpen}
        onClose={orderModal.closeModal}
        className="max-w-[520px] p-5 lg:p-8"
      >
        <h4 className="mb-1 text-title-sm font-semibold text-gray-800 dark:text-white/90">
          {t('userDebt.orderItems') || 'Items bought'}
        </h4>
        {orderLoading ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('userDebt.loadingDebts')}</span>
          </div>
        ) : viewingOrder ? (
          <div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {viewingOrder.customerName || ''}
              {viewingOrder.customerName ? ' · ' : ''}
              {formatDateTime(viewingOrder.createdAt)}
            </p>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-2.5 font-medium">{t('checkout.table.products')}</th>
                    <th className="px-4 py-2.5 text-center font-medium">{t('checkout.table.quantity')}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t('checkout.table.total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(viewingOrder.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-white/90">
                        {it.productName}
                        <span className="ml-1 text-xs text-gray-400">
                          ({formatAmount(it.priceOut)})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-500 dark:text-gray-400">{it.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{formatAmount(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">{t('checkout.total')}</dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">{formatAmount(viewingOrder.totalAmount)}</dd>
              </div>

              {/* Per-method breakdown of what was paid now (cash / card) */}
              {(viewingOrder.payments ?? []).map((p, i) => (
                <div key={i} className="flex justify-between pl-3 text-xs text-gray-500 dark:text-gray-400">
                  <dt>{t(`checkout.${p.method}`) || p.method}</dt>
                  <dd>{formatAmount(p.amount)}</dd>
                </div>
              ))}

              <div className="flex justify-between">
                <dt className="font-medium text-gray-600 dark:text-gray-300">{t('userDebt.paidAmount') || 'Paid'}</dt>
                <dd className="font-medium text-success-600 dark:text-success-500">
                  {formatAmount(viewingOrder.amountPaid || '0')}
                </dd>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-1.5 dark:border-gray-800">
                <dt className="font-medium text-gray-700 dark:text-gray-300">{t('userDebt.debtAmount') || 'Debt'}</dt>
                <dd className="font-semibold text-warning-600 dark:text-warning-400">
                  {formatAmount(Number(viewingOrder.totalAmount) - Number(viewingOrder.amountPaid || 0))}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-gray-400">—</p>
        )}
      </Modal>
    </div>
  );
}
