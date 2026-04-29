import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-4 px-6 py-5 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 min-w-[320px] max-w-md ${
                toast.type === 'success' ? 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-100' :
                toast.type === 'error' ? 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/50 text-rose-900 dark:text-rose-100' :
                'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-100'
              }`}
            >
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500' :
                toast.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-500' :
                'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500'
              }`}>
                {toast.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                {toast.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {toast.type === 'info' && <Info className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold leading-tight">{toast.message}</p>
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
