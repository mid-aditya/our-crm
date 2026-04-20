"use client";

import { useApp } from "@/context/AppContext";
import { CheckCircle, X, AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: "text-[#3FB950] border-[#3FB950]/30 bg-[#3FB950]/10",
  error: "text-[#FF4C4C] border-[#FF4C4C]/30 bg-[#FF4C4C]/10",
  warning: "text-[#D29922] border-[#D29922]/30 bg-[#D29922]/10",
  info: "text-[#00F5FF] border-[#00F5FF]/30 bg-[#00F5FF]/10",
};

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl min-w-[300px] max-w-[380px] toast-enter",
              "bg-[#161B22]/95",
              colors[toast.type]
            )}
          >
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#E6EDF3]">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-[#8B949E] mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8B949E] hover:text-[#E6EDF3] transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
