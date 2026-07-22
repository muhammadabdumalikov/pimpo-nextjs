"use client";
import SelectField from "../form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { ReportFilterField } from "./ReportShell";
import type { CompareMode } from "@/lib/reportCompare";

// Period-over-period comparison selector (R29) for a report's filter panel:
// Off / previous period / same period last year.
export default function ReportCompareToggle({
  value,
  onChange,
}: {
  value: CompareMode;
  onChange: (v: CompareMode) => void;
}) {
  const { t } = useTranslations();
  return (
    <ReportFilterField label={t("reportsPage.compareLabel")}>
      <SelectField
        className="min-w-[170px]"
        value={value}
        onChange={(v) => onChange(v as CompareMode)}
        options={[
          { value: "off", label: t("reportsPage.compareOff") },
          { value: "prev", label: t("reportsPage.comparePrev") },
          { value: "yoy", label: t("reportsPage.compareYoy") },
        ]}
      />
    </ReportFilterField>
  );
}
