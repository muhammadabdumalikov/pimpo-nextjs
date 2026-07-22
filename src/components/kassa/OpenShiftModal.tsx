"use client";
import React, { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import SelectField from "@/components/form/SelectField";
import { useTranslations } from "@/hooks/useTranslations";
import { digitsOnly, formatNumberInput } from "@/lib/number";
import { openShift, type CashRegister, type Shift } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  registers: CashRegister[];
  /** Register ids that already have an open shift (disabled in the picker). */
  openRegisterIds: string[];
  onOpened: (shift: Shift) => void;
  onError: (message: string) => void;
}

export default function OpenShiftModal({
  isOpen,
  onClose,
  registers,
  openRegisterIds,
  onOpened,
  onError,
}: Props) {
  const { t } = useTranslations();
  const [registerId, setRegisterId] = useState("");
  const [float, setFloat] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Default to the first register that has no open shift.
  useEffect(() => {
    if (!isOpen) return;
    const firstFree = registers.find((r) => !openRegisterIds.includes(r.id));
    setRegisterId(firstFree?.id ?? registers[0]?.id ?? "");
    setFloat("");
  }, [isOpen, registers, openRegisterIds]);

  const handleOpen = async () => {
    if (!registerId) return;
    setSubmitting(true);
    try {
      const shift = await openShift({
        registerId,
        openingFloat: Number(digitsOnly(float) || "0"),
      });
      onOpened(shift);
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("kassa.openShift")}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t("kassa.cancel")}
          </Button>
          <Button onClick={handleOpen} disabled={submitting || !registerId}>
            {t("kassa.openShift")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>{t("kassa.register")}</Label>
          <SelectField
            value={registerId}
            onChange={setRegisterId}
            placeholder={t("kassa.selectRegister")}
            options={registers.map((r) => ({
              value: r.id,
              label: openRegisterIds.includes(r.id)
                ? `${r.name} — ${t("kassa.openStatus")}`
                : r.name,
              disabled: openRegisterIds.includes(r.id),
            }))}
          />
        </div>
        <div>
          <Label>{t("kassa.openingFloat")}</Label>
          {/* Enter submits — cashiers type the float and hit Enter, no mouse */}
          <Input
            inputMode="numeric"
            value={formatNumberInput(float)}
            onChange={(e) => setFloat(digitsOnly(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !submitting && registerId) {
                e.preventDefault();
                handleOpen();
              }
            }}
            placeholder="0"
          />
        </div>
      </div>
    </Drawer>
  );
}
