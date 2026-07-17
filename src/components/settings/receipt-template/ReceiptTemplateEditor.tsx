"use client";
import React from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SelectField from "@/components/form/SelectField";
import type { CashRegister, ReceiptTemplate } from "@/lib/api";
import {
  footerLinkHasValue,
  footerLinkPlaceholder,
} from "@/lib/receiptTemplate";
import type { ReceiptTplStrings } from "@/lib/receiptTemplateI18n";
import Toggle from "./Toggle";
import FieldReorderList from "./FieldReorderList";
import RichTextNote from "./RichTextNote";
import ImageUpload from "./ImageUpload";

interface ReceiptTemplateEditorProps {
  template: ReceiptTemplate;
  registers: CashRegister[];
  strings: ReceiptTplStrings;
  onPatch: (patch: Partial<ReceiptTemplate>) => void;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  onExtraUpload: (file: File) => void;
  onExtraRemove: () => void;
}

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-200 pt-5 dark:border-gray-700">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h4>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function ReceiptTemplateEditor({
  template,
  registers,
  strings: L,
  onPatch,
  onLogoUpload,
  onLogoRemove,
  onExtraUpload,
  onExtraRemove,
}: ReceiptTemplateEditorProps) {
  const registerOptions = [
    { value: "", label: L.registerDefault },
    ...registers.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      {/* Name */}
      <div>
        <Label>{L.name}</Label>
        <Input
          type="text"
          value={template.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder={L.namePlaceholder}
          className="mt-2"
        />
      </div>

      {/* Print type */}
      <div>
        <Label>{L.printType}</Label>
        <SelectField
          className="mt-2"
          value={template.printType}
          onChange={(v) => onPatch({ printType: v as ReceiptTemplate["printType"] })}
          options={[
            { value: "receipt", label: L.typeReceipt },
            { value: "waybill", label: L.waybill },
          ]}
        />
      </div>

      {/* Register binding */}
      <div>
        <Label>{L.register}</Label>
        <SelectField
          className="mt-2"
          value={template.isDefault ? "" : template.registerId ?? ""}
          disabled={template.isDefault}
          onChange={(v) => onPatch({ registerId: v || null })}
          options={registerOptions}
        />
        <div className="mt-3">
          <Toggle
            checked={template.isDefault}
            onChange={(v) => onPatch({ isDefault: v })}
            label={L.makeDefault}
          />
        </div>
      </div>

      {/* Logo */}
      <Section
        title={L.logo}
        right={
          <Toggle
            checked={template.showLogo}
            onChange={(v) => onPatch({ showLogo: v })}
          />
        }
      >
        {template.showLogo ? (
          <ImageUpload
            src={template.logoUrl}
            onUpload={onLogoUpload}
            onRemove={onLogoRemove}
            label={L.uploadLogo}
            strings={L}
          />
        ) : null}
      </Section>

      {/* Info block */}
      <Section title={L.infoBlock}>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          {L.reorderHint}
        </p>
        <FieldReorderList
          dragType="info-field"
          items={template.infoFields ?? []}
          onChange={(items) => onPatch({ infoFields: items })}
          labelFor={(k) => L.infoFields[k] ?? k}
        />
      </Section>

      {/* Extra toggles */}
      <Section title={L.extra}>
        <div className="space-y-3">
          <Toggle
            checked={template.showProductAttributes}
            onChange={(v) => onPatch({ showProductAttributes: v })}
            label={L.productAttributes}
          />
          <Toggle
            checked={template.showCustomerBalance}
            onChange={(v) => onPatch({ showCustomerBalance: v })}
            label={L.customerBalance}
          />
          <Toggle
            checked={template.showCustomerDebt}
            onChange={(v) => onPatch({ showCustomerDebt: v })}
            label={L.customerDebt}
          />
        </div>
      </Section>

      {/* Extra image */}
      <Section title={L.extraImage}>
        <ImageUpload
          src={template.extraImageUrl}
          onUpload={onExtraUpload}
          onRemove={onExtraRemove}
          label={L.uploadExtraImage}
          strings={L}
        />
      </Section>

      {/* Footer block */}
      <Section title={L.footerBlock}>
        <FieldReorderList
          dragType="footer-link"
          items={template.footerLinks ?? []}
          onChange={(items) => onPatch({ footerLinks: items })}
          labelFor={(k) => L.footerLinks[k] ?? k}
          hasValue={(k) => footerLinkHasValue(k)}
          placeholderFor={(k) => footerLinkPlaceholder(k)}
        />
      </Section>

      {/* Note */}
      <Section title={L.note}>
        <RichTextNote
          value={template.footerText ?? ""}
          onChange={(html) => onPatch({ footerText: html })}
          placeholder={L.notePlaceholder}
        />
      </Section>

      {/* Powered by */}
      <Section
        title={L.poweredByToggle}
        right={
          <Toggle
            checked={template.showPoweredBy}
            onChange={(v) => onPatch({ showPoweredBy: v })}
          />
        }
      />
    </div>
  );
}
