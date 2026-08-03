export type ToastType =
    | "success"
    | "error"
    | "warning"
    | "info";

export type ToastOptions = {
    type: ToastType;
    message: string;
    title?: string;
    duration?: number;
};

export type ToastItem = ToastOptions & {
    id: number;
};
