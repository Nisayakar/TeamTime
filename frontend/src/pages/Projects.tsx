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
import "./Projects.css";

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
        <main className="projects-container">
            <header className="projects-header">
                <div className="projects-header-info">
                    <h1>Projelerim</h1>
                    <p>Aktif proje portföyünü, ekipleri ve tarih aralıklarını takip et.</p>
                </div>

                <Link to="/create-project" className="projects-create-link" style={{ textDecoration: 'none' }}>
                    <button className="btn-create-project">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: "8px" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Yeni Proje
                    </button>
                </Link>
            </header>
            
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
                    <div className="projects-grid">
                        {projects.map((project) => (
                            <article className="project-card" key={project.id}>
                                <div className="project-card-accent"></div>
                                <div className="project-card-header">
                                    <h2>{project.projectName}</h2>
                                    <span className={`badge ${project.teamProject ? 'badge-team' : 'badge-personal'}`}>
                                        {project.teamProject ? `Takım: ${project.teamName || "Takım Projesi"}` : "Kişisel"}
                                    </span>
                                </div>
                                
                                <p className="project-card-desc">{project.description}</p>

                                <div className="project-card-dates">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    <span>{project.startDate || "-"} - {project.endDate || "-"}</span>
                                </div>

                                <div className="project-card-progress">
                                    <div className="progress-label">
                                        <span>İlerleme</span>
                                        <span>%{project.progress ?? 0}</span>
                                    </div>
                                    <div className="progress-bar-track">
                                        <div className="progress-bar-fill" style={{ width: `${project.progress ?? 0}%` }}></div>
                                    </div>
                                </div>

                                <div className="project-card-actions">
                                    <button className="btn-view-tasks" onClick={() => navigate(`/project/${project.id}`)}>
                                        Görevleri Gör
                                    </button>
                                    {canManageProject(project) && (
                                        <button className="btn-edit-project" title="Düzenle" onClick={() => navigate(`/edit-project/${project.id}`)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
                                        </button>
                                    )}
                                    {canDeleteProject(project) && (
                                        <button className="btn-delete-project" title="Sil" onClick={() => { setDeleteFeedback(""); setProjectToDelete(project); }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
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
