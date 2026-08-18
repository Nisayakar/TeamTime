import ProjectCard from "../components/ProjectCard";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import { subscribeToSync, broadcastSyncEvent } from "../sync";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
import type { Project } from "../types/project";
import { canManageTeamProjects, type TeamMember, type TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";
import "./CreateProject.css";

type StoredUser = {
    id: number;
}

function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [teamRoles, setTeamRoles] = useState<Record<number, TeamRole | undefined>>({});
    const [loading, setLoading] = useState(true);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState(false);
    const [sectionFeedback, setSectionFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [deleteFeedback, setDeleteFeedback] = useState("");
    const navigate = useNavigate();

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

    const loadTeamRoles = useCallback(async (accessibleProjects: Project[]) => {
        const currentUserId = getCurrentUserId();

        if (currentUserId === null) {
            setTeamRoles({});
            return;
        }

        const teamIds = Array.from(
            new Set(
                accessibleProjects
                    .map(project => project.teamId)
                    .filter((teamId): teamId is number => teamId !== null)
            )
        );

        const roleEntries = await Promise.all(
            teamIds.map(async teamId => {
                const response = await apiFetch(`/teams/${teamId}/members`);

                if (!response.ok) {
                    return [teamId, undefined] as const;
                }

                const data: unknown = await response.json();
                const members: TeamMember[] = Array.isArray(data) ? data : [];
                const role = members.find(member => member.userId === currentUserId)?.role;

                return [teamId, role] as const;
            })
        );

        setTeamRoles(Object.fromEntries(roleEntries));
    }, [getCurrentUserId]);

    const loadProjects = useCallback(async () => {
        setLoading(true);

        try {
            const response = await apiFetch("/projects");

            if (!response.ok) {
                if (navigateForInitialLoadError(response.status, navigate)) {
                    return;
                }

                throw new Error(await parseApiError(response, "Projeler yüklenemedi"));
            }

            const data: unknown = await response.json();
            const accessibleProjects: Project[] = Array.isArray(data) ? data : [];
            setProjects(accessibleProjects);
            setSectionFeedback(null);
            await loadTeamRoles(accessibleProjects);
        } catch (error) {
            setSectionFeedback({ type: "error", message: getErrorMessage(error, "Projeler yüklenemedi") });
            setProjects([]);
            setTeamRoles({});
        } finally {
            setLoading(false);
        }
    }, [loadTeamRoles, navigate]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    useEffect(() => {
        const unsubscribe = subscribeToSync((event) => {
            if (event.type === "PROJECT_CHANGED" || event.type === "TEAM_CHANGED") {
                loadProjects();
            }
        });
        return unsubscribe;
    }, [loadProjects]);

    function canManageProject(project: Project) {
        if (!project.teamProject) {
            return true;
        }

        if (project.teamId === null) {
            return false;
        }

        return canManageTeamProjects(teamRoles[project.teamId]);
    }

    function canDeleteProject(project: Project) {
        if (!project.teamProject) {
            return true;
        }

        if (project.teamId === null) {
            return false;
        }

        return teamRoles[project.teamId] === "OWNER";
    }

    async function confirmDeleteProject() {
        if (!projectToDelete || deletingProject) {
            return;
        }

        setDeletingProject(true);

        try {
            const response = await apiFetch(`/projects/${projectToDelete.id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                setDeleteFeedback(await parseApiError(response, "Proje silinemedi"));
                return;
            }

            const data = await response.text();
            setSectionFeedback({ type: "success", message: data || "Proje başarıyla silindi." });
            setProjects(currentProjects => currentProjects.filter(project => project.id !== projectToDelete.id));
            broadcastSyncEvent("PROJECT_CHANGED", { projectId: projectToDelete.id });
            setProjectToDelete(null);
        } catch (error) {
            setDeleteFeedback(getErrorMessage(error, "Proje silinemedi"));
        } finally {
            setDeletingProject(false);
        }
    }

    return (
        <main className="page-shell app-page projects-page glass-page">
            <section className="page-header app-page-header projects-page-header">
                <div className="app-page-header-copy projects-page-header-copy">
                    <span className="eyebrow">Projeler</span>
                    <h1>Projelerim</h1>
                    <p>Aktif proje portföyünü, ekipleri ve tarih aralıklarını takip et.</p>
                </div>

                <Link to="/create-project" className="projects-create-link" style={{ textDecoration: 'none' }}>
                    <button className="cp-btn-gradient" style={{ minWidth: "140px", padding: "10px 20px" }}>
                        Yeni Proje
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: "8px" }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                </Link>
            </section>
            
            {sectionFeedback && sectionFeedback.type !== "error" && (
                <div style={{ marginBottom: "16px" }}>
                    <InlineFeedback type={sectionFeedback.type} message={sectionFeedback.message} />
                </div>
            )}

            {
                loading ? (
                    <p className="empty-state app-empty-state">Projeler yükleniyor...</p>
                ) : sectionFeedback?.type === "error" ? (
                    <InlineFeedback type={sectionFeedback.type} message={sectionFeedback.message} />
                ) : projects.length === 0 ? (
                    <p className="empty-state app-empty-state">Henüz erişebileceğiniz proje yok.</p>
                ) : (
                    <section className="glass-section glass-section-accent-primary" style={{ marginTop: "16px" }}>
                        <div className="glass-section-line primary"></div>
                        <div className="cp-section-flex">
                            <div className="cp-section-left">
                                <div className="cp-icon-circle cp-icon-primary">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                                </div>
                                <div>
                                    <div className="cp-step-badge primary">Liste</div>
                                    <h2 className="cp-title text-on-surface dark:text-on-primary">Tüm Projeler</h2>
                                </div>
                            </div>
                            <div className="cp-section-right">
                                <div className="cp-grid-2">
                                    {projects.map((project) => (
                                        <article className="cp-radio-tile" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }} key={project.id}>
                                            <div className="project-row-main" style={{ flex: 1 }}>
                                                <div className="project-row-header" style={{ marginBottom: "12px" }}>
                                                    <ProjectCard
                                                        projectName={project.projectName}
                                                        teamId={project.teamId}
                                                        teamName={project.teamName}
                                                        teamProject={project.teamProject}
                                                    />
                                                </div>
                                                <p className="project-row-desc" style={{ fontSize: "14px", color: "var(--tt-text-secondary)", margin: 0 }}>{project.description}</p>
                                            </div>

                                            <div className="project-row-meta" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "auto" }}>
                                                <div className="project-row-dates" style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "var(--tt-text-secondary)" }}>
                                                    <span className="date-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                                        <strong>Başlangıç:</strong> {project.startDate || "-"}
                                                    </span>
                                                    <span className="date-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                                        <strong>Bitiş:</strong> {project.endDate || "-"}
                                                    </span>
                                                </div>

                                                <div className="project-progress-container" style={{ margin: "4px 0" }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", color: "var(--tt-text-secondary)" }}>
                                                        <span>İlerleme</span>
                                                        <span>%{project.progress ?? 0}</span>
                                                    </div>
                                                    <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                                                        <div style={{ width: `${project.progress ?? 0}%`, height: "100%", backgroundColor: "#2563eb", borderRadius: "3px", transition: "width 0.3s ease" }} />
                                                    </div>
                                                </div>

                                                <div className="project-row-actions button-row" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                    <button className="cp-btn-gradient" style={{ padding: "6px 12px", fontSize: "13px", minHeight: "32px", flex: 1 }} onClick={() => navigate(`/project/${project.id}`)}>
                                                        Görevleri Gör
                                                    </button>
                                                    {canManageProject(project) && (
                                                        <button className="cp-btn-cancel" style={{ padding: "6px 12px", fontSize: "13px", minHeight: "32px" }} onClick={() => navigate(`/edit-project/${project.id}`)}>
                                                            Düzenle
                                                        </button>
                                                    )}
                                                    {canDeleteProject(project) && (
                                                        <button className="cp-btn-cancel" style={{ padding: "6px 12px", fontSize: "13px", minHeight: "32px", color: "var(--tt-danger, #e11d48)" }} onClick={() => { setDeleteFeedback(""); setProjectToDelete(project); }}>
                                                            Sil
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )
            }
            <ConfirmModal
                open={projectToDelete !== null}
                title="Projeyi sil"
                message={`"${projectToDelete?.projectName ?? "Bu proje"}" adlı projeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
                confirmLabel={deletingProject ? "Siliniyor" : "Sil"}
                variant="danger"
                loading={deletingProject}
                errorMessage={deleteFeedback}
                onConfirm={confirmDeleteProject}
                onCancel={() => {
                    setDeleteFeedback("");
                    setProjectToDelete(null);
                }}
            />
        </main>
    );
}

export default Projects;
