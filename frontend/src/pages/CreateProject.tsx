import { useEffect, useMemo, useState } from "react";
import { apiFetch, getStoredUser } from "../api";
import type { ProjectRequest } from "../types/project";
import { canManageTeamProjects, getTeamRoleLabel, type Team, type TeamMember, type TeamRole } from "../types/team";

type StoredUser = {
    id: number;
}

type ProjectMode = "personal" | "team";

type ManageableTeam = Team & {
    role: TeamRole;
}

function CreateProject() {
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [projectMode, setProjectMode] = useState<ProjectMode>("personal");
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [teams, setTeams] = useState<ManageableTeam[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadManageableTeams();
    }, []);

    const selectedTeamIdNumber = useMemo(() => {
        if (selectedTeamId === "") {
            return null;
        }

        return Number(selectedTeamId);
    }, [selectedTeamId]);

    function getCurrentUserId() {
        const storedUser: unknown = getStoredUser();

        if (
            storedUser &&
            typeof storedUser === "object" &&
            "id" in storedUser &&
            typeof (storedUser as StoredUser).id === "number"
        ) {
            return (storedUser as StoredUser).id;
        }

        return null;
    }

    async function readErrorMessage(response: Response, fallbackMessage = "Proje oluşturulamadı") {
        const contentType = response.headers.get("Content-Type") || "";

        if (contentType.includes("application/json")) {
            const data: unknown = await response.json();

            if (data && typeof data === "object") {
                if ("fieldErrors" in data && data.fieldErrors && typeof data.fieldErrors === "object") {
                    return Object.values(data.fieldErrors).join("\n");
                }

                if ("message" in data && typeof data.message === "string") {
                    return data.message;
                }
            }

            return fallbackMessage;
        }

        const message = await response.text();

        if (message) {
            return message;
        }

        switch (response.status) {
            case 401:
                return "Bu işlem için giriş yapmalısınız";
            case 403:
                return "Bu işlem için yetkiniz yok";
            case 404:
                return "İstenen kaynak bulunamadı";
            case 409:
                return "Bu işlem mevcut kayıtlarla çakışıyor";
            default:
                return fallbackMessage;
        }
    }

    async function loadManageableTeams() {
        const currentUserId = getCurrentUserId();

        if (currentUserId === null) {
            setTeams([]);
            setLoadingTeams(false);
            return;
        }

        try {
            const teamsResponse = await apiFetch("/teams");

            if (!teamsResponse.ok) {
                throw new Error(await readErrorMessage(teamsResponse, "Takımlar yüklenemedi"));
            }

            const teamsData: unknown = await teamsResponse.json();
            const userTeams: Team[] = Array.isArray(teamsData) ? teamsData : [];

            const teamsWithRoles: Array<ManageableTeam | null> = await Promise.all(
                userTeams.map(async team => {
                    const membersResponse = await apiFetch(`/teams/${team.id}/members`);

                    if (!membersResponse.ok) {
                        return null;
                    }

                    const membersData: unknown = await membersResponse.json();
                    const members: TeamMember[] = Array.isArray(membersData) ? membersData : [];
                    const currentMembership = members.find(member => member.userId === currentUserId);

                    if (!canManageTeamProjects(currentMembership?.role)) {
                        return null;
                    }

                    return {
                        ...team,
                        role: currentMembership.role
                    };
                })
            );

            const manageableTeams: ManageableTeam[] = teamsWithRoles.filter((team): team is ManageableTeam => team !== null);
            setTeams(manageableTeams);

            if (manageableTeams.length > 0) {
                setSelectedTeamId(String(manageableTeams[0].id));
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : "Takımlar yüklenemedi");
            setTeams([]);
        } finally {
            setLoadingTeams(false);
        }
    }

    async function createProject(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submitting) {
            return;
        }

        if (projectMode === "team" && selectedTeamIdNumber === null) {
            alert("Lütfen proje için bir takım seçin");
            return;
        }

        const project: ProjectRequest = {
            projectName,
            description: projectDescription,
            startDate,
            endDate,
            teamId: projectMode === "team" ? selectedTeamIdNumber : null
        };

        setSubmitting(true);

        try {
            const response = await apiFetch("/projects", {
                method: "POST",
                body: JSON.stringify(project)
            });

            if (!response.ok) {
                alert(await readErrorMessage(response));
                return;
            }

            const data = await response.text();
            alert(data);
        } catch {
            alert("Sunucuya bağlanılamadı");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="page-shell narrow-page">
            <section className="page-header">
                <div>
                    <span className="eyebrow">Proje</span>
                    <h1>Proje Oluştur</h1>
                    <p>Yeni bir proje alanı aç ve takım planını zaman çizelgesiyle başlat.</p>
                </div>
            </section>

            <form className="form-card" onSubmit={createProject}>
                <label>Proje Adı</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />

                <label>Proje Açıklaması</label>
                <input type="text" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />

                <label>Proje Türü</label>
                <select value={projectMode} onChange={(e) => setProjectMode(e.target.value as ProjectMode)}>
                    <option value="personal">Kişisel Proje</option>
                    <option value="team">Takım Projesi</option>
                </select>

                {
                    projectMode === "team" && (
                        <>
                            <label>Takım</label>
                            {
                                loadingTeams ? (
                                    <p className="empty-state">Takımlar yükleniyor...</p>
                                ) : teams.length === 0 ? (
                                    <p className="empty-state">Proje oluşturabileceğiniz yönetilebilir takım bulunmuyor.</p>
                                ) : (
                                    <select
                                        value={selectedTeamId}
                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                        required
                                    >
                                        {
                                            teams.map(team => (
                                                <option value={team.id} key={team.id}>
                                                    {team.name} - {getTeamRoleLabel(team.role)}
                                                </option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                        </>
                    )
                }

                <div className="form-grid two-columns">
                    <div>
                        <label>Başlangıç Tarihi</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>

                    <div>
                        <label>Bitiş Tarihi</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>

                <button
                    className="button button-primary button-full"
                    type="submit"
                    disabled={submitting || (projectMode === "team" && (loadingTeams || teams.length === 0))}
                >
                    {submitting ? "Oluşturuluyor..." : "Proje Oluştur"}
                </button>
            </form>
        </main>
    );
}

export default CreateProject;
