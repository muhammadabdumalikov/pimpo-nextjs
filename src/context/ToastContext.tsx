'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  title?: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (variant: ToastVariant, message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((variant: ToastVariant, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, variant, message, title };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({
  toasts,
  removeToast,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100000] flex flex-col items-end gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const variantClasses = {
    success: { iconBg: 'bg-success-500' },
    error: { iconBg: 'bg-error-500' },
    warning: { iconBg: 'bg-warning-500' },
    info: { iconBg: 'bg-brand-500' },
  };

  const icons = {
    success: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.3334 4L6.00002 11.3333L2.66669 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    error: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 6V8M8 10H8.00667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33334 11.6819 1.33334 8C1.33334 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    warning: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 6V8M8 10H8.00667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33334 11.6819 1.33334 8C1.33334 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    info: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 6V8M8 10H8.00667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33334 11.6819 1.33334 8C1.33334 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  const variant = variantClasses[toast.variant];

  // Errors and warnings carry a message the user needs to read, so show the text
  // beside the icon. Success/info stay as compact, icon-only confirmation badges.
  const showText = toast.variant === 'error' || toast.variant === 'warning';

  if (!showText) {
    // Icon-only toast: a compact circular badge, click to dismiss.
    return (
      <button
        type="button"
        onClick={onClose}
        aria-label={toast.title || toast.message}
        className={`animate-toast-in pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-white shadow-theme-lg transition active:scale-95 ${variant.iconBg}`}
      >
        {icons[toast.variant]}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={toast.title || toast.message}
      className="animate-toast-in pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl bg-white px-4 py-3 text-left shadow-theme-lg transition active:scale-[0.99] dark:bg-gray-800"
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${variant.iconBg}`}
      >
        {icons[toast.variant]}
      </span>
      <span className="min-w-0">
        {toast.title && (
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">
            {toast.title}
          </span>
        )}
        <span className="block break-words text-sm text-gray-600 dark:text-gray-300">
          {toast.message}
        </span>
      </span>
    </button>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
