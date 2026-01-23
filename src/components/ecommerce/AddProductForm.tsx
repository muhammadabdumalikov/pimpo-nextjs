"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import { ChevronDownIcon } from "@/icons/index";
import Button from "../ui/button/Button";
import { useTranslations } from "@/hooks/useTranslations";
import { createProduct, updateProduct, generateProductCode, getProduct, type Product } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useSubscription } from "@/context/SubscriptionContext";

interface AddProductFormProps {
  productId?: string;
}

export default function AddProductForm({ productId }: AddProductFormProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { getLimit, isLimitReached } = useSubscription();
  const isEditMode = !!productId;
  const [formData, setFormData] = useState({
    productName: "",
    priceIn: "",
    priceOut: "",
    quantity: 0,
    quantityType: "",
    code: "",
    barcode: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  // Load product data if in edit mode
  useEffect(() => {
    if (isEditMode && productId) {
      loadProductData();
    }
  }, [productId, isEditMode]);

  const loadProductData = async () => {
    try {
      setIsLoadingProduct(true);
      const product = await getProduct(productId!);
      setFormData({
        productName: product.name,
        priceIn: product.priceIn,
        priceOut: product.priceOut,
        quantity: product.quantity,
        quantityType: product.quantityType || "",
        code: product.code || "",
        barcode: product.barcode || "",
      });
    } catch (error: any) {
      console.error('Failed to load product:', error);
      showToast('error', error.message || 'Failed to load product', 'Error');
      router.push('/products');
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Limit barcode to 14 characters
    if (name === 'barcode' && value.length > 14) {
      return;
    }
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

  const handleGenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const code = await generateProductCode();
      setFormData((prev) => ({ ...prev, code }));
    } catch (error: any) {
      console.error('Failed to generate product code:', error);
      showToast('error', error.message || 'Failed to generate product code', 'Error');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const quantityTypeOptions = [
    { value: "kg", label: t('addProduct.quantityTypeKg') },
    { value: "piece", label: t('addProduct.quantityTypePiece') },
    { value: "others", label: t('addProduct.quantityTypeOthers') },
  ];

  // Helper function to parse price (remove $ and commas)
  const parsePrice = (price: string): string => {
    return price.replace(/[$,]/g, "").trim();
  };

  const handleSubmit = async (type: "draft" | "publish") => {
    // Validate form
    if (!formData.productName.trim()) {
      showToast('error', t('addProduct.errors.productNameRequired') || 'Product name is required', 'Error');
      return;
    }

    if (!formData.priceIn || parseFloat(parsePrice(formData.priceIn)) <= 0) {
      showToast('error', t('addProduct.errors.priceInRequired') || 'Price in is required and must be greater than 0', 'Error');
      return;
    }

    if (!formData.priceOut || parseFloat(parsePrice(formData.priceOut)) <= 0) {
      showToast('error', t('addProduct.errors.priceOutRequired') || 'Price out is required and must be greater than 0', 'Error');
      return;
    }

    // Check product limit
    const productLimit = getLimit('products');
    if (productLimit !== null) {
      // Note: We'd need to get current count, but for now we'll let the backend handle it
      // The backend will enforce limits
    }

    try {
      setIsSubmitting(true);

      const priceIn = parsePrice(formData.priceIn);
      const priceOut = parsePrice(formData.priceOut);

      // For now, we'll skip image upload (can be added later with file upload API)
      const productData = {
        name: formData.productName.trim(),
        priceIn: priceIn,
        priceOut: priceOut,
        quantity: formData.quantity,
        quantityType: formData.quantityType || undefined,
        code: formData.code.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        image: undefined, // TODO: Add image upload functionality
      };

      if (isEditMode && productId) {
        await updateProduct(productId, productData);
        showToast('success', t('addProduct.updateSuccess') || 'Product updated successfully!', 'Success');
      } else {
        await createProduct(productData);
        showToast('success', t('addProduct.success') || 'Product created successfully!', 'Success');
      }
      
      // Redirect to products list
      router.push('/products');
    } catch (error: any) {
      console.error('Failed to create product:', error);
      showToast('error', error.message || t('addProduct.errors.createFailed') || 'Failed to create product', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate profit
  const calculateProfit = (): string => {
    const priceOut = parseFloat(formData.priceOut.replace(/[$,]/g, "")) || 0;
    const priceIn = parseFloat(formData.priceIn.replace(/[$,]/g, "")) || 0;
    const profit = priceOut - priceIn;
    return `$${profit.toLocaleString()}`;
  };

  if (isLoadingProduct) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('addProduct.loading') || 'Loading product...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Information Section */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white">
            {isEditMode ? t('addProduct.editProductInformation') || 'Edit Product Information' : t('addProduct.productInformation')}
          </h2>
        </div>
        <div className="p-4 sm:p-6 dark:border-gray-800">
          <form>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="col-span-full">
                <Label htmlFor="productName">{t('addProduct.productName')}</Label>
                <Input
                  id="productName"
                  name="productName"
                  type="text"
                  placeholder={t('addProduct.productNamePlaceholder')}
                  value={formData.productName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="code">{t('addProduct.code') || 'Product Code'}</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    placeholder={t('addProduct.codePlaceholder') || 'Enter product code (optional)'}
                    value={formData.code}
                    onChange={handleInputChange}
                    maxLength={16}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode}
                    className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                    title={t('addProduct.generateCode') || 'Generate code'}
                  >
                    {isGeneratingCode ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="barcode">{t('addProduct.barcode') || 'Barcode'}</Label>
                <Input
                  id="barcode"
                  name="barcode"
                  type="number"
                  placeholder={t('addProduct.barcodePlaceholder') || 'Enter barcode (optional)'}
                  value={formData.barcode}
                  onChange={handleInputChange}
                  maxLength={14}
                />
              </div>

              <div>
                <Label htmlFor="priceIn">{t('addProduct.priceIn')}</Label>
                <Input
                  id="priceIn"
                  name="priceIn"
                  type="text"
                  placeholder={t('addProduct.pricePlaceholder')}
                  value={formData.priceIn}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="priceOut">{t('addProduct.priceOut')}</Label>
                <Input
                  id="priceOut"
                  name="priceOut"
                  type="text"
                  placeholder={t('addProduct.pricePlaceholder')}
                  value={formData.priceOut}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="profit" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  {t('addProduct.profit')}
                </Label>
                <div className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  {formData.priceIn && formData.priceOut ? calculateProfit() : "$0"}
                </div>
              </div>

              <div>
                <Label htmlFor="quantity" className="mb-1">
                  {t('addProduct.quantity')}
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
                <Label htmlFor="quantityType">{t('addProduct.quantityType')}</Label>
                <div className="relative">
                  <Select
                    options={quantityTypeOptions}
                    placeholder={t('addProduct.quantityTypePlaceholder')}
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
            {t('addProduct.productImage')} <span className="text-gray-500 dark:text-gray-400 font-normal">{t('addProduct.optional')}</span>
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          <label
            htmlFor="product-image"
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
                    {t('addProduct.clickToUpload')}
                  </span>{" "}
                  {t('addProduct.dragAndDrop')}
                </p>
              </div>
            </div>
            <input
              id="product-image"
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
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          {t('addProduct.cancel') || 'Cancel'}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => handleSubmit("publish")}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
              {isEditMode ? (t('addProduct.updating') || 'Updating...') : (t('addProduct.creating') || 'Creating...')}
            </span>
          ) : (
            isEditMode ? (t('addProduct.updateProduct') || 'Update Product') : t('addProduct.publishProduct')
          )}
        </Button>
      </div>
    </div>
  );
}
