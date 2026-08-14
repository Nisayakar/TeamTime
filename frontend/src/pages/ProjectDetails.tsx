import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
import type { Project } from "../types/project";
import type { AssignmentStatus, Task, TaskPriority, TaskStatus } from "../types/task";
import { canManageTeamProjects, type TeamMember, type TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";

type StoredUser = {
    id: number;
}

type RejectAssignmentState = {
    task: Task;
    reason: string;
    error: string;
    submitting: boolean;
}

type StatusFilter = "ALL" | TaskStatus;
type PriorityFilter = "ALL" | TaskPriority;
type DueDateFilter = "ALL" | "OVERDUE" | "TODAY" | "UPCOMING" | "NO_DATE";
type SortOption = "NEWEST" | "OLDEST" | "DUE_DATE_ASC" | "PRIORITY_DESC" | "PRIORITY_ASC" | "TITLE_ASC";

function ProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<TaskStatus>("BEKLIYOR");
    const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
    const [dueDate, setDueDate] = useState("");
    const [assignedUserId, setAssignedUserId] = useState("");
    const [editId, setEditId] = useState<number | null>(null);
    const [savingTask, setSavingTask] = useState(false);
    const [currentTeamRole, setCurrentTeamRole] = useState<TeamRole | undefined>();
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loadingProject, setLoadingProject] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [taskSearch, setTaskSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
    const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("ALL");
    const [sortOption, setSortOption] = useState<SortOption>("NEWEST");
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [assignmentActionTaskId, setAssignmentActionTaskId] = useState<number | null>(null);
    const [rejectAssignment, setRejectAssignment] = useState<RejectAssignmentState | null>(null);
    const [deletingTask, setDeletingTask] = useState(false);
    const [projectFeedback, setProjectFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [taskFormFeedback, setTaskFormFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [taskListFeedback, setTaskListFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [deleteFeedback, setDeleteFeedback] = useState("");

    const canMutateTasks = project
        ? !project.teamProject || canManageTeamProjects(currentTeamRole)
        : false;
    const canAssignTasks = Boolean(project?.teamProject && canManageTeamProjects(currentTeamRole));

    const hasActiveTaskFilters = taskSearch.trim() !== ""
        || statusFilter !== "ALL"
        || priorityFilter !== "ALL"
        || dueDateFilter !== "ALL"
        || sortOption !== "NEWEST";

    const filteredTasks = useMemo(() => {
        const normalizedSearch = taskSearch.trim().toLocaleLowerCase("tr-TR");
        const today = getLocalDateValue();
        const upcomingEndDate = addDaysToDateValue(today, 7);

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
                    return task.dueDate !== null
                        && task.dueDate > today
                        && task.dueDate <= upcomingEndDate
                        && task.status !== "TAMAMLANDI";
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

    const loadTeamRole = useCallback(async (teamId: number) => {
        const currentUserId = getCurrentUserId();

        if (currentUserId === null) {
            setCurrentTeamRole(undefined);
            setTeamMembers([]);
            return;
        }

        const response = await apiFetch(`/teams/${teamId}/members`);

        if (!response.ok) {
            setCurrentTeamRole(undefined);
            setTeamMembers([]);
            return;
        }

        const data: unknown = await response.json();
        const members: TeamMember[] = Array.isArray(data) ? data : [];
        setTeamMembers(members);
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
                if (navigateForInitialLoadError(response.status, navigate)) {
                    return;
                }

                throw new Error(await parseApiError(response, "Proje yüklenemedi"));
            }

            const data: Project = await response.json();
            setProject(data);
            setProjectFeedback(null);

            if (data.teamProject && data.teamId !== null) {
                await loadTeamRole(data.teamId);
            } else {
                setCurrentTeamRole(undefined);
                setTeamMembers([]);
            }
        } catch (error) {
            setProject(null);
            setProjectFeedback({ type: "error", message: getErrorMessage(error, "Proje yüklenemedi") });
        } finally {
            setLoadingProject(false);
        }
    }, [id, loadTeamRole, navigate]);

    const getTasks = useCallback(async () => {
        if (!id) {
            setLoadingTasks(false);
            return;
        }

        setLoadingTasks(true);

        try {
            const response = await apiFetch(`/tasks/project/${id}`);

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Görevler yüklenemedi"));
            }

            const data: unknown = await response.json();
            setTasks(Array.isArray(data) ? data : []);
            setTaskListFeedback(null);
        } catch (error) {
            setTasks([]);
            setTaskListFeedback({ type: "error", message: getErrorMessage(error, "Görevler yüklenemedi") });
        } finally {
            setLoadingTasks(false);
        }
    }, [id]);

    useEffect(() => {
        setCurrentUserId(getCurrentUserId());
        loadProject();
        getTasks();
    }, [getCurrentUserId, getTasks, loadProject]);

    async function saveTask() {
        if (!canMutateTasks) {
            setTaskFormFeedback({ type: "warning", message: "Bu işlem için yetkiniz yok" });
            return;
        }

        if (title.trim() === "") {
            setTaskFormFeedback({ type: "warning", message: "Görev başlığı boş olamaz" });
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
        setTaskFormFeedback(null);

        try {
            const response = await apiFetch(url, {
                method,
                body: JSON.stringify(task)
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Görev kaydedilemedi"));
            }

            const savedTask = await response.json() as Task;

            if (canAssignTasks) {
                await syncTaskAssignee(savedTask.id);
            }

            setTaskFormFeedback({ type: "success", message: editId ? "Görev başarıyla güncellendi." : "Görev başarıyla oluşturuldu." });
            clearForm();
            getTasks();
        } catch (error) {
            setTaskFormFeedback({ type: "error", message: getErrorMessage(error, "Görev kaydedilemedi") });
        } finally {
            setSavingTask(false);
        }
    }

    async function confirmDeleteTask() {
        if (!canMutateTasks) {
            setDeleteFeedback("Bu işlem için yetkiniz yok");
            return;
        }

        if (!taskToDelete || deletingTask) {
            return;
        }

        setDeletingTask(true);

        try {
            const response = await apiFetch(`/tasks/${taskToDelete.id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                setDeleteFeedback(await parseApiError(response, "Görev silinemedi"));
                return;
            }

            const data = await response.text();
            setTaskListFeedback({ type: "success", message: data || "Görev başarıyla silindi." });
            setTaskToDelete(null);
            getTasks();
        } catch (error) {
            setDeleteFeedback(getErrorMessage(error, "Görev silinemedi"));
        } finally {
            setDeletingTask(false);
        }
    }

    async function acceptTaskAssignment(task: Task) {
        setAssignmentActionTaskId(task.id);
        setTaskListFeedback(null);

        try {
            const response = await apiFetch(`/tasks/${task.id}/assignment/accept`, {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Görev ataması kabul edilemedi"));
            }

            setTaskListFeedback({ type: "success", message: "Görev ataması kabul edildi." });
            getTasks();
        } catch (error) {
            setTaskListFeedback({ type: "error", message: getErrorMessage(error, "Görev ataması kabul edilemedi") });
        } finally {
            setAssignmentActionTaskId(null);
        }
    }

    async function submitRejectAssignment() {
        if (!rejectAssignment || rejectAssignment.submitting) {
            return;
        }

        const reason = rejectAssignment.reason.trim();

        if (reason === "") {
            setRejectAssignment({ ...rejectAssignment, error: "Mazeret zorunludur" });
            return;
        }

        if (reason.length > 500) {
            setRejectAssignment({ ...rejectAssignment, error: "Mazeret en fazla 500 karakter olabilir" });
            return;
        }

        setRejectAssignment({ ...rejectAssignment, submitting: true, error: "" });
        setTaskListFeedback(null);

        try {
            const response = await apiFetch(`/tasks/${rejectAssignment.task.id}/assignment/reject`, {
                method: "POST",
                body: JSON.stringify({ reason })
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Görev ataması reddedilemedi"));
            }

            setTaskListFeedback({ type: "success", message: "Görev ataması reddedildi." });
            setRejectAssignment(null);
            getTasks();
        } catch (error) {
            setRejectAssignment({
                ...rejectAssignment,
                submitting: false,
                error: getErrorMessage(error, "Görev ataması reddedilemedi")
            });
        }
    }

    async function syncTaskAssignee(taskId: number) {
        const trimmedAssignee = assignedUserId.trim();

        if (trimmedAssignee === "") {
            const response = await apiFetch(`/tasks/${taskId}/assignee`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Görev ataması güncellenemedi"));
            }

            return;
        }

        const response = await apiFetch(`/tasks/${taskId}/assignee`, {
            method: "PUT",
            body: JSON.stringify({ userId: Number(trimmedAssignee) })
        });

        if (!response.ok) {
            throw new Error(await parseApiError(response, "Görev ataması güncellenemedi"));
        }
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
        setAssignedUserId(task.assignedUserId ? String(task.assignedUserId) : "");
    }

    function clearForm() {
        setTitle("");
        setDescription("");
        setStatus("BEKLIYOR");
        setPriority("MEDIUM");
        setDueDate("");
        setAssignedUserId("");
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

    function getAssignmentStatusLabel(assignmentStatus: AssignmentStatus) {
        if (assignmentStatus === "PENDING") {
            return "Atama Bekliyor";
        }

        if (assignmentStatus === "ACCEPTED") {
            return "Kabul Edildi";
        }

        if (assignmentStatus === "REJECTED") {
            return "Reddedildi";
        }

        return "Atanmamış";
    }

    function getAssignmentStatusClass(assignmentStatus: AssignmentStatus) {
        if (assignmentStatus === "ACCEPTED") {
            return "badge badge-green";
        }

        if (assignmentStatus === "REJECTED") {
            return "badge badge-warning";
        }

        if (assignmentStatus === "PENDING") {
            return "badge badge-purple";
        }

        return "badge badge-blue";
    }

    function canRespondToAssignment(task: Task) {
        return task.assignmentStatus === "PENDING"
            && task.assignedUserId !== null
            && task.assignedUserId === currentUserId;
    }

    function shouldShowRejectionReason(task: Task) {
        return task.assignmentStatus === "REJECTED"
            && (canAssignTasks || task.assignedUserId === currentUserId);
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
        <main className="page-shell app-page project-details-page">
            <section className="page-header app-page-header">
                <div className="app-page-header-copy">
                    <span className="eyebrow">Proje</span>
                    <h1>{project?.projectName || "Proje Detayları"}</h1>
                    <p>{loadingProject ? "Proje bilgileri yükleniyor..." : getProjectScopeLabel()}</p>
                </div>
            </section>
            {projectFeedback && <InlineFeedback type={projectFeedback.type} message={projectFeedback.message} />}

            <section className="content-grid two-columns">
                {
                    canMutateTasks ? (
                        <section className="form-section">
                            <div className="section-heading">
                                <span className="eyebrow">Görev formu</span>
                                <h2>{editId ? "Görevi Güncelle" : "Yeni Görev"}</h2>
                            </div>

                            <div className="stacked-form">
                                <label>Görev başlığı</label>
                                <input
                                    className="ghost-input"
                                    placeholder="Görev başlığı"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />

                                <label style={{ marginTop: "16px", display: "block" }}>Açıklama</label>
                                <textarea
                                    className="ghost-input"
                                    placeholder="Açıklama"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />

                                <label style={{ marginTop: "16px", display: "block" }}>Durum</label>
                                <select
                                    className="ghost-input"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                                >
                                    <option value="BEKLIYOR">Bekliyor</option>
                                    <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                                    <option value="TAMAMLANDI">Tamamlandı</option>
                                </select>

                                <label style={{ marginTop: "16px", display: "block" }}>Öncelik</label>
                                <select
                                    className="ghost-input"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                >
                                    <option value="LOW">Düşük</option>
                                    <option value="MEDIUM">Orta</option>
                                    <option value="HIGH">Yüksek</option>
                                    <option value="URGENT">Acil</option>
                                </select>

                                <label style={{ marginTop: "16px", display: "block" }}>Son Tarih</label>
                                <input
                                    className="ghost-input"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />

                                {
                                    canAssignTasks && (
                                        <>
                                            <label style={{ marginTop: "16px", display: "block" }} htmlFor="task-assignee">Atanan Kişi</label>
                                            <select
                                                className="ghost-input"
                                                id="task-assignee"
                                                value={assignedUserId}
                                                onChange={(e) => setAssignedUserId(e.target.value)}
                                            >
                                                <option value="">Atanmamış</option>
                                                {teamMembers.map(member => (
                                                    <option key={member.userId} value={member.userId}>
                                                        {member.userName}
                                                    </option>
                                                ))}
                                            </select>
                                        </>
                                    )
                                }

                                <div className="button-row" style={{ marginTop: "24px" }}>
                                    <button className="button button-primary" onClick={saveTask} disabled={savingTask}>
                                        {savingTask ? "Kaydediliyor..." : editId ? "Güncelle" : "Görev Ekle"}
                                    </button>

                                    <button className="button button-secondary" onClick={clearForm} disabled={savingTask}>
                                        Temizle
                                    </button>
                                </div>
                                {taskFormFeedback && <InlineFeedback type={taskFormFeedback.type} message={taskFormFeedback.message} />}
                            </div>
                        </section>
                    ) : (
                        <section className="form-section">
                            <div className="section-heading">
                                <span className="eyebrow">Görev formu</span>
                                <h2>Görüntüleme Modu</h2>
                            </div>
                            <p className="empty-state app-empty-state">Bu takım projesindeki görevleri görüntüleyebilirsiniz.</p>
                        </section>
                    )
                }

                <section className="form-section tasks-panel">
                    <div className="section-heading">
                        <span className="eyebrow">Akış</span>
                        <h2>Görevler</h2>
                    </div>

                    <div className="task-filter-panel" aria-label="Görev filtreleri">
                        <div className="task-filter-grid">
                            <div>
                                <label htmlFor="task-search">Görev ara</label>
                                <input
                                    className="ghost-input"
                                    id="task-search"
                                    type="search"
                                    placeholder="Başlık veya açıklama ara"
                                    value={taskSearch}
                                    onChange={(event) => setTaskSearch(event.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="task-status-filter">Durum</label>
                                <select
                                    className="ghost-input"
                                    id="task-status-filter"
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                                >
                                    <option value="ALL">Tümü</option>
                                    <option value="BEKLIYOR">Bekliyor</option>
                                    <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                                    <option value="TAMAMLANDI">Tamamlandı</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="task-priority-filter">Öncelik</label>
                                <select
                                    className="ghost-input"
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
                            </div>
                            <div>
                                <label htmlFor="task-due-date-filter">Son tarih</label>
                                <select
                                    className="ghost-input"
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
                            </div>
                            <div>
                                <label htmlFor="task-sort">Sıralama</label>
                                <select
                                    className="ghost-input"
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
                            <p className="empty-state app-empty-state">Görevler yükleniyor...</p>
                        ) : taskListFeedback?.type === "error" ? (
                            <InlineFeedback type={taskListFeedback.type} message={taskListFeedback.message} />
                        ) : tasks.length === 0 ? (
                            <p className="empty-state app-empty-state">Henüz görev bulunmuyor.</p>
                        ) : filteredTasks.length === 0 ? (
                            <p className="empty-state app-empty-state">Seçilen kriterlere uygun görev bulunamadı.</p>
                        ) : (
                            <>
                                {taskListFeedback && <InlineFeedback type={taskListFeedback.type} message={taskListFeedback.message} />}
                                {filteredTasks.map(task => (
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
                                        project?.teamProject && (
                                            <div className="task-assignment-block">
                                                <div className="task-meta-row">
                                                    <span className="badge badge-blue">
                                                        Atanan: {task.assignedUserName || "Atanmamış"}
                                                    </span>
                                                    <span className={getAssignmentStatusClass(task.assignmentStatus)}>
                                                        {getAssignmentStatusLabel(task.assignmentStatus)}
                                                    </span>
                                                </div>
                                                {
                                                    shouldShowRejectionReason(task) && task.rejectionReason && (
                                                        <p className="task-assignment-reason">
                                                            Mazeret: {task.rejectionReason}
                                                        </p>
                                                    )
                                                }
                                                {
                                                    canRespondToAssignment(task) && (
                                                        <div className="button-row task-assignment-actions">
                                                            <button
                                                                className="button button-primary"
                                                                type="button"
                                                                disabled={assignmentActionTaskId === task.id}
                                                                onClick={() => acceptTaskAssignment(task)}
                                                            >
                                                                {assignmentActionTaskId === task.id ? "İşleniyor..." : "Kabul Et"}
                                                            </button>
                                                            <button
                                                                className="button button-secondary"
                                                                type="button"
                                                                disabled={assignmentActionTaskId === task.id}
                                                                onClick={() => setRejectAssignment({
                                                                    task,
                                                                    reason: "",
                                                                    error: "",
                                                                    submitting: false
                                                                })}
                                                            >
                                                                Reddet
                                                            </button>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        )
                                    }

                                    {
                                        canMutateTasks && (
                                            <div className="button-row">
                                                <button className="button button-secondary" onClick={() => editTask(task)}>
                                                    Düzenle
                                                </button>

                                                <button
                                                    className="button button-danger"
                                                    onClick={() => {
                                                        setDeleteFeedback("");
                                                        setTaskToDelete(task);
                                                    }}
                                                >
                                                    Sil
                                                </button>
                                            </div>
                                        )
                                    }
                                    </div>
                                ))}
                            </>
                        )
                    }
                </section>
            </section>
            <ConfirmModal
                open={taskToDelete !== null}
                title="Görevi sil"
                message={`"${taskToDelete?.title ?? "Bu görev"}" adlı görev kalıcı olarak silinecek. Devam etmek istiyor musunuz?`}
                confirmLabel={deletingTask ? "Siliniyor" : "Sil"}
                variant="danger"
                loading={deletingTask}
                errorMessage={deleteFeedback}
                onConfirm={confirmDeleteTask}
                onCancel={() => {
                    setDeleteFeedback("");
                    setTaskToDelete(null);
                }}
            />
            {
                rejectAssignment && (
                    <div className="confirm-modal-backdrop" role="presentation">
                        <div
                            className="confirm-modal task-reject-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="reject-assignment-title"
                        >
                            <h2 id="reject-assignment-title">Görevi reddet</h2>
                            <p>Bu görevi neden kabul edemediğinizi belirtin.</p>

                            <label htmlFor="reject-assignment-reason">Mazeret</label>
                            <textarea
                                id="reject-assignment-reason"
                                maxLength={500}
                                value={rejectAssignment.reason}
                                onChange={(event) => setRejectAssignment({
                                    ...rejectAssignment,
                                    reason: event.target.value,
                                    error: ""
                                })}
                                placeholder="Mazeret"
                            />
                            <span className="form-helper">{rejectAssignment.reason.length}/500</span>

                            {rejectAssignment.error && (
                                <InlineFeedback type="error" message={rejectAssignment.error} />
                            )}

                            <div className="button-row">
                                <button
                                    className="button button-secondary"
                                    type="button"
                                    disabled={rejectAssignment.submitting}
                                    onClick={() => setRejectAssignment(null)}
                                >
                                    İptal
                                </button>
                                <button
                                    className="button button-danger"
                                    type="button"
                                    disabled={rejectAssignment.submitting}
                                    onClick={submitRejectAssignment}
                                >
                                    {rejectAssignment.submitting ? "Reddediliyor..." : "Görevi Reddet"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </main>
    );
}

function getLocalDateValue() {
    const now = new Date();
    const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return offsetDate.toISOString().slice(0, 10);
}

function addDaysToDateValue(value: string, days: number) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
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
