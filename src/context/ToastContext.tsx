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
    <div className="fixed top-20 right-4 z-[100000] flex flex-col gap-3 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const variantClasses = {
    success: {
      border: 'border-l-success-500',
      iconBg: 'bg-success-500',
      iconText: 'text-white',
    },
    error: {
      border: 'border-l-warning-500',
      iconBg: 'bg-warning-500',
      iconText: 'text-white',
    },
    warning: {
      border: 'border-l-warning-500',
      iconBg: 'bg-warning-500',
      iconText: 'text-white',
    },
    info: {
      border: 'border-l-blue-light-500',
      iconBg: 'bg-blue-light-500',
      iconText: 'text-white',
    },
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

  return (
    <div
      className={`rounded-lg ${variant.border} border-l-4 bg-white dark:bg-gray-900 shadow-lg p-4 min-w-[320px] max-w-md transition-all duration-300 ease-in-out`}
    >
      <div className="flex items-start gap-4">
        {/* Left border indicator is handled by border-l-4 */}
        
        {/* Circular icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${variant.iconBg} ${variant.iconText} flex items-center justify-center`}>
          {icons[toast.variant]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">
              {toast.title}
            </h4>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {toast.message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close notification"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
