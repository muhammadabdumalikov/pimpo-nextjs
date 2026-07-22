"use client";
import { useEffect, useState } from "react";
import SelectField from "../form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { getBranches, type Branch } from "@/lib/api";
import { ReportFilterField } from "./ReportShell";

// The selected store carries across every report (and reloads) via
// localStorage, so a multi-store owner picks their branch once per session.
const STORAGE_KEY = "reports.branchId";

// Store ("do'kon") selector for the filter panel. Renders nothing until the
// branch list loads. A single default branch still shows so the control is
// present; it becomes genuinely useful once the business runs multiple stores.
export default function ReportBranchFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslations();
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    let active = true;
    getBranches()
      .then((r) => {
        if (!active) return;
        const list = r.branches ?? [];
        setBranches(list);
        // Restore the last-picked branch once, only when the report still has
        // its default ("all") and the saved branch still exists.
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          // `value` here is the mount-time prop (deps: []), i.e. the default.
          if (!value && saved && list.some((b) => b.id === saved)) onChange(saved);
        } catch {
          // Storage unavailable (private mode) — just skip persistence.
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (v: string) => {
    try {
      if (v) localStorage.setItem(STORAGE_KEY, v);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — selection still works for this page.
    }
    onChange(v);
  };

  if (branches.length === 0) return null;

  return (
    <ReportFilterField label={t("reportsPage.store")}>
      <SelectField
        className="min-w-[200px]"
        value={value}
        onChange={handleChange}
        options={[
          { value: "", label: t("reportsPage.allStores") },
          ...branches.map((b) => ({ value: b.id, label: b.name })),
        ]}
      />
    </ReportFilterField>
  );
}
