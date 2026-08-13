export type TaskStatus =
    | "BEKLIYOR"
    | "DEVAM_EDIYOR"
    | "TAMAMLANDI";

export type TaskPriority =
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "URGENT";

export type AssignmentStatus =
    | "UNASSIGNED"
    | "PENDING"
    | "ACCEPTED"
    | "REJECTED";

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
    projectId: number | null;
    projectName: string | null;
    assignedUserId: number | null;
    assignedUserName: string | null;
    assignmentStatus: AssignmentStatus;
    rejectionReason: string | null;
    assignedAt: string | null;
    respondedAt: string | null;
};
