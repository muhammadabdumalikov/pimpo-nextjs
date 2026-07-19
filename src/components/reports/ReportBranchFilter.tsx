"use client";
import { useEffect, useState } from "react";
import SelectField from "../form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { getBranches, type Branch } from "@/lib/api";
import { ReportFilterField } from "./ReportShell";

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
        if (active) setBranches(r.branches ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (branches.length === 0) return null;

  return (
    <ReportFilterField label={t("reportsPage.store")}>
      <SelectField
        className="min-w-[200px]"
        value={value}
        onChange={onChange}
        options={[
          { value: "", label: t("reportsPage.allStores") },
          ...branches.map((b) => ({ value: b.id, label: b.name })),
        ]}
      />
    </ReportFilterField>
  );
}
