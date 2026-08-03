import ProjectCard from "../components/ProjectCard";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "../api";
import { useToast } from "../context/toast";
import type { Project } from "../types/project";
import { canManageTeamProjects, type TeamMember, type TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";

type StoredUser = {
    id: number;
}

function Projects() {
    const { showToast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [teamRoles, setTeamRoles] = useState<Record<number, TeamRole | undefined>>({});
    const [loading, setLoading] = useState(true);
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
                throw new Error(await parseApiError(response, "Projeler yüklenemedi"));
            }

            const data: unknown = await response.json();
            const accessibleProjects: Project[] = Array.isArray(data) ? data : [];
            setProjects(accessibleProjects);
            await loadTeamRoles(accessibleProjects);
        } catch (error) {
            showToast({
                type: "error",
                message: getErrorMessage(error, "Projeler yüklenemedi")
            });
            setProjects([]);
            setTeamRoles({});
        } finally {
            setLoading(false);
        }
    }, [loadTeamRoles, showToast]);

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

    async function deleteProject(id: number) {
        const response = await apiFetch(`/projects/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showToast({
                type: "error",
                message: await parseApiError(response, "Proje silinemedi")
            });
            return;
        }

        const data = await response.text();
        showToast({
            type: "success",
            message: data || "Proje başarıyla silindi."
        });
        setProjects(projects.filter(project => project.id !== id));
    }

    return (
        <main className="page-shell">
            <section className="page-header">
                <div>
                    <span className="eyebrow">Projeler</span>
                    <h1>Projelerim</h1>
                    <p>Aktif proje portföyünü, ekipleri ve tarih aralıklarını takip et.</p>
                </div>

                <Link to="/create-project">
                    <button className="button button-primary">Yeni Proje</button>
                </Link>
            </section>

            {
                loading ? (
                    <p className="empty-state">Projeler yükleniyor...</p>
                ) : projects.length === 0 ? (
                    <p className="empty-state">Henüz erişebileceğiniz proje yok.</p>
                ) : (
                    <section className="cards-grid">
                        {
                            projects.map((project) => (
                                <article className="data-card project-card" key={project.id}>
                                    <ProjectCard
                                        projectName={project.projectName}
                                        teamId={project.teamId}
                                        teamName={project.teamName}
                                        teamProject={project.teamProject}
                                        taskCount={0}
                                    />

                                    <p className="card-description">{project.description}</p>

                                    <div className="meta-grid">
                                        <span>Başlangıç: {project.startDate || "-"}</span>
                                        <span>Bitiş: {project.endDate || "-"}</span>
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
                                                        onClick={() => deleteProject(project.id)}
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
        </main>
    );
}

export default Projects;
