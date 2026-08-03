import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getStoredUser } from "../api";
import type { Project, ProjectRequest } from "../types/project";
import { canManageTeamProjects, type TeamMember, type TeamRole } from "../types/team";

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

    useEffect(() => {
        loadProject();
    }, [id]);

    const canUpdateProject = project
        ? !project.teamProject || canManageTeamProjects(currentTeamRole)
        : false;

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

    async function readErrorMessage(response: Response, fallbackMessage = "Proje güncellenemedi") {
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
            case 403:
                return "Bu işlem için yetkiniz yok";
            case 404:
                return "İstenen kaynak bulunamadı";
            case 409:
                return "Projenin takım bağlantısı güncelleme sırasında değiştirilemez";
            default:
                return fallbackMessage;
        }
    }

    async function loadProject() {
        if (!id) {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const response = await apiFetch(`/projects/${id}`);

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Proje yüklenemedi"));
            }

            const data: Project = await response.json();
            setProject(data);
            setProjectName(data.projectName || "");
            setDescription(data.description || "");
            setStartDate(data.startDate || "");
            setEndDate(data.endDate || "");

            if (data.teamProject && data.teamId !== null) {
                await loadTeamRole(data.teamId);
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : "Proje yüklenemedi");
            setProject(null);
        } finally {
            setLoading(false);
        }
    }

    async function loadTeamRole(teamId: number) {
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
    }

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

        try {
            const response = await apiFetch(`/projects/${id}`, {
                method: "PUT",
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                alert(await readErrorMessage(response));
                return;
            }

            const data = await response.text();
            alert(data);
            navigate("/projects");
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
                    <h1>Proje Düzenle</h1>
                    <p>Proje bilgilerini güncelle ve takvimini düzenli tut.</p>
                </div>
            </section>

            {
                loading ? (
                    <p className="empty-state">Proje yükleniyor...</p>
                ) : !project ? (
                    <p className="empty-state">Proje bulunamadı.</p>
                ) : (
                    <form className="form-card" onSubmit={updateProject}>
                        <label>Proje Adı</label>
                        <input
                            name="projectName"
                            value={projectName}
                            onChange={(event) => setProjectName(event.target.value)}
                            required
                        />

                        <label>Açıklama</label>
                        <input
                            name="description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />

                        <label>Proje Türü</label>
                        <p className="empty-state">
                            {project.teamProject ? `Takım Projesi: ${project.teamName || "Takım"}` : "Kişisel Proje"}
                        </p>

                        <div className="form-grid two-columns">
                            <div>
                                <label>Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={startDate}
                                    onChange={(event) => setStartDate(event.target.value)}
                                />
                            </div>

                            <div>
                                <label>Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={endDate}
                                    onChange={(event) => setEndDate(event.target.value)}
                                />
                            </div>
                        </div>

                        {
                            canUpdateProject ? (
                                <button className="button button-primary button-full" type="submit" disabled={submitting}>
                                    {submitting ? "Güncelleniyor..." : "Güncelle"}
                                </button>
                            ) : (
                                <p className="empty-state">Bu takım projesini düzenleme yetkiniz yok.</p>
                            )
                        }
                    </form>
                )
            }
        </main>
    );
}

export default EditProject;
