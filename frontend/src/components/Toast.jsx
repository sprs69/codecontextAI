import React, { createContext, useContext, useState, useCallback } from 'react';
import { IconCheck, IconAlertTriangle, IconAlertCircle, IconInfo, IconX } from './Icons';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => {
          let IconComp = IconInfo;
          if (toast.type === 'success') IconComp = IconCheck;
          if (toast.type === 'error') IconComp = IconAlertCircle;
          if (toast.type === 'warning') IconComp = IconAlertTriangle;

          return (
            <div key={toast.id} className={`toast-item toast-${toast.type} fade-in`}>
              <div className="toast-icon">
                <IconComp size={16} />
              </div>
              <div className="toast-content">{toast.message}</div>
              <button
                className="toast-close-btn"
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
              >
                <IconX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: (msg) => console.log('Toast:', msg) };
  }
  return context;
}
