import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "../lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
  error: "bg-gradient-to-r from-red-500 to-rose-500 text-white",
  warning: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
  info: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
};

const ToastItem = ({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) => {
  const Icon = toastIcons[toast.type];

  useEffect(() => {
    const timer = setTimeout(onRemove, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl shadow-lg backdrop-blur-sm",
        "animate-slide-in-right",
        "min-w-[280px] max-w-[340px]",
        toastStyles[toast.type],
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-xs opacity-90 mt-0.5 line-clamp-2">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
