import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max width class e.g. 'max-w-lg' */
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap + restore focus
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => { prev?.focus(); };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          ref={dialogRef}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
          >
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 id="modal-title" className="text-lg font-semibold text-slate-900">{title}</h2>
                <button
                  ref={closeBtnRef}
                  onClick={onClose}
                  aria-label="Close"
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F84464]"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {!title && (
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 z-10 p-2 rounded-full text-slate-400 hover:text-slate-600 bg-white/80 hover:bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F84464]"
              >
                <X size={18} />
              </button>
            )}
            <div className="overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
