export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

export type Team = {
    id: number;
    name: string;
    description: string;
    createdDate?: string;
}

export type TeamMember = {
    id: number;
    userId: number;
    userName: string;
    username: string;
    userEmail?: string;
    teamId: number;
    teamName: string;
    role: TeamRole;
    joinedDate: string;
}

export function getTeamRoleLabel(role: TeamRole) {
    switch (role) {
        case "OWNER":
            return "Sahip";
        case "ADMIN":
            return "Yönetici";
        case "MEMBER":
            return "Üye";
    }
}

export function canManageTeamProjects(role: TeamRole | undefined) {
    return role === "OWNER" || role === "ADMIN";
}
