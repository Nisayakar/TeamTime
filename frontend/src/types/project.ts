export type Project = {
    id: number;
    projectName: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    teamId: number | null;
    teamName: string | null;
    teamProject: boolean;
}

export type ProjectRequest = {
    projectName: string;
    description: string;
    startDate: string;
    endDate: string;
    teamId: number | null;
}
