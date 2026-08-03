export type TaskStatus =
    | "BEKLIYOR"
    | "DEVAM_EDIYOR"
    | "TAMAMLANDI";

export type TaskPriority =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "URGENT";

export type Task = {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    createdAt: string;
    completedAt: string | null;
    overdue: boolean;
};
