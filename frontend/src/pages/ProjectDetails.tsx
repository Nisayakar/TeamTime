import { useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getStoredUser } from "../api";
import type { Project } from "../types/project";
import type { Task, TaskPriority, TaskStatus } from "../types/task";
import { canManageTeamProjects, type TeamMember, type TeamRole } from "../types/team";

type StoredUser = {
    id: number;
}

type StatusFilter = "ALL" | TaskStatus;
type PriorityFilter = "ALL" | TaskPriority;
type DueDateFilter = "ALL" | "OVERDUE" | "TODAY" | "UPCOMING" | "NO_DATE";
type SortOption = "NEWEST" | "OLDEST" | "DUE_DATE_ASC" | "PRIORITY_DESC" | "PRIORITY_ASC" | "TITLE_ASC";

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
    const [taskSearch, setTaskSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
    const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("ALL");
    const [sortOption, setSortOption] = useState<SortOption>("NEWEST");

    const canMutateTasks = project
        ? !project.teamProject || canManageTeamProjects(currentTeamRole)
        : false;

    const hasActiveTaskFilters = taskSearch.trim() !== ""
        || statusFilter !== "ALL"
        || priorityFilter !== "ALL"
        || dueDateFilter !== "ALL"
        || sortOption !== "NEWEST";

    const filteredTasks = useMemo(() => {
        const normalizedSearch = taskSearch.trim().toLocaleLowerCase("tr-TR");
        const today = getLocalDateValue();

        return tasks
            .filter(task => {
                if (normalizedSearch === "") {
                    return true;
                }

                return task.title.toLocaleLowerCase("tr-TR").includes(normalizedSearch)
                    || (task.description || "").toLocaleLowerCase("tr-TR").includes(normalizedSearch);
            })
            .filter(task => statusFilter === "ALL" || task.status === statusFilter)
            .filter(task => priorityFilter === "ALL" || task.priority === priorityFilter)
            .filter(task => {
                if (dueDateFilter === "ALL") {
                    return true;
                }

                if (dueDateFilter === "OVERDUE") {
                    return task.overdue;
                }

                if (dueDateFilter === "TODAY") {
                    return task.dueDate === today;
                }

                if (dueDateFilter === "UPCOMING") {
                    return task.dueDate !== null && task.dueDate > today && task.status !== "TAMAMLANDI";
                }

                return task.dueDate === null;
            })
            .slice()
            .sort((firstTask, secondTask) => compareTasks(firstTask, secondTask, sortOption));
    }, [dueDateFilter, priorityFilter, sortOption, statusFilter, taskSearch, tasks]);

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

    const showMessage = useCallback((text: string) => {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    }, []);

    const readErrorMessage = useCallback(async (response: Response, fallbackMessage = "İşlem tamamlanamadı") => {
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
    }, [id, loadTeamRole, readErrorMessage, showMessage]);

    const getTasks = useCallback(async () => {
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
    }, [id, readErrorMessage, showMessage]);

    useEffect(() => {
        loadProject();
        getTasks();
    }, [getTasks, loadProject]);

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

    function resetTaskFilters() {
        setTaskSearch("");
        setStatusFilter("ALL");
        setPriorityFilter("ALL");
        setDueDateFilter("ALL");
        setSortOption("NEWEST");
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

                    <div className="task-filter-panel" aria-label="Görev filtreleri">
                        <div className="task-filter-grid">
                            <div className="field">
                                <input
                                    id="task-search"
                                    type="search"
                                    placeholder="Başlık veya açıklama ara"
                                    value={taskSearch}
                                    onChange={(event) => setTaskSearch(event.target.value)}
                                />
                                <label htmlFor="task-search">Görev ara</label>
                            </div>

                            <div className="field">
                                <select
                                    id="task-status-filter"
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                                >
                                    <option value="ALL">Tümü</option>
                                    <option value="BEKLIYOR">Bekliyor</option>
                                    <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                                    <option value="TAMAMLANDI">Tamamlandı</option>
                                </select>
                                <label htmlFor="task-status-filter">Durum</label>
                            </div>

                            <div className="field">
                                <select
                                    id="task-priority-filter"
                                    value={priorityFilter}
                                    onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
                                >
                                    <option value="ALL">Tümü</option>
                                    <option value="LOW">Düşük</option>
                                    <option value="MEDIUM">Orta</option>
                                    <option value="HIGH">Yüksek</option>
                                    <option value="URGENT">Acil</option>
                                </select>
                                <label htmlFor="task-priority-filter">Öncelik</label>
                            </div>

                            <div className="field">
                                <select
                                    id="task-due-date-filter"
                                    value={dueDateFilter}
                                    onChange={(event) => setDueDateFilter(event.target.value as DueDateFilter)}
                                >
                                    <option value="ALL">Tümü</option>
                                    <option value="OVERDUE">Gecikmiş</option>
                                    <option value="TODAY">Bugün</option>
                                    <option value="UPCOMING">Yaklaşan</option>
                                    <option value="NO_DATE">Tarihsiz</option>
                                </select>
                                <label htmlFor="task-due-date-filter">Son tarih</label>
                            </div>

                            <div className="field">
                                <select
                                    id="task-sort"
                                    value={sortOption}
                                    onChange={(event) => setSortOption(event.target.value as SortOption)}
                                >
                                    <option value="NEWEST">En Yeni</option>
                                    <option value="OLDEST">En Eski</option>
                                    <option value="DUE_DATE_ASC">Son Tarih Yakın</option>
                                    <option value="PRIORITY_DESC">Öncelik Yüksek</option>
                                    <option value="PRIORITY_ASC">Öncelik Düşük</option>
                                    <option value="TITLE_ASC">Başlık A-Z</option>
                                </select>
                                <label htmlFor="task-sort">Sıralama</label>
                            </div>
                        </div>

                        {
                            hasActiveTaskFilters && (
                                <button className="button button-secondary" type="button" onClick={resetTaskFilters}>
                                    Filtreleri Temizle
                                </button>
                            )
                        }
                    </div>

                    {
                        loadingTasks ? (
                            <p className="empty-state">Görevler yükleniyor...</p>
                        ) : tasks.length === 0 ? (
                            <p className="empty-state">Henüz görev bulunmuyor.</p>
                        ) : filteredTasks.length === 0 ? (
                            <p className="empty-state">Seçilen kriterlere uygun görev bulunamadı.</p>
                        ) : (
                            filteredTasks.map(task => (
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

function getLocalDateValue() {
    const now = new Date();
    const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return offsetDate.toISOString().slice(0, 10);
}

function compareTasks(firstTask: Task, secondTask: Task, sortOption: SortOption) {
    if (sortOption === "OLDEST") {
        return getDateTime(firstTask.createdAt) - getDateTime(secondTask.createdAt);
    }

    if (sortOption === "DUE_DATE_ASC") {
        return compareDueDates(firstTask, secondTask);
    }

    if (sortOption === "PRIORITY_DESC") {
        return getPriorityWeight(secondTask.priority) - getPriorityWeight(firstTask.priority);
    }

    if (sortOption === "PRIORITY_ASC") {
        return getPriorityWeight(firstTask.priority) - getPriorityWeight(secondTask.priority);
    }

    if (sortOption === "TITLE_ASC") {
        return firstTask.title.localeCompare(secondTask.title, "tr-TR", { sensitivity: "base" });
    }

    return getDateTime(secondTask.createdAt) - getDateTime(firstTask.createdAt);
}

function compareDueDates(firstTask: Task, secondTask: Task) {
    if (firstTask.dueDate === null && secondTask.dueDate === null) {
        return getDateTime(secondTask.createdAt) - getDateTime(firstTask.createdAt);
    }

    if (firstTask.dueDate === null) {
        return 1;
    }

    if (secondTask.dueDate === null) {
        return -1;
    }

    const dateComparison = firstTask.dueDate.localeCompare(secondTask.dueDate);

    if (dateComparison !== 0) {
        return dateComparison;
    }

    return getDateTime(secondTask.createdAt) - getDateTime(firstTask.createdAt);
}

function getDateTime(value: string) {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function getPriorityWeight(priority: TaskPriority) {
    const weights: Record<TaskPriority, number> = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        URGENT: 4
    };

    return weights[priority];
}

export default ProjectDetails;
