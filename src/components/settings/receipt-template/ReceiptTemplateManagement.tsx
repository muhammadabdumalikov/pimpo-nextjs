"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useToast } from "@/context/ToastContext";
import { useTranslations } from "@/hooks/useTranslations";
import {
  createReceiptTemplate,
  deleteReceiptTemplate,
  getReceiptTemplates,
  getRegisters,
  getStoredAccount,
  updateReceiptTemplate,
  uploadStorageFile,
  type CashRegister,
  type ReceiptTemplate,
  type UpsertReceiptTemplateDto,
} from "@/lib/api";
import {
  INFO_FIELD_KEYS,
  FOOTER_LINK_KEYS,
  defaultFooterLinks,
  defaultInfoFields,
  normalizeFields,
} from "@/lib/receiptTemplate";
import {
  buildReceiptHtml,
  printReceiptHtml,
  sampleReceiptData,
} from "@/lib/receiptRender";
import {
  receiptTplStrings,
  type ReceiptTplStrings,
} from "@/lib/receiptTemplateI18n";
import type { Locale } from "@/i18n/config";
import { PlusIcon, TrashBinIcon } from "@/icons/index";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import ReceiptTemplatePreview from "./ReceiptTemplatePreview";
import ReceiptTemplateEditor from "./ReceiptTemplateEditor";

// Sentinel id for an unsaved, in-editor template.
const NEW_ID = "";

function blankTemplate(L: ReceiptTplStrings): ReceiptTemplate {
  return {
    id: NEW_ID,
    businessId: "",
    name: L.newReceipt,
    printType: "receipt",
    registerId: null,
    showLogo: true,
    logoUrl: null,
    extraImageUrl: null,
    showCustomerBalance: false,
    showCustomerDebt: false,
    showProductAttributes: false,
    showPoweredBy: true,
    infoFields: defaultInfoFields(),
    footerLinks: defaultFooterLinks(),
    footerText: L.out.thankYou,
    isDefault: false,
    createdAt: "",
    updatedAt: "",
  };
}

// Normalize a fetched template's field arrays so the editor always has the full,
// ordered key set to render.
function toDraft(t: ReceiptTemplate): ReceiptTemplate {
  return {
    ...t,
    infoFields: normalizeFields(t.infoFields, INFO_FIELD_KEYS),
    footerLinks: normalizeFields(t.footerLinks, FOOTER_LINK_KEYS),
  };
}

export default function ReceiptTemplateManagement() {
  const { showToast } = useToast();
  const { locale } = useTranslations();
  const L = useMemo(() => receiptTplStrings(locale as Locale), [locale]);

  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [draft, setDraft] = useState<ReceiptTemplate>(() =>
    blankTemplate(receiptTplStrings(locale as Locale)),
  );
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingExtra, setPendingExtra] = useState<File | null>(null);
  const [widthMm, setWidthMm] = useState(80);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ReceiptTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (selectId?: string) => {
      const [list, regs] = await Promise.all([
        getReceiptTemplates(),
        getRegisters().catch(() => [] as CashRegister[]),
      ]);
      setTemplates(list);
      setRegisters(regs);
      const pick =
        list.find((t) => t.id === selectId) ??
        list.find((t) => t.isDefault) ??
        list[0];
      if (pick) {
        setDraft(toDraft(pick));
        setPendingLogo(null);
        setPendingExtra(null);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((e) => {
        if (!cancelled)
          showToast("error", (e as Error)?.message || L.toasts.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, showToast, L]);

  const isNew = draft.id === NEW_ID;

  const patch = useCallback((p: Partial<ReceiptTemplate>) => {
    setDraft((d) => ({ ...d, ...p }));
  }, []);

  const selectTemplate = (t: ReceiptTemplate) => {
    setDraft(toDraft(t));
    setPendingLogo(null);
    setPendingExtra(null);
  };

  const startNew = () => {
    setDraft(blankTemplate(L));
    setPendingLogo(null);
    setPendingExtra(null);
  };

  const onLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      patch({ logoUrl: reader.result as string });
      setPendingLogo(file);
    };
    reader.readAsDataURL(file);
  };
  const onLogoRemove = () => {
    patch({ logoUrl: null });
    setPendingLogo(null);
  };
  const onExtraUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      patch({ extraImageUrl: reader.result as string });
      setPendingExtra(file);
    };
    reader.readAsDataURL(file);
  };
  const onExtraRemove = () => {
    patch({ extraImageUrl: null });
    setPendingExtra(null);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      showToast("error", L.toasts.enterName);
      return;
    }
    setSaving(true);
    try {
      // Upload any freshly-picked images first.
      let logoUrl = draft.logoUrl;
      if (pendingLogo) {
        logoUrl = (await uploadStorageFile(pendingLogo, "receipts")).url;
      }
      let extraImageUrl = draft.extraImageUrl;
      if (pendingExtra) {
        extraImageUrl = (await uploadStorageFile(pendingExtra, "receipts")).url;
      }

      const dto: UpsertReceiptTemplateDto = {
        name: draft.name.trim(),
        printType: draft.printType,
        registerId: draft.isDefault ? null : draft.registerId,
        showLogo: draft.showLogo,
        logoUrl,
        extraImageUrl,
        showCustomerBalance: draft.showCustomerBalance,
        showCustomerDebt: draft.showCustomerDebt,
        showProductAttributes: draft.showProductAttributes,
        showPoweredBy: draft.showPoweredBy,
        infoFields: draft.infoFields ?? [],
        footerLinks: draft.footerLinks ?? [],
        footerText: draft.footerText,
        isDefault: draft.isDefault,
      };

      const saved = isNew
        ? await createReceiptTemplate({ ...dto, name: dto.name! })
        : await updateReceiptTemplate(draft.id, dto);

      showToast("success", L.toasts.saved);
      await load(saved.id);
    } catch (e) {
      showToast("error", (e as Error)?.message || L.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const remove = (t: ReceiptTemplate) => {
    if (t.isDefault) {
      showToast("error", L.toasts.cantDeleteDefault);
      return;
    }
    setTemplateToDelete(t);
  };

  const confirmRemove = async () => {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      await deleteReceiptTemplate(templateToDelete.id);
      showToast("success", L.toasts.deleted);
      setTemplateToDelete(null);
      await load();
    } catch (e) {
      showToast("error", (e as Error)?.message || L.toasts.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const testPrint = () => {
    const storeName = getStoredAccount()?.name || L.out.defaultStoreName;
    const html = buildReceiptHtml(draft, sampleReceiptData(storeName), L);
    printReceiptHtml(html, widthMm);
  };

  const registerName = useCallback(
    (id: string | null) =>
      id ? registers.find((r) => r.id === id)?.name ?? L.register : null,
    [registers, L],
  );

  const previewTemplate = useMemo(() => draft, [draft]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
              {L.title}
            </h3>
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {L.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={testPrint}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {L.testPrint}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? L.saving : L.save}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">{L.loading}</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
            {/* Template list — sticky */}
            <div className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start">
              <button
                onClick={startNew}
                className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-400 px-3 py-2.5 text-theme-sm font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
              >
                <PlusIcon /> {L.newReceipt}
              </button>
              <div className="space-y-2">
                {isNew ? (
                  <div className="rounded-lg border-2 border-brand-500 bg-brand-50 px-3 py-2.5 dark:bg-brand-900/20">
                    <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {draft.name || L.newReceipt}
                    </div>
                    <div className="text-xs text-gray-500">{L.notSaved}</div>
                  </div>
                ) : null}
                {templates.map((t) => {
                  const active = t.id === draft.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className={`flex cursor-pointer items-start justify-between gap-2 rounded-lg border px-3 py-2.5 ${
                        active
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                          {t.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {t.isDefault ? (
                            <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 dark:text-brand-400">
                              {L.defaultBadge}
                            </span>
                          ) : null}
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800">
                            {registerName(t.registerId) ?? L.allRegisters}
                          </span>
                          {t.printType === "waybill" ? (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800">
                              {L.waybill}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {!t.isDefault ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(t);
                          }}
                          className="shrink-0 text-gray-400 hover:text-red-500"
                          title={L.imageUpload.remove}
                        >
                          <TrashBinIcon />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live preview — sticky */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
              <div className="mb-3 flex items-center justify-end gap-2">
                <span className="text-xs text-gray-500">{L.width}:</span>
                {[58, 80].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWidthMm(w)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      widthMm === w
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {w}
                    {L.mm}
                  </button>
                ))}
              </div>
              <ReceiptTemplatePreview template={previewTemplate} widthMm={widthMm} />
            </div>

            {/* Parameters — scrolls with the page */}
            <div className="lg:col-span-5">
              <ReceiptTemplateEditor
                template={draft}
                registers={registers}
                strings={L}
                onPatch={patch}
                onLogoUpload={onLogoUpload}
                onLogoRemove={onLogoRemove}
                onExtraUpload={onExtraUpload}
                onExtraRemove={onExtraRemove}
              />
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!templateToDelete}
          onClose={() => !deleting && setTemplateToDelete(null)}
          onConfirm={confirmRemove}
          title={L.toasts.deleteTitle}
          message={L.toasts.confirmDelete.replace("{name}", templateToDelete?.name ?? "")}
          confirmLabel={L.toasts.deleteBtn}
          cancelLabel={L.toasts.cancel}
          variant="danger"
          isLoading={deleting}
          loadingLabel={L.toasts.deleting}
        />
      </div>
    </DndProvider>
  );
}
