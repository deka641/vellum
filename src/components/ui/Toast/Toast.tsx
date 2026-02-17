"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./Toast.module.css";

type ToastVariant = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const activeMessagesRef = useRef(new Set<string>());

  const addToast = useCallback((message: string, variant: ToastVariant = "success", action?: ToastAction) => {
    const key = `${variant}:${message}`;
    if (activeMessagesRef.current.has(key)) return;

    const id = Math.random().toString(36).slice(2);
    activeMessagesRef.current.add(key);
    setToasts((prev) => [...prev, { id, message, variant, action }]);
    setTimeout(() => {
      activeMessagesRef.current.delete(key);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, action ? 5000 : 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast) {
        activeMessagesRef.current.delete(`${toast.variant}:${toast.message}`);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const icons: Record<ToastVariant, ReactNode> = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    info: <Info size={16} />,
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className={styles.container} role="status" aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.95 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
              className={cn(styles.toast, styles[t.variant])}
            >
              <span className={styles.icon}>{icons[t.variant]}</span>
              <span className={styles.message}>{t.message}</span>
              {t.action && (
                <button
                  className={styles.action}
                  onClick={() => {
                    t.action!.onClick();
                    removeToast(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                className={styles.close}
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
