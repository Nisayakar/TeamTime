export type NotificationType =
    | "TEAM_MEMBER_ADDED"
    | "TEAM_MEMBER_REMOVED"
    | "TEAM_PROJECT_CREATED"
    | "TEAM_TASK_CREATED";

export type NotificationRelatedEntityType = "TEAM" | "PROJECT" | "TASK";

export type NotificationItem = {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    createdAt: string;
    relatedEntityId: number | null;
    relatedEntityType: NotificationRelatedEntityType | null;
};
