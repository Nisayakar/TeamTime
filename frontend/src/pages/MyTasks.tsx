import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { Badge, Button, EmptyState, LoadingState, type BadgeVariant } from "../components/ui";
import InlineFeedback from "../components/ui/InlineFeedback";
import type { AssignmentStatus, Task, TaskPriority, TaskStatus } from "../types/task";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import "../dashboard-v2.css";

type AssignmentFilter = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED";
type TaskStatusFilter = "ALL" | TaskStatus;
type PriorityFilter = "ALL" | TaskPriority;
type DueFilter = "ALL" | "OVERDUE" | "TODAY" | "UPCOMING" | "NO_DATE";

type RejectAssignmentState = {
    task: Task;
    reason: string;
    error: string;
    submitting: boolean;
};

function MyTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState("");
    const [search, setSearch] = useState("");
    const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("ALL");
    const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>(() => {
        if (typeof window !== "undefined") {
            const queryParams = new URLSearchParams(window.location.search);
            const statusParam = queryParams.get("status");
            if (statusParam === "DEVAM_EDIYOR" || statusParam === "BEKLIYOR" || statusParam === "TAMAMLANDI") {
                return statusParam as TaskStatusFilter;
            }
        }
        return "ALL";
    });
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
    const [assignmentActionTaskId, setAssignmentActionTaskId] = useState<number | null>(null);
    const [rejectAssignment, setRejectAssignment] = useState<RejectAssignmentState | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const [dueFilter, setDueFilter] = useState<DueFilter>(() => {
        const queryParams = new URLSearchParams(location.search);
        return queryParams.get("due") === "overdue" ? "OVERDUE" : "ALL";
    });

    useEffect(() => {
        loadMyTasks();
    }, []);

    async function loadMyTasks() {
        setLoading(true);
        setError("");

        try {
            const response = await apiFetch("/tasks/my");

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Görevler yüklenemedi."));
            }

            const data: unknown = await response.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (loadError) {
            setError(getErrorMessage(loadError, "Görevler yüklenemedi."));
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }

    const summary = useMemo(() => ({
        total: tasks.length,
        pending: tasks.filter(task => task.assignmentStatus === "PENDING").length,
        accepted: tasks.filter(task => task.assignmentStatus === "ACCEPTED").length,
        overdue: tasks.filter(isTaskOverdue).length
    }), [tasks]);

    const filteredTasks = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

        return tasks.filter(task => {
            if (normalizedSearch) {
                const title = task.title.toLocaleLowerCase("tr-TR");
                const projectName = (task.projectName ?? "").toLocaleLowerCase("tr-TR");

                if (!title.includes(normalizedSearch) && !projectName.includes(normalizedSearch)) {
                    return false;
                }
            }

            if (assignmentFilter !== "ALL" && task.assignmentStatus !== assignmentFilter) {
                return false;
            }

            if (statusFilter !== "ALL" && task.status !== statusFilter) {
                return false;
            }

            if (priorityFilter !== "ALL" && task.priority !== priorityFilter) {
                return false;
            }

            if (dueFilter !== "ALL" && !matchesDueFilter(task, dueFilter)) {
                return false;
            }

            return true;
        });
    }, [assignmentFilter, dueFilter, priorityFilter, search, statusFilter, tasks]);

    async function acceptTaskAssignment(task: Task) {
        setAssignmentActionTaskId(task.id);
        setFeedback("");
        setError("");

        try {
            const response = await apiFetch(`/tasks/${task.id}/assignment/accept`, {
                method: "POST"
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Görev ataması kabul edilemedi."));
            }

            const updatedTask = await response.json() as Task;
            updateTaskState(updatedTask);
            setFeedback("Görev ataması kabul edildi.");
        } catch (acceptError) {
            setError(getErrorMessage(acceptError, "Görev ataması kabul edilemedi."));
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
        setFeedback("");
        setError("");

        try {
            const response = await apiFetch(`/tasks/${rejectAssignment.task.id}/assignment/reject`, {
                method: "POST",
                body: JSON.stringify({ reason })
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Görev ataması reddedilemedi."));
            }

            const updatedTask = await response.json() as Task;
            updateTaskState(updatedTask);
            setRejectAssignment(null);
            setFeedback("Görev ataması reddedildi.");
        } catch (rejectError) {
            setRejectAssignment({
                ...rejectAssignment,
                submitting: false,
                error: getErrorMessage(rejectError, "Görev ataması reddedilemedi.")
            });
        }
    }

    function updateTaskState(updatedTask: Task) {
        setTasks(currentTasks =>
            currentTasks.map(task => task.id === updatedTask.id ? updatedTask : task)
        );
    }

    return (
        <main className="dashboard-page my-tasks-page">
            <header className="dashboard-header my-tasks-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-header-title">Görevlerim</h1>
                    <p className="dashboard-header-subtitle">
                        Size atanan görevleri, durumlarını ve son tarihlerini takip edin.
                    </p>
                </div>
            </header>

            <section className="dashboard-v2-status-grid my-tasks-summary" aria-label="Görevlerim özeti">
                <div className="dashboard-v2-status-card">
                    <div className="dashboard-v2-status-card-header">
                        <div className="dashboard-v2-status-icon-wrap primary">
                            <TaskIcon />
                        </div>
                    </div>
                    <div>
                        <span className="dashboard-v2-status-main-val">{summary.total}</span>
                        <span className="dashboard-v2-status-main-lbl">Toplam Atanan</span>
                    </div>
                </div>
                
                <div className="dashboard-v2-status-card">
                    <div className="dashboard-v2-status-card-header">
                        <div className="dashboard-v2-status-icon-wrap warning">
                            <ClockIcon />
                        </div>
                    </div>
                    <div>
                        <span className="dashboard-v2-status-main-val">{summary.pending}</span>
                        <span className="dashboard-v2-status-main-lbl">Kabul Bekleyen</span>
                    </div>
                </div>

                <div className="dashboard-v2-status-card">
                    <div className="dashboard-v2-status-card-header">
                        <div className="dashboard-v2-status-icon-wrap success">
                            <CheckIcon />
                        </div>
                    </div>
                    <div>
                        <span className="dashboard-v2-status-main-val">{summary.accepted}</span>
                        <span className="dashboard-v2-status-main-lbl">Kabul Edilen</span>
                    </div>
                </div>

                <div className="dashboard-v2-status-card">
                    <div className="dashboard-v2-status-card-header">
                        <div className="dashboard-v2-status-icon-wrap danger">
                            <WarningIcon />
                        </div>
                    </div>
                    <div>
                        <span className="dashboard-v2-status-main-val">{summary.overdue}</span>
                        <span className="dashboard-v2-status-main-lbl">Gecikmiş</span>
                    </div>
                </div>
            </section>

            {feedback && <InlineFeedback type="success" message={feedback} />}

            <section className="dashboard-section my-tasks-section">
                <div className="dashboard-section-header">
                    <div className="dashboard-section-titles">
                        <h2 className="dashboard-section-title">Atanan Görevler</h2>
                    </div>
                </div>

                <div className="my-tasks-filter-panel" aria-label="Görev filtreleri">
                    <label>
                        <span className="eyebrow">Arama</span>
                        <input
                            className="ghost-input"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Görev veya proje ara"
                        />
                    </label>
                    <label>
                        <span className="eyebrow">Atama</span>
                        <select className="ghost-input" value={assignmentFilter} onChange={event => setAssignmentFilter(event.target.value as AssignmentFilter)}>
                            <option value="ALL">Tümü</option>
                            <option value="PENDING">Kabul Bekliyor</option>
                            <option value="ACCEPTED">Kabul Edildi</option>
                            <option value="REJECTED">Reddedildi</option>
                        </select>
                    </label>
                    <label>
                        <span className="eyebrow">Görev Durumu</span>
                        <select className="ghost-input" value={statusFilter} onChange={event => setStatusFilter(event.target.value as TaskStatusFilter)}>
                            <option value="ALL">Tümü</option>
                            <option value="BEKLIYOR">Bekliyor</option>
                            <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                            <option value="TAMAMLANDI">Tamamlandı</option>
                        </select>
                    </label>
                    <label>
                        <span className="eyebrow">Öncelik</span>
                        <select className="ghost-input" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value as PriorityFilter)}>
                            <option value="ALL">Tümü</option>
                            <option value="LOW">Düşük</option>
                            <option value="MEDIUM">Orta</option>
                            <option value="HIGH">Yüksek</option>
                            <option value="URGENT">Acil</option>
                        </select>
                    </label>
                    <label>
                        <span className="eyebrow">Son Tarih</span>
                        <select className="ghost-input" value={dueFilter} onChange={event => setDueFilter(event.target.value as DueFilter)}>
                            <option value="ALL">Tümü</option>
                            <option value="OVERDUE">Gecikmiş</option>
                            <option value="TODAY">Bugün</option>
                            <option value="UPCOMING">Yaklaşan</option>
                            <option value="NO_DATE">Tarihsiz</option>
                        </select>
                    </label>
                </div>

                {loading ? (
                    <LoadingState message="Görevler yükleniyor..." />
                ) : error ? (
                    <InlineFeedback type="error" message={error} />
                ) : tasks.length === 0 ? (
                    <EmptyState
                        icon={<TaskIcon />}
                        title="Size atanmış görev bulunmuyor."
                        message="Bir takım projesinde size görev atandığında burada görüntülenir."
                    />
                ) : filteredTasks.length === 0 ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="Seçilen kriterlere uygun görev bulunamadı."
                    />
                ) : (
                    <div className="my-tasks-grid">
                        {filteredTasks.map(task => (
                            <article className="my-task-card" key={task.id}>
                                <header className="my-task-card-header">
                                    <div className="my-task-title-line">
                                        <h3>{task.title}</h3>
                                        {isTaskOverdue(task) && <Badge variant="danger">Gecikmiş</Badge>}
                                    </div>
                                    <p className="my-task-project">{task.projectName ?? "Proje bilgisi yok"}</p>
                                </header>
                                
                                <div className="my-task-card-body">
                                    {task.description && <p className="my-task-description">{task.description}</p>}
                                    
                                    <div className="my-task-meta-grid">
                                        <Badge variant={getStatusBadgeVariant(task.status)}>
                                            {getStatusLabel(task.status)}
                                        </Badge>
                                        <Badge variant={getPriorityBadgeVariant(task.priority)}>
                                            {getPriorityLabel(task.priority)}
                                        </Badge>
                                        <Badge variant={getAssignmentBadgeVariant(task.assignmentStatus)}>
                                            {getAssignmentStatusLabel(task.assignmentStatus)}
                                        </Badge>
                                        <span className="my-task-date">{formatDate(task.dueDate)}</span>
                                    </div>

                                    {task.assignmentStatus === "REJECTED" && task.rejectionReason && (
                                        <div className="my-task-reason-box">
                                            <strong>Mazeret</strong>
                                            <p>{task.rejectionReason}</p>
                                        </div>
                                    )}
                                </div>

                                <footer className="my-task-card-footer">
                                    <div className="my-task-actions">
                                        {task.projectId && (
                                            <Button variant="secondary" size="sm" onClick={() => navigate(`/project/${task.projectId}`)}>
                                                Projeye Git
                                            </Button>
                                        )}
                                    {task.assignmentStatus === "PENDING" && (
                                        <>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                loading={assignmentActionTaskId === task.id}
                                                onClick={() => acceptTaskAssignment(task)}
                                            >
                                                Kabul Et
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                disabled={assignmentActionTaskId === task.id}
                                                onClick={() => setRejectAssignment({
                                                    task,
                                                    reason: "",
                                                    error: "",
                                                    submitting: false
                                                })}
                                            >
                                                Reddet
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </footer>
                        </article>
                        ))}
                    </div>
                )}
            </section>

            {rejectAssignment && (
                <div className="confirm-modal-backdrop" role="presentation">
                    <div className="confirm-modal task-reject-modal" role="dialog" aria-modal="true" aria-labelledby="my-task-reject-title">
                        <div className="confirm-modal-copy">
                            <h2 id="my-task-reject-title">Görevi reddet</h2>
                            <p>{rejectAssignment.task.title} için mazeretini yaz.</p>
                        </div>
                        <label htmlFor="my-task-reject-reason">Mazeret</label>
                        <textarea
                            id="my-task-reject-reason"
                            value={rejectAssignment.reason}
                            onChange={event => setRejectAssignment({
                                ...rejectAssignment,
                                reason: event.target.value,
                                error: ""
                            })}
                            maxLength={500}
                            rows={5}
                        />
                        <span className="form-helper">{rejectAssignment.reason.length}/500</span>
                        {rejectAssignment.error && (
                            <InlineFeedback type="error" message={rejectAssignment.error} />
                        )}
                        <div className="confirm-modal-actions">
                            <button
                                type="button"
                                className="button button-secondary"
                                disabled={rejectAssignment.submitting}
                                onClick={() => setRejectAssignment(null)}
                            >
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                className="button button-danger"
                                disabled={rejectAssignment.submitting}
                                onClick={submitRejectAssignment}
                            >
                                {rejectAssignment.submitting ? "Reddediliyor..." : "Görevi Reddet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function matchesDueFilter(task: Task, filter: DueFilter) {
    if (filter === "NO_DATE") {
        return task.dueDate === null;
    }

    if (!task.dueDate) {
        return false;
    }

    const dueDate = parseDateOnly(task.dueDate);
    const today = startOfToday();

    if (filter === "OVERDUE") {
        return dueDate < today && task.status !== "TAMAMLANDI";
    }

    if (filter === "TODAY") {
        return dueDate.getTime() === today.getTime();
    }

    const upcomingEnd = new Date(today);
    upcomingEnd.setDate(today.getDate() + 7);
    return dueDate > today && dueDate <= upcomingEnd && task.status !== "TAMAMLANDI";
}

function isTaskOverdue(task: Task) {
    if (!task.dueDate || task.status === "TAMAMLANDI") {
        return false;
    }

    return parseDateOnly(task.dueDate) < startOfToday();
}

function parseDateOnly(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function getAssignmentStatusLabel(assignmentStatus: AssignmentStatus) {
    const labels: Record<AssignmentStatus, string> = {
        UNASSIGNED: "Atanmamış",
        PENDING: "Kabul Bekliyor",
        ACCEPTED: "Kabul Edildi",
        REJECTED: "Reddedildi"
    };

    return labels[assignmentStatus];
}

function getAssignmentBadgeVariant(assignmentStatus: AssignmentStatus): BadgeVariant {
    if (assignmentStatus === "ACCEPTED") {
        return "success";
    }

    if (assignmentStatus === "REJECTED") {
        return "danger";
    }

    if (assignmentStatus === "PENDING") {
        return "warning";
    }

    return "neutral";
}

function getPriorityLabel(priority: TaskPriority) {
    const labels: Record<TaskPriority, string> = {
        LOW: "Düşük",
        MEDIUM: "Orta",
        HIGH: "Yüksek",
        URGENT: "Acil"
    };

    return labels[priority];
}

function getPriorityBadgeVariant(priority: TaskPriority): BadgeVariant {
    if (priority === "URGENT") {
        return "danger";
    }

    if (priority === "HIGH") {
        return "warning";
    }

    if (priority === "MEDIUM") {
        return "info";
    }

    return "neutral";
}

function getStatusLabel(status: TaskStatus) {
    const labels: Record<TaskStatus, string> = {
        BEKLIYOR: "Bekliyor",
        DEVAM_EDIYOR: "Devam Ediyor",
        TAMAMLANDI: "Tamamlandı"
    };

    return labels[status];
}

function getStatusBadgeVariant(status: TaskStatus): BadgeVariant {
    if (status === "TAMAMLANDI") {
        return "success";
    }

    if (status === "DEVAM_EDIYOR") {
        return "warning";
    }

    return "info";
}

function formatDate(value: string | null) {
    if (!value) {
        return "Tarihsiz";
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function TaskIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}

function ClockIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
}

function CheckIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>;
}

function WarningIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>;
}

function SearchIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
}

export default MyTasks;
