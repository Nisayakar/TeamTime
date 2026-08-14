import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getStoredUser } from "../api";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
import type { Project, ProjectRequest } from "../types/project";
import { canManageTeamProjects, getTeamRoleLabel, type TeamMember, type TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";

type StoredUser = {
    id: number;
}

function EditProject() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [projectName, setProjectName] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentTeamRole, setCurrentTeamRole] = useState<TeamRole | undefined>();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [loadFeedback, setLoadFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [formFeedback, setFormFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);

    const canUpdateProject = project
        ? !project.teamProject || canManageTeamProjects(currentTeamRole)
        : false;

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

    const loadTeamRole = useCallback(async (teamId: number) => {
        const currentUserId = getCurrentUserId();

        if (currentUserId === null) {
            setCurrentTeamRole(undefined);
            return;
        }

        const response = await apiFetch(`/teams/${teamId}/members`);

        if (!response.ok) {
            setCurrentTeamRole(undefined);
            return;
        }

        const data: unknown = await response.json();
        const members: TeamMember[] = Array.isArray(data) ? data : [];
        setCurrentTeamRole(members.find(member => member.userId === currentUserId)?.role);
    }, [getCurrentUserId]);

    const loadProject = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const response = await apiFetch(`/projects/${id}`);

            if (!response.ok) {
                if (navigateForInitialLoadError(response.status, navigate)) {
                    return;
                }

                throw new Error(await parseApiError(response, "Proje yüklenemedi"));
            }

            const data: Project = await response.json();
            setProject(data);
            setLoadFeedback(null);
            setProjectName(data.projectName || "");
            setDescription(data.description || "");
            setStartDate(data.startDate || "");
            setEndDate(data.endDate || "");

            if (data.teamProject && data.teamId !== null) {
                await loadTeamRole(data.teamId);
            }
        } catch (error) {
            setLoadFeedback({ type: "error", message: getErrorMessage(error, "Proje yüklenemedi") });
            setProject(null);
        } finally {
            setLoading(false);
        }
    }, [id, loadTeamRole, navigate]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    async function updateProject(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!project || !canUpdateProject || submitting) {
            return;
        }

        const request: ProjectRequest = {
            projectName,
            description,
            startDate,
            endDate,
            teamId: project.teamId
        };

        setSubmitting(true);
        setFormFeedback(null);

        try {
            const response = await apiFetch(`/projects/${id}`, {
                method: "PUT",
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                setFormFeedback({ type: "error", message: await parseApiError(response, "Proje güncellenemedi") });
                return;
            }

            const data = await response.text();
            setFormFeedback({ type: "success", message: data || "Proje başarıyla güncellendi." });
            navigate("/projects");
        } catch {
            setFormFeedback({ type: "error", message: "Sunucuya bağlanılamadı" });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="page-shell narrow-page app-page edit-project-page">
            <section className="page-header app-page-header">
                <div className="app-page-header-copy">
                    <span className="eyebrow">Proje</span>
                    <h1>Proje Düzenle</h1>
                    <p>Proje bilgilerini güncelle ve takvimini düzenli tut.</p>
                </div>
            </section>

            {
                loading ? (
                    <p className="empty-state app-empty-state">Proje yükleniyor...</p>
                ) : loadFeedback ? (
                    <InlineFeedback type={loadFeedback.type} message={loadFeedback.message} />
                ) : !project ? (
                    <p className="empty-state app-empty-state">Proje bulunamadı.</p>
                ) : (
                    <form className="stacked-form" onSubmit={updateProject}>
                        <section className="form-section">
                            <div className="section-heading">
                                <span className="eyebrow">Detaylar</span>
                                <h2>Proje bilgileri</h2>
                            </div>

                            <label>Proje Adı</label>
                            <input
                                className="ghost-input"
                                name="projectName"
                                value={projectName}
                                onChange={(event) => setProjectName(event.target.value)}
                                required
                            />

                            <label>Açıklama</label>
                            <input
                                className="ghost-input"
                                name="description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                            />
                        </section>
                        
                        <hr className="section-divider" />

                        <section className="form-section">
                            <div className="section-heading">
                                <span className="eyebrow">Erişim</span>
                                <h2>Proje Türü</h2>
                            </div>

                            <div className="project-team-readonly" style={{ padding: "16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
                                <div>
                                    <span className="muted" style={{ fontSize: "13px" }}>Proje Türü:</span>
                                    <strong style={{ marginLeft: "8px" }}>{project.teamProject ? "Takım Projesi" : "Kişisel Proje"}</strong>
                                </div>
                                {
                                    project.teamProject && (
                                        <div style={{ marginTop: "8px" }}>
                                            <span className="muted" style={{ fontSize: "13px" }}>Takım:</span>
                                            <strong style={{ marginLeft: "8px" }}>{project.teamName || "Takım"}</strong>
                                        </div>
                                    )
                                }
                                {
                                    project.teamProject && currentTeamRole && (
                                        <div style={{ marginTop: "8px" }}>
                                            <span className="muted" style={{ fontSize: "13px" }}>Rolünüz:</span>
                                            <strong style={{ marginLeft: "8px" }}>{getTeamRoleLabel(currentTeamRole)}</strong>
                                        </div>
                                    )
                                }
                                <p className="muted" style={{ marginTop: "16px", fontSize: "13px" }}>Projenin takım bağlantısı oluşturulduktan sonra değiştirilemez.</p>
                            </div>
                        </section>
                        
                        <hr className="section-divider" />

                        <section className="form-section">
                            <div className="section-heading">
                                <span className="eyebrow">Zaman Çizelgesi</span>
                                <h2>Tarih Planlaması</h2>
                            </div>
                            <div className="form-grid two-columns">
                                <div>
                                    <label>Başlangıç Tarihi</label>
                                    <input
                                        className="ghost-input"
                                        type="date"
                                        name="startDate"
                                        value={startDate}
                                        onChange={(event) => setStartDate(event.target.value)}
                                    />
                                </div>

                                <div>
                                    <label>Bitiş Tarihi</label>
                                    <input
                                        className="ghost-input"
                                        type="date"
                                        name="endDate"
                                        value={endDate}
                                        onChange={(event) => setEndDate(event.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        <div style={{ marginTop: "48px" }}>
                            {
                                canUpdateProject ? (
                                    <button className="button button-primary button-full" type="submit" disabled={submitting}>
                                        {submitting ? "Güncelleniyor..." : "Güncelle"}
                                    </button>
                                ) : (
                                    <p className="empty-state app-empty-state">Bu takım projesini düzenleme yetkiniz yok.</p>
                                )
                            }
                        </div>
                        {formFeedback && <InlineFeedback type={formFeedback.type} message={formFeedback.message} />}
                    </form>
                )
            }
        </main>
    );
}

export default EditProject;
