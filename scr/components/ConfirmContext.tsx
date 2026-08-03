import React, { createContext, useContext, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, AlertTriangle, Trash2, CheckCircle2, AlertCircle, X, Info } from "lucide-react";

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info" | "success";
}

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  showToast: (message: string, type?: "success" | "error" | "warning" | "info") => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions | string) => {
    const parsedOptions = typeof opts === "string" ? { message: opts } : opts;
    setOptions(parsedOptions);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
    }
  };

  const getIcon = () => {
    const msg = options.message;
    const type = options.type;

    if (type === "danger" || msg.includes("ลบ") || msg.includes("ลบล้าง") || msg.includes("ลบทับ") || msg.includes("เขียนทับ")) {
      return (
        <div className="bg-emerald-50 text-emerald-600 rounded-2xl p-3 border border-emerald-100 shadow-sm shrink-0">
          <Trash2 size={24} className="animate-pulse" />
        </div>
      );
    }
    if (type === "warning" || msg.includes("คำเตือน") || msg.includes("หายไป")) {
      return (
        <div className="bg-amber-50 text-amber-600 rounded-2xl p-3 border border-amber-100 shadow-sm shrink-0">
          <AlertTriangle size={24} className="animate-bounce" />
        </div>
      );
    }
    return (
      <div className="bg-emerald-50 text-emerald-600 rounded-2xl p-3 border border-emerald-100 shadow-sm shrink-0">
        <HelpCircle size={24} className="animate-pulse" />
      </div>
    );
  };

  return (
    <ConfirmContext.Provider value={{ confirm, showToast }}>
      {children}

      {/* FLOATING TOAST NOTIFICATIONS */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-md px-4 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isSuccess = toast.type === "success";
            const isError = toast.type === "error";
            const isWarning = toast.type === "warning";

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md transition-all ${
                  isSuccess
                    ? "bg-slate-900/95 text-white border-emerald-500/50"
                    : isError
                    ? "bg-rose-950/95 text-white border-rose-500/50"
                    : isWarning
                    ? "bg-amber-950/95 text-white border-amber-500/50"
                    : "bg-slate-900/95 text-white border-slate-700"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isSuccess && <CheckCircle2 size={18} className="text-emerald-400 animate-bounce" />}
                  {isError && <AlertCircle size={18} className="text-rose-400 animate-pulse" />}
                  {isWarning && <AlertTriangle size={18} className="text-amber-400" />}
                  {!isSuccess && !isError && !isWarning && <Info size={18} className="text-blue-400" />}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
                </div>

                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-150 overflow-hidden relative z-10 p-6 text-left space-y-4"
            >
              {/* Icon */}
              <div className="flex items-start justify-between">
                {getIcon()}
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                  {options.title || "ยืนยันการดำเนินการ"}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {options.message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer text-center"
                >
                  {options.cancelText || "ยกเลิก"}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer text-center shadow-lg shadow-emerald-100"
                >
                  {options.confirmText || "ยืนยัน"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

