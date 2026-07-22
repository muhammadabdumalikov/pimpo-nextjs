"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { digitsOnly, formatNumberInput } from "@/lib/number";
import {
  addCashMovement,
  type CashCategory,
  type CashMovement,
} from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  categories: CashCategory[];
  onAdded: (movement: CashMovement) => void;
  onError: (message: string) => void;
}

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2.5 text-theme-sm font-medium transition ${
        active
          ? "bg-brand-500 text-white shadow-theme-xs"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

export default function CashMovementModal({
  isOpen,
  onClose,
  shiftId,
  categories,
  onAdded,
  onError,
}: Props) {
  const { t } = useTranslations();
  const [type, setType] = useState<"in" | "out">("out");
  const [isCash, setIsCash] = useState(true);
  const [currency, setCurrency] = useState<"UZS" | "USD">("UZS");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("out");
    setIsCash(true);
    setCurrency("UZS");
    setAmount("");
    setCategoryId("");
    setReason("");
  };

  const handleAdd = async () => {
    const amt = Number(digitsOnly(amount) || "0");
    if (amt <= 0) return;
    setSubmitting(true);
    try {
      const movement = await addCashMovement(shiftId, {
        type,
        isCash,
        currency,
        amount: amt,
        categoryId: categoryId || undefined,
        reason: reason.trim() || undefined,
      });
      onAdded(movement);
      reset();
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const relevant = categories.filter(
    (c) => c.direction === "both" || c.direction === type,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md w-full mx-4 p-6 sm:p-8"
    >
      <h2 className="mb-5 text-xl font-semibold text-gray-800 dark:text-white/90">
        {t("kassa.addMovement")}
      </h2>

      {/* Real form so Enter in the amount/reason fields submits — cash in/out
          is a high-frequency flow that shouldn't require the mouse. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!submitting) handleAdd();
        }}
      >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Segment active={type === "in"} onClick={() => setType("in")}>
            {t("kassa.cashIn")}
          </Segment>
          <Segment active={type === "out"} onClick={() => setType("out")}>
            {t("kassa.cashOut")}
          </Segment>
        </div>

        <div className="flex gap-2">
          <Segment active={isCash} onClick={() => setIsCash(true)}>
            {t("kassa.cash")}
          </Segment>
          <Segment active={!isCash} onClick={() => setIsCash(false)}>
            {t("kassa.cashless")}
          </Segment>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("kassa.amount")}</Label>
            <Input
              inputMode="numeric"
              value={formatNumberInput(amount)}
              onChange={(e) => setAmount(digitsOnly(e.target.value))}
              placeholder="0"
            />
          </div>
          <div>
            <Label>{t("kassa.currency")}</Label>
            <SelectField
              value={currency}
              onChange={(v) => setCurrency(v as "UZS" | "USD")}
              options={[
                { value: "UZS", label: "UZS" },
                { value: "USD", label: "USD" },
              ]}
            />
          </div>
        </div>

        <div>
          <Label>{t("kassa.category")}</Label>
          <SelectField
            value={categoryId}
            onChange={setCategoryId}
            placeholder="—"
            options={[
              { value: "", label: "—" },
              ...relevant.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div>
          <Label>{t("kassa.reason")}</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          {t("kassa.cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {t("kassa.add")}
        </Button>
      </div>
      </form>
    </Modal>
  );
}
