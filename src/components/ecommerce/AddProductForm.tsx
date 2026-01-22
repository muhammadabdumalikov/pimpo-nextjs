"use client";
import React, { useState } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import TextArea from "../form/input/TextArea";
import { ChevronDownIcon } from "@/icons/index";
import Button from "../ui/button/Button";

export default function AddProductForm() {
  const [formData, setFormData] = useState({
    productName: "",
    category: "",
    brand: "",
    color: "",
    weight: "",
    length: "",
    width: "",
    description: "",
    price: "",
    stockQuantity: 0,
    availabilityStatus: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const categories = [
    { value: "Laptop", label: "Laptop" },
    { value: "Phone", label: "Phone" },
    { value: "Watch", label: "Watch" },
    { value: "Electronics", label: "Electronics" },
    { value: "Accessories", label: "Accessories" },
  ];

  const brands = [
    { value: "1", label: "Apple" },
    { value: "2", label: "Samsung" },
    { value: "3", label: "LG" },
  ];

  const colors = [
    { value: "1", label: "Silver" },
    { value: "2", label: "Black" },
    { value: "3", label: "White" },
    { value: "4", label: "Gray" },
  ];

  const availabilityOptions = [
    { value: "1", label: "In Stock" },
    { value: "2", label: "Out of Stock" },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTextAreaChange = (value: string) => {
    setFormData((prev) => ({ ...prev, description: value }));
  };

  const handleStockChange = (delta: number) => {
    setFormData((prev) => ({
      ...prev,
      stockQuantity: Math.max(0, prev.stockQuantity + delta),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (type: "draft" | "publish") => {
    console.log("Form submitted:", type, formData);
    // Handle form submission here
  };

  return (
    <div className="space-y-6">
      {/* Products Description Section */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white">
            Products Description
          </h2>
        </div>
        <div className="p-4 sm:p-6 dark:border-gray-800">
        <form>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                name="productName"
                type="text"
                placeholder="Enter product name"
                value={formData.productName}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <div className="relative">
                <Select
                  options={categories}
                  placeholder="Select a category"
                  onChange={handleSelectChange("category")}
                  defaultValue={formData.category}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="brand">Brand</Label>
              <div className="relative">
                <Select
                  options={brands}
                  placeholder="Select brand"
                  onChange={handleSelectChange("brand")}
                  defaultValue={formData.brand}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <div className="relative">
                <Select
                  options={colors}
                  placeholder="Select color"
                  onChange={handleSelectChange("color")}
                  defaultValue={formData.color}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>

            <div className="col-span-full">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <Label htmlFor="weight">Weight(KG)</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    placeholder="15"
                    value={formData.weight}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="length">Length(CM)</Label>
                  <Input
                    id="length"
                    name="length"
                    type="number"
                    placeholder="120"
                    value={formData.length}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label htmlFor="width">Width(CM)</Label>
                  <Input
                    id="width"
                    name="width"
                    type="number"
                    placeholder="23"
                    value={formData.width}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="col-span-full">
              <Label htmlFor="description">Description</Label>
              <TextArea
                placeholder="Receipt Info (optional)"
                rows={6}
                value={formData.description}
                onChange={handleTextAreaChange}
              />
            </div>
          </div>
        </form>
        </div>
      </div>

      {/* Pricing & Availability Section */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white">
            Pricing & Availability
          </h2>
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                placeholder="Enter price"
                value={formData.price}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <Label htmlFor="stockQuantity" className="mb-1">
                Stock Quantity
              </Label>
              <div className="flex h-11 divide-x divide-gray-300 overflow-hidden rounded-lg border border-gray-300 dark:divide-gray-800 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => handleStockChange(-1)}
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
                    value={formData.stockQuantity}
                    readOnly
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleStockChange(1)}
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
              <Label htmlFor="availabilityStatus">Availability Status</Label>
              <div className="relative">
                <Select
                  options={availabilityOptions}
                  placeholder="Select a Availability"
                  onChange={handleSelectChange("availabilityStatus")}
                  defaultValue={formData.availabilityStatus}
                />
                <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Images Section */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-800 dark:text-white">
            Products Images
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
                  Click to upload
                </span>{" "}
                or drag and drop SVG, PNG, JPG or GIF (MAX. 800x400px)
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
          onClick={() => handleSubmit("draft")}
        >
          Draft
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => handleSubmit("publish")}
        >
          Publish Product
        </Button>
      </div>
    </div>
  );
}
