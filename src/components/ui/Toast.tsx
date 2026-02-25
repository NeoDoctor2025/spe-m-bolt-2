import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export function ToastContainer() {
  const { toasts, dismissToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] transition-all duration-300 ${
            toast.dismissing
              ? 'opacity-0 translate-y-2'
              : 'opacity-100 translate-y-0 animate-slide-up'
          } ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0" />}
          {toast.type === 'error' && <XCircle className="h-5 w-5 shrink-0" />}
          {toast.type === 'info' && <Info className="h-5 w-5 shrink-0" />}
          <span className="text-sm flex-1">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
