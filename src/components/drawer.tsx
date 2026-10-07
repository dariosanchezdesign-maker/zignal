"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Right-side panel on desktop, bottom sheet on mobile. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/30" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92vh] animate-slide-up flex-col rounded-t-2xl bg-white shadow-pop sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[600px] sm:animate-slide-left sm:rounded-none">
        <div className="flex items-center justify-between gap-3 border-b border-ink-150 px-5 py-3.5">
          <div className="min-w-0 text-[13px] font-semibold">{title}</div>
          <button onClick={onClose} aria-label="Close" className="focus-ring rounded-full p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:p-6">{children}</div>
      </div>
    </div>
  );
}
