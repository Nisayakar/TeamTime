import ProjectCard from "../components/ProjectCard";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "../api";
import type { Project } from "../types/project";
import { canManageTeamProjects, type TeamMember, type TeamRole } from "../types/team";

type StoredUser = {
    id: number;
}

function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [teamRoles, setTeamRoles] = useState<Record<number, TeamRole | undefined>>({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
    }, []);

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

    async function readErrorMessage(response: Response, fallbackMessage = "İşlem tamamlanamadı") {
        const contentType = response.headers.get("Content-Type") || "";

        if (contentType.includes("application/json")) {
            const data: unknown = await response.json();

            if (data && typeof data === "object") {
                if ("message" in data && typeof data.message === "string") {
                    return data.message;
                }
            }

            return fallbackMessage;
        }

        const message = await response.text();
        return message || fallbackMessage;
    }

    async function loadProjects() {
        setLoading(true);

        try {
            const response = await apiFetch("/projects");

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Projeler yüklenemedi"));
            }

            const data: unknown = await response.json();
            const accessibleProjects: Project[] = Array.isArray(data) ? data : [];
            setProjects(accessibleProjects);
            await loadTeamRoles(accessibleProjects);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Projeler yüklenemedi");
            setProjects([]);
            setTeamRoles({});
        } finally {
            setLoading(false);
        }
    }

    async function loadTeamRoles(accessibleProjects: Project[]) {
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
    }

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
            alert(await readErrorMessage(response, "Proje silinemedi"));
            return;
        }

        const data = await response.text();
        alert(data);
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
