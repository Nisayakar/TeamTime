import { createContext, useContext } from "react";
import type { ToastOptions } from "../types/toast";

export type ToastContextValue = {
    showToast: (options: ToastOptions) => void;
    dismissToast: (id: number) => void;
};

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast ToastProvider içinde kullanılmalıdır.");
    }

    return context;
}
