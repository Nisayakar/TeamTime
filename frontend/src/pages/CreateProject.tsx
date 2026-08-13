import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, getStoredUser } from "../api";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
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
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [projectMode, setProjectMode] = useState<ProjectMode>("personal");
    const [selectedTeamId, setSelectedTeamId] = useState("");
    const [teams, setTeams] = useState<ManageableTeam[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [teamFeedback, setTeamFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [formFeedback, setFormFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);

    const selectedTeamIdNumber = useMemo(() => {
        if (selectedTeamId === "") {
            return null;
        }

        return Number(selectedTeamId);
    }, [selectedTeamId]);

    const selectedTeam = useMemo(
        () => teams.find(team => team.id === selectedTeamIdNumber),
        [selectedTeamIdNumber, teams]
    );

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
            setTeamFeedback(null);
        } catch (error) {
            setTeamFeedback({ type: "error", message: getErrorMessage(error, "Takımlar yüklenemedi") });
            setTeams([]);
        } finally {
            setLoadingTeams(false);
        }
    }, [getCurrentUserId]);

    useEffect(() => {
        loadManageableTeams();
    }, [loadManageableTeams]);

    async function createProject(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submitting) {
            return;
        }

        if (projectMode === "team" && selectedTeamIdNumber === null) {
            setFormFeedback({ type: "warning", message: "Lütfen bir takım seçin." });
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
        setFormFeedback(null);

        try {
            const response = await apiFetch("/projects", {
                method: "POST",
                body: JSON.stringify(project)
            });

            if (!response.ok) {
                setFormFeedback({ type: "error", message: await parseApiError(response, "Proje oluşturulamadı") });
                return;
            }

            const data = await response.text();
            setFormFeedback({ type: "success", message: data || "Proje başarıyla oluşturuldu." });
        } catch {
            setFormFeedback({ type: "error", message: "Sunucuya bağlanılamadı" });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="page-shell narrow-page app-page create-project-page">
            <section className="page-header app-page-header">
                <div className="app-page-header-copy">
                    <span className="eyebrow">Proje</span>
                    <h1>Proje Oluştur</h1>
                    <p>Yeni bir proje alanı aç ve takım planını zaman çizelgesiyle başlat.</p>
                </div>
            </section>

            <form className="form-card app-form-card" onSubmit={createProject} noValidate>
                <div className="section-heading">
                    <span className="eyebrow">Detaylar</span>
                    <h2>Proje bilgileri</h2>
                </div>

                <label>Proje Adı</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />

                <label>Proje Açıklaması</label>
                <textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />

                <div className="project-type-section">
                    <label>Proje Türü</label>
                    <div className="project-type-options" role="radiogroup" aria-label="Proje Türü">
                        <button
                            className={projectMode === "personal" ? "project-type-option is-active" : "project-type-option"}
                            type="button"
                            role="radio"
                            aria-checked={projectMode === "personal"}
                            onClick={() => {
                                setProjectMode("personal");
                                setFormFeedback(null);
                            }}
                        >
                            <strong>Kişisel Proje</strong>
                            <span>Sadece size ait bir proje.</span>
                        </button>

                        <button
                            className={projectMode === "team" ? "project-type-option is-active" : "project-type-option"}
                            type="button"
                            role="radio"
                            aria-checked={projectMode === "team"}
                            onClick={() => {
                                setProjectMode("team");
                                setFormFeedback(null);
                            }}
                        >
                            <strong>Takım Projesi</strong>
                            <span>Bir ekiple ortak yürütülen proje.</span>
                        </button>
                    </div>
                </div>

                {
                    projectMode === "team" && (
                        <div className="team-project-picker">
                            <label>Takım</label>
                            <p className="form-helper-text">Yalnızca yönetici veya sahibi olduğunuz takımlar listelenir.</p>
                            {
                                loadingTeams ? (
                                    <p className="empty-state app-empty-state">Takımlar yükleniyor...</p>
                                ) : teamFeedback ? (
                                    <InlineFeedback type={teamFeedback.type} message={teamFeedback.message} />
                                ) : teams.length === 0 ? (
                                    <div className="empty-state app-empty-state team-project-empty">
                                        <strong>Takım projesi oluşturabileceğiniz bir takım bulunmuyor.</strong>
                                        <span>Takım projesi oluşturmak için bir takımda Sahip veya Yönetici rolünde olmanız gerekir.</span>
                                        <Link className="button button-secondary" to="/teams">Takımlarıma Git</Link>
                                    </div>
                                ) : (
                                    <>
                                        <select
                                            aria-label="Takım"
                                            value={selectedTeamId}
                                            onChange={(e) => setSelectedTeamId(e.target.value)}
                                            required
                                        >
                                            <option value="">Bir takım seçin</option>
                                            {
                                                teams.map(team => (
                                                    <option value={team.id} key={team.id}>
                                                        {team.name}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        {
                                            selectedTeam && (
                                                <div className="selected-team-summary">
                                                    <strong>{selectedTeam.name}</strong>
                                                    <span>Rolünüz: {getTeamRoleLabel(selectedTeam.role)}</span>
                                                </div>
                                            )
                                        }
                                    </>
                                )
                            }
                        </div>
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
                {formFeedback && <InlineFeedback type={formFeedback.type} message={formFeedback.message} />}
            </form>
        </main>
    );
}

export default CreateProject;
