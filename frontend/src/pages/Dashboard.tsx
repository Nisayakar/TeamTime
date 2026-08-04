import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getStoredUser } from "../api";
import type { Task, TaskPriority, TaskStatus } from "../types/task";
import { Badge, Button, EmptyState, LoadingState, StatCard, type BadgeVariant } from "../components/ui";

type DashboardData = {
    projectCount: number;
    taskCount: number;
    completedTaskCount: number;
    inProgressTaskCount: number;
    teamCount: number;
    overdueTaskCount: number;
    dueTodayTaskCount: number;
    upcomingTaskCount: number;
};

type RecentProject = {
    id: number;
    projectName: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    teamId: number | null;
    teamName: string | null;
    teamProject: boolean;
};

type StoredUser = {
    id: number;
    name: string;
    surname: string;
    email: string;
};

function Dashboard() {
    const [user, setUser] = useState<StoredUser | null>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [recentTasks, setRecentTasks] = useState<Task[]>([]);
    const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
    const [upcomingTasksLoading, setUpcomingTasksLoading] = useState(true);
    const [upcomingTasksError, setUpcomingTasksError] = useState("");
    const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    useEffect(() => {
        apiFetch("/dashboard")
            .then(response => response.json() as Promise<DashboardData>)
            .then(data => {
                setDashboardData(data);
            });
    }, []);

    useEffect(() => {
        apiFetch("/tasks/recent")
            .then(response => response.json())
            .then(data => {
                setRecentTasks(data);
            });
    }, []);

    useEffect(() => {
        setUpcomingTasksLoading(true);
        setUpcomingTasksError("");

        apiFetch("/tasks/upcoming")
            .then(response => response.json() as Promise<Task[]>)
            .then(data => {
                setUpcomingTasks(Array.isArray(data) ? data : []);
            })
            .catch(error => {
                setUpcomingTasksError(getSafeMessage(error, "Yaklaşan görevler yüklenemedi."));
            })
            .finally(() => {
                setUpcomingTasksLoading(false);
            });
    }, []);

    useEffect(() => {
        apiFetch("/projects/recent")
            .then(response => response.json())
            .then(data => {
                setRecentProjects(Array.isArray(data) ? data : []);
            });
    }, []);

    return (
        <main className="dashboard-page">
            <header className="dashboard-header">
                <div className="dashboard-header-content">
                    <h1 className="dashboard-header-title">Hoş geldin, {user?.name ?? ""}</h1>
                    <p className="dashboard-header-subtitle">
                        {dashboardData
                            ? `Bugün ${dashboardData.dueTodayTaskCount} görevin, ${dashboardData.upcomingTaskCount} yaklaşan görevin var.`
                            : "Yükleniyor..."}
                    </p>
                </div>
                <div className="dashboard-header-action">
                    <Button variant="primary" size="lg" onClick={() => navigate("/create-project")}>
                        Yeni Proje Oluştur
                    </Button>
                </div>
            </header>

            <section className="dashboard-stat-grid" aria-label="Genel istatistikler">
                <StatCard
                    label="Toplam Proje"
                    value={dashboardData?.projectCount ?? 0}
                    icon={<FolderIcon />}
                    tone="primary"
                    layout="top"
                />
                <StatCard
                    label="Toplam Görev"
                    value={dashboardData?.taskCount ?? 0}
                    icon={<TaskIcon />}
                    tone="primary"
                    layout="top"
                />
                <StatCard
                    label="Takımlarım"
                    value={dashboardData?.teamCount ?? 0}
                    icon={<GroupIcon />}
                    tone="primary"
                    layout="top"
                />
                <StatCard
                    label="Tamamlanan"
                    value={dashboardData?.completedTaskCount ?? 0}
                    icon={<CheckIcon />}
                    tone="success"
                    layout="top"
                />
                <StatCard
                    label="Devam Eden"
                    value={dashboardData?.inProgressTaskCount ?? 0}
                    icon={<PlayIcon />}
                    tone="warning"
                    layout="top"
                />
                <StatCard
                    label="Gecikmiş Görevler"
                    value={dashboardData?.overdueTaskCount ?? 0}
                    icon={<WarningIcon />}
                    tone="danger"
                    layout="top"
                    className={dashboardData && dashboardData.overdueTaskCount > 0 ? "is-overdue" : ""}
                    hint={dashboardData && dashboardData.overdueTaskCount > 0 ? "görev acil" : undefined}
                />
                <StatCard
                    label="Bugün Bitenler"
                    value={dashboardData?.dueTodayTaskCount ?? 0}
                    icon={<DotIcon />}
                    tone="primary"
                    layout="top"
                />
                <StatCard
                    label="Yaklaşan Görevler"
                    value={dashboardData?.upcomingTaskCount ?? 0}
                    icon={<CalendarIcon />}
                    tone="primary"
                    layout="top"
                />
            </section>

            <div className="dashboard-layout-grid">
                <div className="dashboard-section dashboard-section-full">
                    <div className="dashboard-section-header">
                        <div className="dashboard-section-titles">
                            <h2 className="dashboard-section-title">Son Projeler</h2>
                        </div>
                        <a className="dashboard-section-link" href="#" onClick={e => { e.preventDefault(); navigate("/projects"); }}>
                            Tümünü Gör
                        </a>
                    </div>

                    {recentProjects.length === 0 ? (
                        <EmptyState
                            icon={<FolderIcon />}
                            title="Henüz proje yok"
                            message="Oluşturulan projeler burada görünecek."
                            action={
                                <Button variant="primary" onClick={() => navigate("/create-project")}>
                                    Yeni Proje Oluştur
                                </Button>
                            }
                        />
                    ) : (
                        <div className="dashboard-project-grid">
                            {recentProjects.map(project => (
                                <button
                                    className="dashboard-project-card"
                                    key={project.id}
                                    type="button"
                                    onClick={() => navigate(`/project/${project.id}`)}
                                >
                                    <div className="dashboard-project-card-header">
                                        <span className="dashboard-project-card-title">{project.projectName}</span>
                                        {project.teamProject ? (
                                            <Badge variant="info">{project.teamName ?? "Takım"}</Badge>
                                        ) : (
                                            <Badge variant="neutral">Kişisel</Badge>
                                        )}
                                    </div>
                                    {project.description && (
                                        <p className="dashboard-project-card-desc">{project.description}</p>
                                    )}
                                    <div className="dashboard-project-card-footer">
                                        <span className="dashboard-project-date">
                                            {formatDateRange(project.startDate, project.endDate)}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-section">
                    <div className="dashboard-section-header">
                        <div className="dashboard-section-titles">
                            <h2 className="dashboard-section-title">Son Görevler</h2>
                        </div>
                    </div>

                    {recentTasks.length === 0 ? (
                        <EmptyState
                            icon={<TaskIcon />}
                            title="Henüz görev yok"
                            message="Oluşturulan görevler burada görünecek."
                        />
                    ) : (
                        <div className="dashboard-task-table-wrap">
                            <table className="dashboard-task-table">
                                <thead>
                                    <tr>
                                        <th>Görev Adı</th>
                                        <th>Proje</th>
                                        <th>Öncelik</th>
                                        <th>Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTasks.map(task => (
                                        <tr
                                            key={task.id}
                                            className={task.status === "TAMAMLANDI" ? "is-completed" : ""}
                                            tabIndex={task.projectId ? 0 : -1}
                                            onClick={() => task.projectId && navigate(`/project/${task.projectId}`)}
                                            onKeyDown={e => {
                                                if (task.projectId && (e.key === "Enter" || e.key === " ")) {
                                                    e.preventDefault();
                                                    navigate(`/project/${task.projectId}`);
                                                }
                                            }}
                                        >
                                            <td>
                                                <div className="dashboard-task-title-cell">
                                                    <span className={`dashboard-task-check${task.status === "TAMAMLANDI" ? " is-completed" : ""}`}>
                                                        {task.status === "TAMAMLANDI" ? <CheckIcon size={12} /> : null}
                                                    </span>
                                                    <span className="dashboard-task-title">{task.title}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="dashboard-task-project">
                                                    {task.projectName ?? "—"}
                                                </span>
                                            </td>
                                            <td>
                                                <Badge variant={getPriorityBadgeVariant(task.priority)}>
                                                    {getPriorityLabel(task.priority)}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge variant={getStatusBadgeVariant(task.status)}>
                                                    {getStatusLabel(task.status)}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="dashboard-section">
                    <div className="dashboard-section-header">
                        <div className="dashboard-section-titles">
                            <h2 className="dashboard-section-title">Yaklaşan Görevler</h2>
                        </div>
                    </div>

                    {upcomingTasksLoading ? (
                        <LoadingState message="Yaklaşan görevler yükleniyor..." />
                    ) : upcomingTasksError ? (
                        <EmptyState
                            icon={<WarningIcon />}
                            title={upcomingTasksError}
                        />
                    ) : upcomingTasks.length === 0 ? (
                        <EmptyState
                            icon={<CalendarIcon />}
                            title="Yaklaşan göreviniz bulunmuyor."
                            message="Önümüzdeki dönem için planlanmış göreviniz yok."
                        />
                    ) : (
                        <div className="dashboard-upcoming-list">
                            {upcomingTasks.map(task => {
                                const isUrgent = task.priority === "URGENT" || task.priority === "HIGH";
                                const content = (
                                    <>
                                        <span className="dashboard-upcoming-dot">
                                            <span className={`dashboard-upcoming-dot-marker${isUrgent ? " is-urgent" : ""}`} />
                                            <span className="dashboard-upcoming-item-title">{task.title}</span>
                                        </span>
                                        <span className={`dashboard-upcoming-item-date${isUrgent ? " is-urgent" : ""}`}>
                                            {formatDate(task.dueDate)}
                                        </span>
                                    </>
                                );

                                return task.projectId ? (
                                    <button
                                        className="dashboard-upcoming-item is-clickable"
                                        key={task.id}
                                        type="button"
                                        onClick={() => navigate(`/project/${task.projectId}`)}
                                    >
                                        {content}
                                    </button>
                                ) : (
                                    <div className="dashboard-upcoming-item" key={task.id}>
                                        {content}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

/* ---- Inline SVG icons ---- */

function FolderIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
}

function TaskIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}

function GroupIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

function CheckIcon({ size = 18 }: { size?: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}

function PlayIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}

function WarningIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}

function DotIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="6" /></svg>;
}

function CalendarIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}

/* ---- Label/format helpers ---- */

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

function formatDateRange(startDate: string | null, endDate: string | null) {
    const start = startDate ? formatDate(startDate) : null;
    const end = endDate ? formatDate(endDate) : null;

    if (start && end) {
        return `${start} — ${end}`;
    }

    if (start) {
        return start;
    }

    if (end) {
        return end;
    }

    return "Tarihsiz";
}

function getSafeMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

export default Dashboard;
