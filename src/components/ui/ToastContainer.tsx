import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../../hooks/useToast';
import type { ToastVariant } from '../../types';

const config: Record<ToastVariant, { icon: typeof CheckCircle; bg: string; text: string; border: string }> = {
  success: { icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  error:   { icon: AlertCircle, bg: 'bg-red-50',     text: 'text-red-800',     border: 'border-red-200' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-800',   border: 'border-amber-200' },
  info:    { icon: Info,         bg: 'bg-blue-50',   text: 'text-blue-800',    border: 'border-blue-200' },
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 w-full max-w-sm"
    >
      <AnimatePresence>
        {toasts.map(t => {
          const { icon: Icon, bg, text, border } = config[t.variant];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: 'spring', duration: 0.4 }}
              role="alert"
              className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bg} ${border}`}
            >
              <Icon size={18} className={`${text} shrink-0 mt-0.5`} aria-hidden />
              <p className={`flex-1 text-sm font-medium ${text}`}>{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className={`${text} hover:opacity-70 transition-opacity shrink-0`}
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
