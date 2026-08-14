import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CreateProject.css";
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
        <main className="page-shell glass-page">
            <section className="page-header app-page-header">
                <div className="app-page-header-copy">
                    <span className="eyebrow">Proje</span>
                    <h1>Proje Oluştur</h1>
                    <p>Yeni bir proje alanı aç ve takım planını zaman çizelgesiyle başlat.</p>
                </div>
            </section>

            <form onSubmit={createProject} noValidate>
                {/* Section 1: Proje Bilgileri */}
                <section className="glass-section glass-section-accent-primary">
                    <div className="glass-section-line primary"></div>
                    <div className="cp-section-flex">
                        <div className="cp-section-left">
                            <div className="cp-icon-circle cp-icon-primary">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            </div>
                            <div>
                                <div className="cp-step-badge primary">Aşama 1</div>
                                <h2 className="cp-title text-on-surface dark:text-on-primary">Proje Detayları</h2>
                            </div>
                        </div>
                        <div className="cp-section-right">
                            <div className="cp-input-group">
                                <label htmlFor="projectName">Proje Adı</label>
                                <input id="projectName" className="ghost-input" placeholder="Örn: Q3 Pazarlama Kampanyası" type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
                            </div>
                            <div className="cp-input-group">
                                <label htmlFor="projectDesc">Proje Açıklaması</label>
                                <textarea id="projectDesc" className="ghost-input" placeholder="Projenin temel hedefleri ve kapsamı..." rows={4} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Section 2: Proje Türü */}
                <section className="glass-section glass-section-accent-secondary">
                    <div className="glass-section-line secondary"></div>
                    <div className="cp-section-flex">
                        <div className="cp-section-left">
                            <div className="cp-icon-circle cp-icon-secondary">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                            </div>
                            <div>
                                <div className="cp-step-badge secondary">Aşama 2</div>
                                <h2 className="cp-title text-on-surface dark:text-on-primary">Proje Türü</h2>
                            </div>
                        </div>
                        <div className="cp-section-right">
                            <div className="cp-grid-2" role="radiogroup" aria-label="Proje Türü">
                                {/* Option 1 */}
                                <label className="cp-radio-tile-label">
                                    <input
                                        type="radio"
                                        name="projectMode"
                                        className="cp-radio-tile-input sr-only"
                                        style={{ position: "absolute", opacity: 0, width: "1px", height: "1px", margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)" }}
                                        checked={projectMode === "personal"}
                                        aria-checked={projectMode === "personal"}
                                        onChange={() => {
                                            setProjectMode("personal");
                                            setFormFeedback(null);
                                        }}
                                    />
                                    <div className="cp-radio-tile">
                                        <div className="cp-radio-header">
                                            <svg className="cp-radio-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                            <div className="cp-radio-circle">
                                                <div className="cp-radio-dot"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="cp-radio-title text-on-surface dark:text-on-primary">Kişisel Proje</span>
                                            <span className="cp-radio-desc">Sadece size ait bir proje.</span>
                                        </div>
                                    </div>
                                </label>
                                
                                {/* Option 2 */}
                                <label className="cp-radio-tile-label">
                                    <input
                                        type="radio"
                                        name="projectMode"
                                        className="cp-radio-tile-input sr-only"
                                        style={{ position: "absolute", opacity: 0, width: "1px", height: "1px", margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)" }}
                                        checked={projectMode === "team"}
                                        aria-checked={projectMode === "team"}
                                        onChange={() => {
                                            setProjectMode("team");
                                            setFormFeedback(null);
                                        }}
                                    />
                                    <div className="cp-radio-tile">
                                        <div className="cp-radio-header">
                                            <svg className="cp-radio-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                            <div className="cp-radio-circle">
                                                <div className="cp-radio-dot"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="cp-radio-title text-on-surface dark:text-on-primary">Takım Projesi</span>
                                            <span className="cp-radio-desc">Bir ekiple ortak yürütülen proje.</span>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {projectMode === "team" && (
                                <div className="team-project-picker" style={{ marginTop: "8px" }}>
                                    <div className="cp-input-group">
                                        <label htmlFor="teamSelect">Takım</label>
                                        <p className="form-helper-text" style={{margin: 0, marginBottom: "8px"}}>Yalnızca yönetici veya sahibi olduğunuz takımlar listelenir.</p>
                                        {
                                            loadingTeams ? (
                                                <p className="empty-state app-empty-state">Takımlar yükleniyor...</p>
                                            ) : teamFeedback ? (
                                                <InlineFeedback type={teamFeedback.type} message={teamFeedback.message} />
                                            ) : teams.length === 0 ? (
                                                <div className="empty-state app-empty-state team-project-empty">
                                                    <strong>Takım projesi oluşturabileceğiniz bir takım bulunmuyor.</strong>
                                                    <span>Takım projesi oluşturmak için bir takımda Sahip veya Yönetici rolünde olmanız gerekir.</span>
                                                    <Link className="button button-secondary" style={{ marginTop: "16px" }} to="/teams">Takımlarıma Git</Link>
                                                </div>
                                            ) : (
                                                <>
                                                    <select
                                                        id="teamSelect"
                                                        className="ghost-input"
                                                        aria-label="Takım"
                                                        value={selectedTeamId}
                                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Bir takım seçin</option>
                                                        {teams.map(team => (
                                                            <option value={team.id} key={team.id}>
                                                                {team.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {selectedTeam && (
                                                        <div className="selected-team-summary" style={{ marginTop: "12px", padding: "16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                                                            <strong>{selectedTeam.name}</strong>
                                                            <span>Rolünüz: {getTeamRoleLabel(selectedTeam.role)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Section 3: Tarih Planlaması */}
                <section className="glass-section glass-section-accent-primary">
                    <div className="glass-section-line tertiary"></div>
                    <div className="cp-section-flex">
                        <div className="cp-section-left">
                            <div className="cp-icon-circle cp-icon-tertiary">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            </div>
                            <div>
                                <div className="cp-step-badge primary">Aşama 3</div>
                                <h2 className="cp-title text-on-surface dark:text-on-primary">Zaman Çizelgesi</h2>
                            </div>
                        </div>
                        <div className="cp-section-right">
                            <div className="cp-grid-2">
                                <div className="cp-input-group">
                                    <label>Başlangıç Tarihi</label>
                                    <input className="ghost-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="cp-input-group">
                                    <label>Bitiş Tarihi</label>
                                    <input className="ghost-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {formFeedback && <div style={{marginTop: "16px"}}><InlineFeedback type={formFeedback.type} message={formFeedback.message} /></div>}

                <div className="cp-actions">
                    <button type="button" className="cp-btn-cancel">İptal Et</button>
                    <button
                        className="cp-btn-gradient"
                        type="submit"
                        disabled={submitting || (projectMode === "team" && (loadingTeams || teams.length === 0))}
                    >
                        {submitting ? "Oluşturuluyor..." : "Proje Oluştur"}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: "8px" }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                </div>
            </form>
        </main>
    );
}

export default CreateProject;
