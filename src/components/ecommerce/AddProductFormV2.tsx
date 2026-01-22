"use client";
import React, { useState } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import { ChevronDownIcon } from "@/icons/index";
import Button from "../ui/button/Button";
import { useTranslations } from "@/hooks/useTranslations";

export default function AddProductFormV2() {
  const { t } = useTranslations();
  const [formData, setFormData] = useState({
    productName: "",
    priceIn: "",
    priceOut: "",
    quantity: 0,
    quantityType: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuantityChange = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      quantity: Math.max(0, prev.quantity + delta),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const quantityTypeOptions = [
    { value: "kg", label: t('addProductV2.quantityTypeKg') },
    { value: "piece", label: t('addProductV2.quantityTypePiece') },
    { value: "others", label: t('addProductV2.quantityTypeOthers') },
  ];

  const handleSubmit = (type: "draft" | "publish") => {
    console.log("Form submitted:", type, formData);
    // Handle form submission here
  };

  // Calculate profit
  const calculateProfit = (): string => {
    const priceOut = parseFloat(formData.priceOut.replace(/[$,]/g, "")) || 0;
    const priceIn = parseFloat(formData.priceIn.replace(/[$,]/g, "")) || 0;
    const profit = priceOut - priceIn;
    return `$${profit.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Product Information Section */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white">
            {t('addProductV2.productInformation')}
          </h2>
        </div>
        <div className="p-4 sm:p-6 dark:border-gray-800">
          <form>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="col-span-full">
                <Label htmlFor="productName">{t('addProductV2.productName')}</Label>
                <Input
                  id="productName"
                  name="productName"
                  type="text"
                  placeholder={t('addProductV2.productNamePlaceholder')}
                  value={formData.productName}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="priceIn">{t('addProductV2.priceIn')}</Label>
                <Input
                  id="priceIn"
                  name="priceIn"
                  type="text"
                  placeholder={t('addProductV2.pricePlaceholder')}
                  value={formData.priceIn}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="priceOut">{t('addProductV2.priceOut')}</Label>
                <Input
                  id="priceOut"
                  name="priceOut"
                  type="text"
                  placeholder={t('addProductV2.pricePlaceholder')}
                  value={formData.priceOut}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="profit" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  {t('addProductV2.profit')}
                </Label>
                <div className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  {formData.priceIn && formData.priceOut ? calculateProfit() : "$0"}
                </div>
              </div>

              <div>
                <Label htmlFor="quantity" className="mb-1">
                  {t('addProductV2.quantity')}
                </Label>
                <div className="flex h-11 divide-x divide-gray-300 overflow-hidden rounded-lg border border-gray-300 dark:divide-gray-800 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(-1)}
                    className="inline-flex h-11 w-11 items-center justify-center bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="24"
                      viewBox="0 0 25 24"
                      fill="none"
                    >
                      <path
                        d="M6.66699 12H18.6677"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <input
                      className="h-full w-full border-0 bg-white text-center text-sm text-gray-700 outline-none focus:ring-0 dark:bg-gray-900 dark:text-gray-400"
                      type="text"
                      value={formData.quantity}
                      readOnly
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(1)}
                    className="inline-flex h-11 w-11 items-center justify-center bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="24"
                      viewBox="0 0 25 24"
                      fill="none"
                    >
                      <path
                        d="M6.66699 12.0002H18.6677M12.6672 6V18.0007"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="quantityType">{t('addProductV2.quantityType')}</Label>
                <div className="relative">
                  <Select
                    options={quantityTypeOptions}
                    placeholder={t('addProductV2.quantityTypePlaceholder')}
                    onChange={handleSelectChange("quantityType")}
                    defaultValue={formData.quantityType}
                  />
                  <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                    <ChevronDownIcon />
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Product Image Section */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white">
            {t('addProductV2.productImage')} <span className="text-gray-500 dark:text-gray-400 font-normal">{t('addProductV2.optional')}</span>
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          <label
            htmlFor="product-image-v2"
            className="shadow-theme-xs group hover:border-brand-500 block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 transition dark:hover:border-brand-400 dark:border-gray-800"
          >
            <div className="flex justify-center p-10">
              <div className="flex max-w-[260px] flex-col items-center gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition dark:border-gray-800 dark:text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M20.0004 16V18.5C20.0004 19.3284 19.3288 20 18.5004 20H5.49951C4.67108 20 3.99951 19.3284 3.99951 18.5V16M12.0015 4L12.0015 16M7.37454 8.6246L11.9994 4.00269L16.6245 8.6246"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {t('addProductV2.clickToUpload')}
                  </span>{" "}
                  {t('addProductV2.dragAndDrop')}
                </p>
              </div>
            </div>
            <input
              id="product-image-v2"
              className="hidden"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          size="md"
          onClick={() => handleSubmit("draft")}
        >
          {t('addProductV2.draft')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => handleSubmit("publish")}
        >
          {t('addProductV2.publishProduct')}
        </Button>
      </div>
    </div>
  );
}
