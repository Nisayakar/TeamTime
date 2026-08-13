import ProjectCard from "../components/ProjectCard";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
import type { Project } from "../types/project";
import { canManageTeamProjects, type TeamMember, type TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";

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

    function canManageProject(project: Project) {
        if (!project.teamProject) {
            return true;
        }

        if (project.teamId === null) {
            return false;
        }

        return canManageTeamProjects(teamRoles[project.teamId]);
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
            setProjectToDelete(null);
        } catch (error) {
            setDeleteFeedback(getErrorMessage(error, "Proje silinemedi"));
        } finally {
            setDeletingProject(false);
        }
    }

    return (
        <main className="page-shell app-page projects-page">
            <section className="page-header app-page-header projects-page-header">
                <div className="app-page-header-copy projects-page-header-copy">
                    <span className="eyebrow">Projeler</span>
                    <h1>Projelerim</h1>
                    <p>Aktif proje portföyünü, ekipleri ve tarih aralıklarını takip et.</p>
                </div>

                <Link to="/create-project" className="projects-create-link">
                    <button className="button button-primary">Yeni Proje</button>
                </Link>
            </section>
            {sectionFeedback && sectionFeedback.type !== "error" && (
                <InlineFeedback type={sectionFeedback.type} message={sectionFeedback.message} />
            )}

            {
                loading ? (
                    <p className="empty-state projects-empty-state">Projeler yükleniyor...</p>
                ) : sectionFeedback?.type === "error" ? (
                    <InlineFeedback type={sectionFeedback.type} message={sectionFeedback.message} />
                ) : projects.length === 0 ? (
                    <p className="empty-state projects-empty-state">Henüz erişebileceğiniz proje yok.</p>
                ) : (
                    <section className="cards-grid projects-grid">
                        {
                            projects.map((project) => (
                                <article className="data-card project-card" key={project.id}>
                                    <ProjectCard
                                        projectName={project.projectName}
                                        teamId={project.teamId}
                                        teamName={project.teamName}
                                        teamProject={project.teamProject}
                                    />

                                    <p className="card-description">{project.description}</p>

                                    <div className="meta-grid">
                                        <span>
                                            <small>Başlangıç</small>
                                            {project.startDate || "-"}
                                        </span>
                                        <span>
                                            <small>Bitiş</small>
                                            {project.endDate || "-"}
                                        </span>
                                    </div>

                                    <div className="button-row">
                                        <button
                                            className="button button-primary"
                                            onClick={() => navigate(`/project/${project.id}`)}
                                        >
                                            Görevleri Gör
                                        </button>

                                        {
                                            canManageProject(project) && (
                                                <>
                                                    <button
                                                        className="button button-secondary"
                                                        onClick={() => navigate(`/edit-project/${project.id}`)}
                                                    >
                                                        Düzenle
                                                    </button>

                                                    <button
                                                        className="button button-danger"
                                                        onClick={() => {
                                                            setDeleteFeedback("");
                                                            setProjectToDelete(project);
                                                        }}
                                                    >
                                                        Sil
                                                    </button>
                                                </>
                                            )
                                        }
                                    </div>
                                </article>
                            ))
                        }
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
