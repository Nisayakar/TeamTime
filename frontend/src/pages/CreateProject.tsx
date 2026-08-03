import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getStoredUser } from "../api";
import { useToast } from "../context/toast";
import type { ProjectRequest } from "../types/project";
import { canManageTeamProjects, getTeamRoleLabel, type Team, type TeamMember, type TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";

type StoredUser = {
    id: number;
}

type ProjectMode = "personal" | "team";

type ManageableTeam = Team & {
    role: TeamRole;
}

function CreateProject() {
    const { showToast } = useToast();
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [projectMode, setProjectMode] = useState<ProjectMode>("personal");
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [teams, setTeams] = useState<ManageableTeam[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const selectedTeamIdNumber = useMemo(() => {
        if (selectedTeamId === "") {
            return null;
        }

        return Number(selectedTeamId);
    }, [selectedTeamId]);

    const getCurrentUserId = useCallback(() => {
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
    }, []);

    const loadManageableTeams = useCallback(async () => {
        const currentUserId = getCurrentUserId();

        if (currentUserId === null) {
            setTeams([]);
            setLoadingTeams(false);
            return;
        }

        try {
            const teamsResponse = await apiFetch("/teams");

            if (!teamsResponse.ok) {
                throw new Error(await parseApiError(teamsResponse, "Takımlar yüklenemedi"));
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
            showToast({
                type: "error",
                message: getErrorMessage(error, "Takımlar yüklenemedi")
            });
            setTeams([]);
        } finally {
            setLoadingTeams(false);
        }
    }, [getCurrentUserId, showToast]);

    useEffect(() => {
        loadManageableTeams();
    }, [loadManageableTeams]);

    async function createProject(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submitting) {
            return;
        }

        if (projectMode === "team" && selectedTeamIdNumber === null) {
            showToast({
                type: "warning",
                message: "Lütfen proje için bir takım seçin"
            });
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
                showToast({
                    type: "error",
                    message: await parseApiError(response, "Proje oluşturulamadı")
                });
                return;
            }

            const data = await response.text();
            showToast({
                type: "success",
                message: data || "Proje başarıyla oluşturuldu."
            });
        } catch {
            showToast({
                type: "error",
                message: "Sunucuya bağlanılamadı"
            });
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
