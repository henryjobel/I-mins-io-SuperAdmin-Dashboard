import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface ToastViewportProps {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastViewport({ items, onDismiss }: ToastViewportProps) {
  if (!items.length) return null;

  return (
    <div className="fixed right-3 top-3 z-[60] flex w-full max-w-sm flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm shadow-lg ${
            item.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : item.tone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {item.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : item.tone === "error" ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="flex-1 leading-5">{item.message}</p>
          <button
            onClick={() => onDismiss(item.id)}
            className="rounded-md p-1 hover:bg-black/5"
            aria-label="Dismiss toast"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

