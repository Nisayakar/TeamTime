import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "../api";
import type { Project } from "../types/project";
import type { Task, TaskPriority, TaskStatus } from "../types/task";
import { canManageTeamProjects, type TeamMember, type TeamRole } from "../types/team";

type StoredUser = {
    id: number;
}

function ProjectDetails() {
    const { id } = useParams();

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<TaskStatus>("BEKLIYOR");
    const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
    const [dueDate, setDueDate] = useState("");
    const [editId, setEditId] = useState<number | null>(null);
    const [message, setMessage] = useState("");
    const [savingTask, setSavingTask] = useState(false);
    const [currentTeamRole, setCurrentTeamRole] = useState<TeamRole | undefined>();
    const [loadingProject, setLoadingProject] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(true);

    const canMutateTasks = project
        ? !project.teamProject || canManageTeamProjects(currentTeamRole)
        : false;

    useEffect(() => {
        loadProject();
        getTasks();
    }, [id]);

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

    function showMessage(text: string) {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
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

    async function loadProject() {
        if (!id) {
            setLoadingProject(false);
            return;
        }

        setLoadingProject(true);

        try {
            const response = await apiFetch(`/projects/${id}`);

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Proje yüklenemedi"));
            }

            const data: Project = await response.json();
            setProject(data);

            if (data.teamProject && data.teamId !== null) {
                await loadTeamRole(data.teamId);
            }
        } catch (error) {
            setProject(null);
            showMessage(error instanceof Error ? error.message : "Proje yüklenemedi");
        } finally {
            setLoadingProject(false);
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

    async function getTasks() {
        if (!id) {
            setLoadingTasks(false);
            return;
        }

        setLoadingTasks(true);

        try {
            const response = await apiFetch(`/tasks/project/${id}`);

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Görevler yüklenemedi"));
            }

            const data: unknown = await response.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) {
            setTasks([]);
            showMessage(error instanceof Error ? error.message : "Görevler yüklenemedi");
        } finally {
            setLoadingTasks(false);
        }
    }

    async function saveTask() {
        if (!canMutateTasks) {
            showMessage("Bu işlem için yetkiniz yok");
            return;
        }

        if (title.trim() === "") {
            showMessage("Görev başlığı boş olamaz");
            return;
        }

        const task = {
            title,
            description,
            status,
            priority,
            dueDate: dueDate || null
        };

        const url = editId ? `/tasks/${editId}` : `/tasks/${id}`;
        const method = editId ? "PUT" : "POST";

        setSavingTask(true);

        try {
            const response = await apiFetch(url, {
                method,
                body: JSON.stringify(task)
            });

            if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Görev kaydedilemedi"));
            }

            await response.text();
            showMessage(editId ? "Görev başarıyla güncellendi" : "Görev başarıyla oluşturuldu");
            clearForm();
            getTasks();
        } catch (error) {
            showMessage(error instanceof Error ? error.message : "Görev kaydedilemedi");
        } finally {
            setSavingTask(false);
        }
    }

    async function deleteTask(taskId: number) {
        if (!canMutateTasks) {
            showMessage("Bu işlem için yetkiniz yok");
            return;
        }

        const response = await apiFetch(`/tasks/${taskId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showMessage(await readErrorMessage(response, "Görev silinemedi"));
            return;
        }

        const data = await response.text();
        showMessage(data);
        getTasks();
    }

    function editTask(task: Task) {
        if (!canMutateTasks) {
            return;
        }

        setEditId(task.id);
        setTitle(task.title);
        setDescription(task.description || "");
        setStatus(task.status);
        setPriority(task.priority);
        setDueDate(task.dueDate || "");
    }

    function clearForm() {
        setTitle("");
        setDescription("");
        setStatus("BEKLIYOR");
        setPriority("MEDIUM");
        setDueDate("");
        setEditId(null);
    }

    function getStatusClass(taskStatus: TaskStatus) {
        if (taskStatus === "TAMAMLANDI") {
            return "badge badge-green";
        }

        if (taskStatus === "DEVAM_EDIYOR") {
            return "badge badge-blue";
        }

        return "badge badge-warning";
    }

    function getStatusLabel(taskStatus: TaskStatus) {
        if (taskStatus === "TAMAMLANDI") {
            return "Tamamlandı";
        }

        if (taskStatus === "DEVAM_EDIYOR") {
            return "Devam Ediyor";
        }

        return "Bekliyor";
    }

    function getPriorityLabel(taskPriority: TaskPriority) {
        if (taskPriority === "LOW") {
            return "Düşük";
        }

        if (taskPriority === "HIGH") {
            return "Yüksek";
        }

        if (taskPriority === "URGENT") {
            return "Acil";
        }

        return "Orta";
    }

    function getPriorityClass(taskPriority: TaskPriority) {
        if (taskPriority === "LOW") {
            return "badge badge-green";
        }

        if (taskPriority === "HIGH") {
            return "badge badge-purple";
        }

        if (taskPriority === "URGENT") {
            return "badge badge-warning";
        }

        return "badge badge-blue";
    }

    function formatDate(value: string | null) {
        if (!value) {
            return "Belirlenmedi";
        }

        return new Intl.DateTimeFormat("tr-TR", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(new Date(value));
    }

    function getProjectScopeLabel() {
        if (!project) {
            return "";
        }

        return project.teamProject
            ? project.teamName || "Takım Projesi"
            : "Kişisel Proje";
    }

    return (
        <main className="page-shell">
            {
                message &&
                <div className="message-box">
                    {message}
                </div>
            }

            <section className="page-header">
                <div>
                    <span className="eyebrow">Proje</span>
                    <h1>{project?.projectName || "Proje Detayları"}</h1>
                    <p>{loadingProject ? "Proje bilgileri yükleniyor..." : getProjectScopeLabel()}</p>
                </div>
            </section>

            <section className="content-grid two-columns">
                {
                    canMutateTasks ? (
                        <div className="panel">
                            <div className="section-heading">
                                <span className="eyebrow">Görev formu</span>
                                <h2>{editId ? "Görevi Güncelle" : "Yeni Görev"}</h2>
                            </div>

                            <div className="stacked-form">
                                <label>Görev başlığı</label>
                                <input
                                    placeholder="Görev başlığı"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />

                                <label>Açıklama</label>
                                <textarea
                                    placeholder="Açıklama"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />

                                <label>Durum</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                                >
                                    <option value="BEKLIYOR">Bekliyor</option>
                                    <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                                    <option value="TAMAMLANDI">Tamamlandı</option>
                                </select>

                                <label>Öncelik</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                >
                                    <option value="LOW">Düşük</option>
                                    <option value="MEDIUM">Orta</option>
                                    <option value="HIGH">Yüksek</option>
                                    <option value="URGENT">Acil</option>
                                </select>

                                <label>Son Tarih</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />

                                <div className="button-row">
                                    <button className="button button-primary" onClick={saveTask} disabled={savingTask}>
                                        {savingTask ? "Kaydediliyor..." : editId ? "Güncelle" : "Görev Ekle"}
                                    </button>

                                    <button className="button button-secondary" onClick={clearForm} disabled={savingTask}>
                                        Temizle
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="panel">
                            <div className="section-heading">
                                <span className="eyebrow">Görev formu</span>
                                <h2>Görüntüleme Modu</h2>
                            </div>
                            <p className="empty-state">Bu takım projesindeki görevleri görüntüleyebilirsiniz.</p>
                        </div>
                    )
                }

                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Akış</span>
                        <h2>Görevler</h2>
                    </div>

                    {
                        loadingTasks ? (
                            <p className="empty-state">Görevler yükleniyor...</p>
                        ) : tasks.length === 0 ? (
                            <p className="empty-state">Bu projede henüz görev yok.</p>
                        ) : (
                            tasks.map(task => (
                                <div className="task-card" key={task.id}>
                                    <div>
                                        <h3>{task.title}</h3>
                                        <p>{task.description}</p>
                                    </div>

                                    <span className={getStatusClass(task.status)}>
                                        {getStatusLabel(task.status)}
                                    </span>

                                    <div className="task-meta-row">
                                        <span className={getPriorityClass(task.priority)}>
                                            {getPriorityLabel(task.priority)}
                                        </span>
                                        <span className={task.overdue ? "badge badge-warning" : "badge badge-blue"}>
                                            Son Tarih: {formatDate(task.dueDate)}
                                        </span>
                                        {
                                            task.overdue && (
                                                <span className="badge badge-warning">Gecikmiş</span>
                                            )
                                        }
                                    </div>

                                    {
                                        canMutateTasks && (
                                            <div className="button-row">
                                                <button className="button button-secondary" onClick={() => editTask(task)}>
                                                    Düzenle
                                                </button>

                                                <button className="button button-danger" onClick={() => deleteTask(task.id)}>
                                                    Sil
                                                </button>
                                            </div>
                                        )
                                    }
                                </div>
                            ))
                        )
                    }
                </div>
            </section>
        </main>
    );
}

export default ProjectDetails;
