export type TeamRole = "OWNER" | "ADMIN" | "MEMBER";

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
