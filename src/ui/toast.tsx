"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { cn } from "./cn";

type ToastTone = "info" | "success" | "danger";
type ToastItem = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

const tones: Record<ToastTone, string> = {
  info: "border-info bg-info-soft text-info",
  success: "border-success bg-success-soft text-success",
  danger: "border-danger bg-danger-soft text-danger",
};

const DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }]);
    setTimeout(() => setItems((current) => current.filter((t) => t.id !== id)), DURATION_MS);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* role=status: lectores de pantalla anuncian el mensaje sin mover el foco. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-ui border px-4 py-3 text-sm font-medium shadow-md",
              tones[t.tone],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return show;
}
