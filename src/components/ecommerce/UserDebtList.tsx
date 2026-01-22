"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
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
import { useTranslations } from "@/hooks/useTranslations";
import { useSubscription } from "@/context/SubscriptionContext";

// Define the TypeScript interface for the debt
interface UserDebt {
  id: number;
  userName: string;
  phone: string;
  amount: string;
  status: "Paid" | "Pending" | "Overdue";
  dueDate: string;
  createdAt: string;
  description?: string; // Optional description field
}

// Define the table data using the interface
const tableData: UserDebt[] = [
  {
    id: 1,
    userName: "John Doe",
    phone: "+1 (555) 123-4567",
    amount: "$1,250",
    status: "Pending",
    dueDate: "15 Jan, 2028",
    createdAt: "01 Dec, 2027",
    description: "Monthly subscription payment",
  },
  {
    id: 2,
    userName: "Jane Smith",
    phone: "+1 (555) 234-5678",
    amount: "$850",
    status: "Paid",
    dueDate: "10 Dec, 2027",
    createdAt: "29 Nov, 2027",
    description: "Service fee for Q4",
  },
  {
    id: 3,
    userName: "Mike Johnson",
    phone: "+1 (555) 345-6789",
    amount: "$2,100",
    status: "Overdue",
    dueDate: "05 Dec, 2027",
    createdAt: "13 Nov, 2027",
    description: "Outstanding invoice #1234",
  },
  {
    id: 4,
    userName: "Sarah Williams",
    phone: "+1 (555) 456-7890",
    amount: "$650",
    status: "Paid",
    dueDate: "20 Jan, 2028",
    createdAt: "18 Nov, 2027",
  },
  {
    id: 5,
    userName: "David Brown",
    phone: "+1 (555) 567-8901",
    amount: "$1,800",
    status: "Pending",
    dueDate: "25 Jan, 2028",
    createdAt: "28 Oct, 2027",
  },
  {
    id: 6,
    userName: "Emily Davis",
    phone: "+1 (555) 678-9012",
    amount: "$950",
    status: "Paid",
    dueDate: "12 Dec, 2027",
    createdAt: "18 Oct, 2027",
  },
  {
    id: 7,
    userName: "Robert Wilson",
    phone: "+1 (555) 789-0123",
    amount: "$1,450",
    status: "Overdue",
    dueDate: "30 Nov, 2027",
    createdAt: "02 Oct, 2027",
  },
  {
    id: 8,
    userName: "Lisa Anderson",
    phone: "+1 (555) 890-1234",
    amount: "$750",
    status: "Pending",
    dueDate: "18 Jan, 2028",
    createdAt: "15 Sep, 2027",
  },
  {
    id: 9,
    userName: "James Taylor",
    phone: "+1 (555) 901-2345",
    amount: "$1,100",
    status: "Paid",
    dueDate: "08 Dec, 2027",
    createdAt: "10 Sep, 2027",
  },
  {
    id: 10,
    userName: "Maria Garcia",
    phone: "+1 (555) 012-3456",
    amount: "$1,600",
    status: "Pending",
    dueDate: "22 Jan, 2028",
    createdAt: "05 Sep, 2027",
  },
  {
    id: 11,
    userName: "William Martinez",
    phone: "+1 (555) 123-7890",
    amount: "$2,300",
    status: "Overdue",
    dueDate: "28 Nov, 2027",
    createdAt: "01 Sep, 2027",
  },
  {
    id: 12,
    userName: "Jennifer Lee",
    phone: "+1 (555) 234-8901",
    amount: "$880",
    status: "Paid",
    dueDate: "14 Dec, 2027",
    createdAt: "28 Aug, 2027",
  },
  {
    id: 13,
    userName: "Christopher White",
    phone: "+1 (555) 345-9012",
    amount: "$1,350",
    status: "Pending",
    dueDate: "20 Jan, 2028",
    createdAt: "20 Aug, 2027",
  },
  {
    id: 14,
    userName: "Amanda Harris",
    phone: "+1 (555) 456-0123",
    amount: "$1,050",
    status: "Paid",
    dueDate: "11 Dec, 2027",
    createdAt: "15 Aug, 2027",
  },
  {
    id: 15,
    userName: "Daniel Clark",
    phone: "+1 (555) 567-1234",
    amount: "$1,700",
    status: "Overdue",
    dueDate: "03 Dec, 2027",
    createdAt: "10 Aug, 2027",
  },
  {
    id: 16,
    userName: "Jessica Lewis",
    phone: "+1 (555) 678-2345",
    amount: "$920",
    status: "Pending",
    dueDate: "16 Jan, 2028",
    createdAt: "05 Aug, 2027",
  },
  {
    id: 17,
    userName: "Matthew Walker",
    phone: "+1 (555) 789-3456",
    amount: "$1,180",
    status: "Paid",
    dueDate: "09 Dec, 2027",
    createdAt: "01 Aug, 2027",
  },
  {
    id: 18,
    userName: "Ashley Hall",
    phone: "+1 (555) 890-4567",
    amount: "$1,420",
    status: "Pending",
    dueDate: "19 Jan, 2028",
    createdAt: "25 Jul, 2027",
  },
  {
    id: 19,
    userName: "Andrew Allen",
    phone: "+1 (555) 901-5678",
    amount: "$1,650",
    status: "Overdue",
    dueDate: "01 Dec, 2027",
    createdAt: "20 Jul, 2027",
  },
  {
    id: 20,
    userName: "Michelle Young",
    phone: "+1 (555) 012-6789",
    amount: "$1,100",
    status: "Paid",
    dueDate: "13 Dec, 2027",
    createdAt: "15 Jul, 2027",
  },
  {
    id: 21,
    userName: "John Doe",
    phone: "+1 (555) 123-4567",
    amount: "$500",
    status: "Pending",
    dueDate: "20 Jan, 2028",
    createdAt: "05 Dec, 2027",
    description: "Consulting services fee",
  },
  {
    id: 22,
    userName: "John Doe",
    phone: "+1 (555) 123-4567",
    amount: "$750",
    status: "Overdue",
    dueDate: "01 Dec, 2027",
    createdAt: "10 Nov, 2027",
    description: "Late payment penalty",
  },
  {
    id: 23,
    userName: "John Doe",
    phone: "+1 (555) 123-4567",
    amount: "$1,000",
    status: "Paid",
    dueDate: "05 Dec, 2027",
    createdAt: "15 Nov, 2027",
    description: "Equipment rental charge",
  },
  {
    id: 24,
    userName: "John Doe",
    phone: "+1 (555) 123-4567",
    amount: "$300",
    status: "Pending",
    dueDate: "25 Jan, 2028",
    createdAt: "01 Dec, 2027",
    description: "Maintenance service fee",
  },
];

interface UserDebtGroup {
  userName: string;
  phone: string;
  totalDebt: number;
  debts: UserDebt[];
}

export default function UserDebtList() {
  const { t } = useTranslations();
  const { getLimit, isLimitReached } = useSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDebts, setSelectedDebts] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UserDebt>>({});
  const [debts, setDebts] = useState<UserDebt[]>(tableData);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const itemsPerPage = 7;

  // Check debt limit
  const debtLimit = getLimit('debts');
  const debtLimitReached = debtLimit !== null && isLimitReached('debts', debts.length);

  // Helper function to parse amount string to number
  const parseAmount = (amount: string): number => {
    return parseFloat(amount.replace(/[$,]/g, "")) || 0;
  };

  // Helper function to format number to currency string
  const formatAmount = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
  };

  // Group debts by user
  const groupDebtsByUser = (debtsList: UserDebt[]): UserDebtGroup[] => {
    const grouped = debtsList.reduce((acc, debt) => {
      const key = debt.userName;
      if (!acc[key]) {
        acc[key] = {
          userName: debt.userName,
          phone: debt.phone,
          totalDebt: 0,
          debts: [],
        };
      }
      acc[key].debts.push(debt);
      acc[key].totalDebt += parseAmount(debt.amount);
      return acc;
    }, {} as Record<string, UserDebtGroup>);

    return Object.values(grouped);
  };

  // Filter debts based on search query
  const filteredDebts = debts.filter(
    (debt) =>
      debt.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.amount.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered debts
  const userGroups = groupDebtsByUser(filteredDebts);

  // Calculate pagination for user groups
  const totalPages = Math.ceil(userGroups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGroups = userGroups.slice(startIndex, endIndex);

  // Toggle user expansion with loading state
  const toggleUserExpansion = (userName: string) => {
    const isCurrentlyExpanded = expandedUsers.has(userName);
    
    if (isCurrentlyExpanded) {
      // Collapse immediately
      setExpandedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userName);
        return newSet;
      });
    } else {
      // Expand and show loading
      setExpandedUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(userName);
        return newSet;
      });
      
      // Set loading state
      setLoadingUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(userName);
        return newSet;
      });
      
      // Simulate API call delay (1-1.5 seconds)
      setTimeout(() => {
        setLoadingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userName);
          return newSet;
        });
      }, 1200);
    }
  };

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Get all debt IDs from expanded groups on current page
      const pageIds: number[] = [];
      paginatedGroups.forEach(group => {
        if (expandedUsers.has(group.userName)) {
          pageIds.push(...group.debts.map(d => d.id));
        }
      });
      setSelectedDebts([...new Set([...selectedDebts, ...pageIds])]);
    } else {
      // Remove all debt IDs from current page
      const pageIds: number[] = [];
      paginatedGroups.forEach(group => {
        pageIds.push(...group.debts.map(d => d.id));
      });
      setSelectedDebts(selectedDebts.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectDebt = (debtId: number, checked: boolean) => {
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

  const handleEdit = (debt: UserDebt) => {
    setEditingId(debt.id);
    setEditFormData({
      userName: debt.userName,
      phone: debt.phone,
      amount: debt.amount,
      status: debt.status,
      dueDate: debt.dueDate,
      description: debt.description || "",
    });
  };

  const handleSave = (id: number) => {
    setDebts(debts.map(debt => 
      debt.id === id 
        ? { ...debt, ...editFormData } 
        : debt
    ));
    setEditingId(null);
    setEditFormData({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('userDebt.deleteConfirm'))) {
      setDebts(debts.filter(debt => debt.id !== id));
      setSelectedDebts(selectedDebts.filter(debtId => debtId !== id));
      // If the deleted debt was being edited, cancel editing
      if (editingId === id) {
        setEditingId(null);
        setEditFormData({});
      }
    }
  };

  const handleEditChange = (field: keyof UserDebt, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper function to parse date from "DD MMM, YYYY" format to Date object
  const parseDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    // Parse format like "15 Jan, 2028"
    const months: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const parts = dateString.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1].replace(',', '')];
      const year = parseInt(parts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return undefined;
  };

  // Helper function to format date from Date object or "Y-m-d" string to "DD MMM, YYYY" format
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '';
    let dateObj: Date;
    if (typeof date === 'string') {
      // If it's already in "DD MMM, YYYY" format, return as is
      if (date.match(/^\d{1,2} \w{3}, \d{4}$/)) {
        return date;
      }
      // If it's in "Y-m-d" format from DatePicker, parse it
      const parts = date.split('-');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        return date;
      }
    } else {
      dateObj = date;
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = dateObj.getDate();
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month}, ${year}`;
  };

  const handleDateChange = (dates: Date[], dateStr: string) => {
    // dateStr is in "Y-m-d" format from flatpickr
    // Convert to "DD MMM, YYYY" format for storage
    const formattedDate = formatDate(dateStr);
    handleEditChange("dueDate", formattedDate);
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
            <Link
              href="/add-debt"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <PlusIcon />
              {t('userDebt.addDebt')}
            </Link>
          )}
          {debtLimit !== null && !debtLimitReached && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('userDebt.limitInfo').replace('{current}', String(debts.length)).replace('{limit}', String(debtLimit))}
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

        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200">
          <svg
            className="stroke-current fill-white dark:fill-gray-800 w-4 h-4"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.29004 5.90393H17.7067"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17.7075 14.0961H2.29085"
              stroke=""
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z"
              fill=""
              stroke=""
              strokeWidth="1.5"
            />
            <path
              d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
              fill=""
              stroke=""
              strokeWidth="1.5"
            />
          </svg>
          {t('userDebt.filter')}
        </button>
      </div>

      {/* Debts Table */}
      <div className="w-full overflow-x-auto -mx-4 sm:-mx-6" style={{ scrollbarGutter: 'stable' }}>
        <Table className="w-full [table-layout:fixed]">
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
            {paginatedGroups.map((group) => {
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
                    loadingUsers.has(group.userName) ? (
                      // Loading state
                      <TableRow className="bg-white dark:bg-gray-900/50">
                        <TableCell colSpan={7} className="py-8 px-4 sm:px-6">
                          <div className="flex items-center justify-center gap-3">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{t('userDebt.loadingDebts')}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
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
                            <p className={`font-normal text-base ${debt.description ? 'text-gray-800 dark:text-white/90' : 'text-gray-400 italic'}`}>
                              {debt.description || t('userDebt.noDescription')}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 sm:px-6 w-[20%]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFormData.phone || ""}
                              onChange={(e) => handleEditChange("phone", e.target.value)}
                              className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-base text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                            />
                          ) : (
                            <span className="text-gray-500 text-base dark:text-gray-400">
                              {debt.phone}
                            </span>
                          )}
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
                              {debt.amount}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 sm:px-6 w-[15%]">
                          {isEditing ? (
                            <div className="relative">
                              <select
                                value={editFormData.status || ""}
                                onChange={(e) => handleEditChange("status", e.target.value as UserDebt["status"])}
                                className="h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 pr-10 text-base text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                              >
                                {statusOptions.map((option) => (
                                  <option key={option.value} value={option.value} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.792 7.396 10 12.604l5.208-5.208"></path>
                                </svg>
                              </span>
                            </div>
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
                                defaultDate={editFormData.dueDate ? parseDate(editFormData.dueDate) : undefined}
                                onChange={handleDateChange}
                              />
                            </div>
                          ) : (
                            <span className="text-gray-500 text-base dark:text-gray-400">
                              {debt.dueDate}
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
                    )
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 pt-4 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('userDebt.showing')} {userGroups.length > 0 ? startIndex + 1 : 0} {t('userDebt.to')}{" "}
          {Math.min(endIndex, userGroups.length)} {t('userDebt.of')} {userGroups.length} {t('userDebt.results')}
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
    </div>
  );
}
