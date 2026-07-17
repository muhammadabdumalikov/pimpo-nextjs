"use client";
import React, { useMemo } from "react";
import { getStoredAccount, type ReceiptTemplate } from "@/lib/api";
import { useTranslations } from "@/hooks/useTranslations";
import { receiptTplStrings } from "@/lib/receiptTemplateI18n";
import type { Locale } from "@/i18n/config";
import {
  buildReceiptHtml,
  receiptCss,
  sampleReceiptData,
} from "@/lib/receiptRender";

interface ReceiptTemplatePreviewProps {
  template: ReceiptTemplate;
  widthMm: number;
}

/**
 * Live thermal-receipt preview. Renders the exact HTML the printer would emit
 * (via {@link buildReceiptHtml}) with the shared receipt CSS, so what you see
 * matches the printout. Uses the real store name and the current UI language.
 */
export default function ReceiptTemplatePreview({
  template,
  widthMm,
}: ReceiptTemplatePreviewProps) {
  const { locale } = useTranslations();
  const strings = useMemo(
    () => receiptTplStrings(locale as Locale),
    [locale],
  );
  const html = useMemo(() => {
    const storeName =
      getStoredAccount()?.name || strings.out.defaultStoreName;
    return buildReceiptHtml(template, sampleReceiptData(storeName), strings);
  }, [template, strings]);

  return (
    <div className="flex justify-center rounded-2xl bg-gray-100 p-6 dark:bg-gray-800/50">
      <style>{receiptCss(widthMm)}</style>
      <div
        className="shadow-lg"
        style={{ background: "#fff" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
