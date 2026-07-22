"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import ImageUpload from "@/components/form/ImageUpload";
import { useTranslations } from "@/hooks/useTranslations";
import { createCategory, type Category } from "@/lib/api";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0400-\u04ff-]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `cat-${Date.now()}`;
}

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (category: Category) => void;
  existingIds?: string[];
}

export default function AddCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  existingIds = [],
}: AddCategoryModalProps) {
  const { t } = useTranslations();
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setName("");
    setImage(null);
    setError("");
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        document.getElementById("category-name")?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("categories.errors.nameRequired") || "Category name is required");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      let id = slugify(trimmed);
      let counter = 1;
      while (existingIds.includes(id)) {
        id = `${slugify(trimmed)}-${counter}`;
        counter += 1;
      }
      const category = await createCategory({ id, name: trimmed, image: image ?? undefined });
      onSuccess(category);
      resetForm();
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to create category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md w-full mx-4">
      <div className="p-6 sm:p-8">
        <h2 className="pr-10 text-xl font-semibold text-gray-800 dark:text-white/90 mb-6">
          {t("categories.addCategoryTitle")}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <ImageUpload
              value={image}
              onChange={setImage}
              prefix="categories"
              label={t("categories.imageLabel")}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="category-name">{t("categories.nameLabel")}</Label>
            <Input
              id="category-name"
              type="text"
              placeholder={t("categories.namePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              error={!!error}
              required
            />
            {error && (
              <p className="mt-1.5 text-sm text-error-500 dark:text-error-400">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("categories.cancel")}
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
              {isSubmitting
                ? (t("categories.saving") || "Saving...")
                : t("categories.save")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
