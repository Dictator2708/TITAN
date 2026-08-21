import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (title, message, type = 'info', duration = 5000) => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Background reminder notification poller
  useEffect(() => {
    const token = api.getToken();
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        if (!api.getToken()) return;
        const notifs = await api.pollNotifications();
        if (notifs && notifs.length > 0) {
          notifs.forEach((n) => {
            addToast(n.title || 'Scheduled Reminder', n.message, 'warning', 8000);
          });
        }
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: 380,
          width: 'calc(100vw - 48px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'var(--bg-card)',
              border: `1px solid ${
                toast.type === 'warning'
                  ? 'var(--accent-amber)'
                  : toast.type === 'error'
                  ? 'var(--accent-rose)'
                  : toast.type === 'success'
                  ? 'var(--accent-emerald)'
                  : 'var(--accent-cyan)'
              }`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {toast.title}
              </strong>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  lineHeight: 1,
                  padding: 2,
                }}
              >
                ✕
              </button>
            </div>
            {toast.message && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {toast.message}
              </p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
