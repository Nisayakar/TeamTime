import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ToastContext } from "../context/toast";
import type { ToastItem, ToastOptions, ToastType } from "../types/toast";

const DEFAULT_DURATIONS: Record<ToastType, number> = {
    success: 3000,
    info: 3500,
    warning: 4500,
    error: 5000
};

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismissToast = useCallback((id: number) => {
        setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((options: ToastOptions) => {
        const duration = options.duration ?? DEFAULT_DURATIONS[options.type];

        setToasts(currentToasts => [
            ...currentToasts,
            {
                ...options,
                duration,
                id: Date.now() + Math.floor(Math.random() * 1000)
            }
        ].slice(-MAX_TOASTS));
    }, []);

    const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
    return (
        <div className="toast-container" aria-live="polite" aria-label="Bildirimler">
            {toasts.map(toast => (
                <ToastMessage key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
    useEffect(() => {
        if (toast.duration === 0) {
            return;
        }

        const timerId = window.setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration);

        return () => window.clearTimeout(timerId);
    }, [onDismiss, toast.duration, toast.id]);

    return (
        <section className={`toast toast-${toast.type}`} role={toast.type === "error" || toast.type === "warning" ? "alert" : "status"}>
            <div className="toast-marker" aria-hidden="true" />
            <div>
                {toast.title && <strong>{toast.title}</strong>}
                <p>{toast.message}</p>
            </div>
            <button
                className="toast-close"
                type="button"
                aria-label="Bildirimi kapat"
                onClick={() => onDismiss(toast.id)}
            >
                ×
            </button>
        </section>
    );
}
