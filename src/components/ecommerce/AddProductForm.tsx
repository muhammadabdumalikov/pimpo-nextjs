"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import ImageUpload from "../form/ImageUpload";
import Button from "../ui/button/Button";
// Camera barcode scanning is parked for now — physical (keyboard-wedge) scanners
// only. Keep the import so it can be re-enabled later.
// import CameraScanner from "../checkout/CameraScanner";
import { useTranslations } from "@/hooks/useTranslations";
import { createProduct, updateProduct, generateProductCode, getProduct, getCategories, getProductCount, lookupBarcode, createCategory, type Product } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { formatNumberInput, digitsOnly } from "@/lib/number";

interface AddProductFormProps {
  productId?: string;
}

// Category ids are client-generated slugs (mirrors AddCategoryModal). Cyrillic is
// kept so classifier group names produce readable ids.
function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9Ѐ-ӿ-]/gi, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `cat-${Date.now()}`
  );
}

// Classifier group names arrive ALL-CAPS (e.g. "ҲАЙВОНЛАРДАН..."); show them in
// sentence case so a suggested category reads naturally.
function prettifyCategoryName(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const base = s === s.toUpperCase() ? s.toLowerCase() : s;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export default function AddProductForm({ productId }: AddProductFormProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { getLimit, isLimitReached, currentTier } = useSubscription();
  const isEditMode = !!productId;
  // Product images are a Business (pro) plan feature.
  const canUseImages = currentTier === "pro";
  const [formData, setFormData] = useState({
    productName: "",
    categoryId: "",
    priceIn: "",
    priceOut: "",
    quantity: 0,
    quantityType: "",
    code: "",
    barcode: "",
  });

  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  // const [scannerOpen, setScannerOpen] = useState(false); // camera scan (parked)
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  // Remember the last barcode we looked up so re-blurring the field (e.g. after a
  // scanner's Enter) doesn't fire the same request again.
  const lastLookedUpBarcode = useRef<string>("");
  // A category the barcode lookup found that the business doesn't have yet — we
  // offer to create it on the fly. Null when there's nothing to suggest.
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [productCount, setProductCount] = useState<number | null>(null);
  // Which required fields failed validation on the last submit — drives the red
  // error style on the inputs. Cleared per-field as the user fixes each one.
  const [errors, setErrors] = useState<{
    productName?: boolean;
    priceIn?: boolean;
    priceOut?: boolean;
  }>({});
  // Refs to the required inputs so we can focus the first invalid one on submit.
  const productNameRef = useRef<HTMLInputElement>(null);
  const priceInRef = useRef<HTMLInputElement>(null);
  const priceOutRef = useRef<HTMLInputElement>(null);

  // Plan product limit — reached only when creating (edits never add a product).
  const productLimit = getLimit('products');
  const limitReached =
    !isEditMode &&
    productLimit !== null &&
    productCount !== null &&
    isLimitReached('products', productCount);

  useEffect(() => {
    getCategories()
      .then((list) => setCategories(list.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => setCategories([]));
  }, []);

  // Fetch the current product count so we can block before submit (create only).
  useEffect(() => {
    if (isEditMode) return;
    getProductCount()
      .then(setProductCount)
      .catch(() => setProductCount(null));
  }, [isEditMode]);

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
        categoryId: product.categoryId || "",
        priceIn: product.priceIn,
        priceOut: product.priceOut,
        quantity: product.quantity,
        quantityType: product.quantityType || "",
        code: product.code || "",
        barcode: product.barcode || "",
      });
      setImage(product.image ?? null);
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
    if (name === 'productName' && value.trim()) {
      setErrors((prev) => ({ ...prev, productName: false }));
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuantityChange = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      quantity: Math.max(0, prev.quantity + delta),
    }));
  };

  // Price fields: digits only, stored raw and shown grouped ("65 000").
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const digits = digitsOnly(value);
    if ((name === 'priceIn' || name === 'priceOut') && parseFloat(digits) > 0) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
    setFormData((prev) => ({ ...prev, [name]: digits }));
  };

  // Quantity typed directly (still clamped at 0; +/- buttons keep working).
  const handleQuantityInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = digitsOnly(e.target.value);
    setFormData((prev) => ({ ...prev, quantity: digits === "" ? 0 : Number(digits) }));
  };

  const handleSelectChange = (name: string) => (value: string) => {
    // Picking a category by hand dismisses any pending "create this" suggestion.
    if (name === "categoryId") setSuggestedCategory(null);
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

  // A handheld (keyboard-wedge) scanner types the barcode into the focused field
  // and ends with Enter. Swallow that Enter so it never submits the form — the
  // scanned value just lands in the field.
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  // When a barcode is entered/scanned on a new product, look it up against our own
  // catalog and the shared community catalog to auto-fill name/image. Convenience
  // only: it never overwrites values the user already typed, and failures are silent.
  const handleBarcodeLookup = async (rawBarcode?: string) => {
    const barcode = (rawBarcode ?? formData.barcode).trim();
    if (isEditMode || !barcode || barcode === lastLookedUpBarcode.current) return;
    lastLookedUpBarcode.current = barcode;

    try {
      setIsLookingUpBarcode(true);
      const result = await lookupBarcode(barcode);
      if (!result.found) return;

      if (result.existsInBusiness) {
        showToast(
          'warning',
          t('addProduct.barcodeAlreadyExists') ||
            'You already have a product with this barcode',
        );
        return;
      }

      // Community match — fill only the fields the user has left empty.
      if (result.name) {
        setFormData((prev) => ({
          ...prev,
          productName: prev.productName || result.name || "",
        }));
      }
      if (canUseImages && result.image) {
        setImage((prev) => prev ?? result.image);
      }

      // Category from the catalog: select it if we already have it (by name,
      // case-insensitive), otherwise offer to create it on the fly.
      if (result.categoryName) {
        const pretty = prettifyCategoryName(result.categoryName);
        const existing = categories.find(
          (c) => c.name.toLowerCase() === pretty.toLowerCase(),
        );
        if (existing) {
          setSuggestedCategory(null);
          setFormData((prev) => ({
            ...prev,
            categoryId: prev.categoryId || existing.id,
          }));
        } else {
          setSuggestedCategory(pretty);
        }
      }

      showToast(
        'success',
        t('addProduct.barcodeAutoFilled') || 'Product info auto-filled from catalog',
      );
    } catch {
      // Lookup is best-effort; ignore errors so the user can keep typing.
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  // Create the category the barcode lookup suggested (one the business lacks),
  // then add it to the list and select it for this product.
  const handleCreateSuggestedCategory = async () => {
    if (!suggestedCategory || isCreatingCategory) return;
    const name = suggestedCategory.trim();
    if (!name) return;

    try {
      setIsCreatingCategory(true);
      const existingIds = categories.map((c) => c.id);
      let id = slugify(name);
      let counter = 1;
      while (existingIds.includes(id)) {
        id = `${slugify(name)}-${counter}`;
        counter += 1;
      }

      const category = await createCategory({ id, name });
      setCategories((prev) => [...prev, { id: category.id, name: category.name }]);
      setFormData((prev) => ({ ...prev, categoryId: category.id }));
      setSuggestedCategory(null);
      showToast(
        'success',
        t('addProduct.categoryCreated') || 'Category created and selected',
      );
    } catch (error: any) {
      showToast('error', error?.message || 'Failed to create category', 'Error');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Auto-look up as the barcode is typed or scanned, once it reaches a plausible
  // EAN/UPC length (EAN-8, UPC-A, EAN-13, or 14-digit GTIN). Debounced so it fires
  // when the user pauses, not on every keystroke. The blur handler still covers
  // odd-length/manual cases; lastLookedUpBarcode dedupes the two paths.
  useEffect(() => {
    if (isEditMode) return;
    const barcode = formData.barcode.trim();
    if (![8, 12, 13, 14].includes(barcode.length)) return;
    const timer = setTimeout(() => {
      handleBarcodeLookup(barcode);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.barcode, isEditMode]);

  // Camera scan (parked — physical scanners only for now). Fills the barcode
  // field from a camera-decoded value; re-enable with the CameraScanner import.
  // const handleBarcodeDetected = (raw: string) => {
  //   const value = raw.replace(/\D/g, "").slice(0, 14);
  //   if (!value) return;
  //   setFormData((prev) => ({ ...prev, barcode: value }));
  //   setScannerOpen(false);
  //   showToast("success", `${t('addProduct.barcodeScanned') || 'Barcode scanned'}: ${value}`);
  // };

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
    // Validate all required fields at once so every offending input gets the red
    // error style, not just the first one.
    const nextErrors = {
      productName: !formData.productName.trim(),
      priceIn: !formData.priceIn || parseFloat(parsePrice(formData.priceIn)) <= 0,
      priceOut: !formData.priceOut || parseFloat(parsePrice(formData.priceOut)) <= 0,
    };
    setErrors(nextErrors);

    if (nextErrors.productName) {
      productNameRef.current?.focus();
      showToast('error', t('addProduct.errors.productNameRequired') || 'Product name is required', 'Error');
      return;
    }
    if (nextErrors.priceIn) {
      priceInRef.current?.focus();
      showToast('error', t('addProduct.errors.priceInRequired') || 'Price in is required and must be greater than 0', 'Error');
      return;
    }
    if (nextErrors.priceOut) {
      priceOutRef.current?.focus();
      showToast('error', t('addProduct.errors.priceOutRequired') || 'Price out is required and must be greater than 0', 'Error');
      return;
    }

    // Block when the plan's product limit is already reached (backend also enforces).
    if (limitReached) {
      showToast(
        'error',
        t('products.limitReached').replace('{limit}', String(productLimit)),
        'Error',
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const priceIn = parsePrice(formData.priceIn);
      const priceOut = parsePrice(formData.priceOut);

      const productData = {
        name: formData.productName.trim(),
        categoryId: formData.categoryId.trim() || undefined,
        priceIn: priceIn,
        priceOut: priceOut,
        quantity: formData.quantity,
        quantityType: formData.quantityType || undefined,
        code: formData.code.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        image: image ?? undefined,
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
    return profit.toLocaleString();
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
      {limitReached && (
        <div className="flex flex-col gap-2 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t('products.limitReached').replace('{limit}', String(productLimit))}
          </span>
          <Link
            href="/upgrade-plan"
            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            {t('products.upgradeCta')}
          </Link>
        </div>
      )}
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
                <Label htmlFor="productName" required>{t('addProduct.productName')}</Label>
                <Input
                  ref={productNameRef}
                  id="productName"
                  name="productName"
                  type="text"
                  placeholder={t('addProduct.productNamePlaceholder')}
                  value={formData.productName}
                  onChange={handleInputChange}
                  required
                  error={errors.productName}
                  hint={errors.productName ? (t('addProduct.errors.productNameRequired') || 'Product name is required') : undefined}
                />
              </div>

              <div className="col-span-full">
                <Label htmlFor="category">{t('addProduct.category')}</Label>
                <Select
                  key={isEditMode ? (isLoadingProduct ? "loading" : productId) : "new"}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder={t('addProduct.categoryPlaceholder')}
                  onChange={handleSelectChange("categoryId")}
                  defaultValue={formData.categoryId}
                  searchable
                  searchPlaceholder={t('addProduct.categorySearch') || 'Search category...'}
                />
                {suggestedCategory && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        {t('addProduct.categorySuggestion') || 'This product belongs to a category you don’t have yet:'}
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">
                        {suggestedCategory}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateSuggestedCategory}
                      disabled={isCreatingCategory}
                      className="ml-auto rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreatingCategory
                        ? t('addProduct.categoryCreating') || 'Creating...'
                        : t('addProduct.categoryCreateSelect') || 'Create & select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuggestedCategory(null)}
                      className="rounded-lg px-2 py-1.5 text-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {t('common.dismiss') || 'Dismiss'}
                    </button>
                  </div>
                )}
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
                {/* Physical (handheld) scanner: focus the field and scan — the
                    scanner types the code and the Enter terminator is swallowed. */}
                <Input
                  id="barcode"
                  name="barcode"
                  type="number"
                  placeholder={t('addProduct.barcodePlaceholder') || 'Enter barcode (optional)'}
                  value={formData.barcode}
                  onChange={handleInputChange}
                  onKeyDown={handleBarcodeKeyDown}
                  onBlur={() => handleBarcodeLookup()}
                  maxLength={14}
                />
                {isLookingUpBarcode && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {t('addProduct.barcodeLookingUp') || 'Looking up barcode…'}
                  </p>
                )}
                {/* Camera barcode scan — parked, physical scanners only for now.
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScannerOpen((o) => !o)}
                    className={`inline-flex items-center justify-center h-11 w-11 rounded-lg border shadow-theme-xs transition disabled:opacity-50 ${
                      scannerOpen
                        ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-600"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                    }`}
                    title={t('addProduct.scanBarcode') || 'Scan barcode'}
                    aria-label={t('addProduct.scanBarcode') || 'Scan barcode'}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 0 1 2-2h1l1.5-2h9L18 7h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                      <circle cx="12" cy="13" r="3.5" />
                    </svg>
                  </button>
                </div>
                {scannerOpen && (
                  <div className="mt-3">
                    <CameraScanner
                      isOpen={scannerOpen}
                      onClose={() => setScannerOpen(false)}
                      onDetected={handleBarcodeDetected}
                    />
                  </div>
                )}
                */}
              </div>

              <div>
                <Label htmlFor="priceIn" required>{t('addProduct.priceIn')}</Label>
                <Input
                  ref={priceInRef}
                  id="priceIn"
                  name="priceIn"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatNumberInput(formData.priceIn)}
                  onChange={handlePriceChange}
                  required
                  error={errors.priceIn}
                  hint={errors.priceIn ? (t('addProduct.errors.priceInRequired') || 'Price in is required and must be greater than 0') : undefined}
                />
              </div>

              <div>
                <Label htmlFor="priceOut" required>{t('addProduct.priceOut')}</Label>
                <Input
                  ref={priceOutRef}
                  id="priceOut"
                  name="priceOut"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatNumberInput(formData.priceOut)}
                  onChange={handlePriceChange}
                  required
                  error={errors.priceOut}
                  hint={errors.priceOut ? (t('addProduct.errors.priceOutRequired') || 'Price out is required and must be greater than 0') : undefined}
                />
              </div>

              <div>
                <Label htmlFor="profit" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  {t('addProduct.profit')}
                </Label>
                <div className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  {formData.priceIn && formData.priceOut ? calculateProfit() : "0"}
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
                      inputMode="numeric"
                      value={formData.quantity}
                      onChange={handleQuantityInput}
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
                <Select
                  options={quantityTypeOptions}
                  placeholder={t('addProduct.quantityTypePlaceholder')}
                  onChange={handleSelectChange("quantityType")}
                  defaultValue={formData.quantityType}
                />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Product Image Section (Business plan only) */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white">
            {t('addProduct.productImage')}{' '}
            {canUseImages ? (
              <span className="font-normal text-gray-500 dark:text-gray-400">{t('addProduct.optional')}</span>
            ) : (
              <span className="ml-1 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {t('addProduct.businessBadge')}
              </span>
            )}
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          {canUseImages ? (
            <ImageUpload
              value={image}
              onChange={setImage}
              prefix="products"
              label={t('addProduct.productImage')}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-white/[0.02]">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
                  <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
                </svg>
              </div>
              <p className="max-w-sm text-sm text-gray-600 dark:text-gray-300">
                {t('addProduct.imageProOnly')}
              </p>
              <Link
                href="/upgrade-plan"
                className="inline-flex items-center rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                {t('products.upgradeCta')}
              </Link>
            </div>
          )}
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
          disabled={isSubmitting || limitReached}
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
