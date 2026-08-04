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
    description: string;
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

    const recentProjectsLoading = false;
    const recentTasksLoading = false;

    return (
        <main className="dashboard-page">
            <section className="dashboard-hero-new">
                <div className="dashboard-hero-content">
                    <span className="dashboard-hero-eyebrow">Dashboard</span>
                    <h1 className="dashboard-hero-title">Hoş Geldin {user?.name ?? ""}</h1>
                    <p className="dashboard-hero-subtitle">Projeler, görevler ve takım akışlarını tek ekranda takip et.</p>
                    {user && <p className="dashboard-hero-email">{user.email}</p>}
                </div>
                <div className="dashboard-hero-action">
                    <Button variant="primary" size="lg" onClick={() => navigate("/create-project")}>
                        Yeni Proje Oluştur
                    </Button>
                </div>
            </section>

            <section className="dashboard-stat-grid" aria-label="Genel istatistikler">
                <StatCard
                    label="Toplam Proje"
                    value={dashboardData?.projectCount ?? 0}
                    icon={<span aria-hidden="true">&#9636;</span>}
                    tone="primary"
                />
                <StatCard
                    label="Toplam Görev"
                    value={dashboardData?.taskCount ?? 0}
                    icon={<span aria-hidden="true">&#9744;</span>}
                    tone="primary"
                />
                <StatCard
                    label="Takımlarım"
                    value={dashboardData?.teamCount ?? 0}
                    icon={<span aria-hidden="true">&#9830;</span>}
                    tone="primary"
                />
                <StatCard
                    label="Tamamlanan"
                    value={dashboardData?.completedTaskCount ?? 0}
                    icon={<span aria-hidden="true">&#10003;</span>}
                    tone="success"
                />
                <StatCard
                    label="Devam Eden"
                    value={dashboardData?.inProgressTaskCount ?? 0}
                    icon={<span aria-hidden="true">&#9658;</span>}
                    tone="warning"
                />
                <StatCard
                    label="Gecikmiş Görevler"
                    value={dashboardData?.overdueTaskCount ?? 0}
                    icon={<span aria-hidden="true">!</span>}
                    tone="danger"
                    className={dashboardData && dashboardData.overdueTaskCount > 0 ? "is-overdue" : ""}
                    hint={dashboardData && dashboardData.overdueTaskCount > 0 ? "Acil dikkat gerekiyor" : undefined}
                />
                <StatCard
                    label="Bugün Bitenler"
                    value={dashboardData?.dueTodayTaskCount ?? 0}
                    icon={<span aria-hidden="true">&#9679;</span>}
                    tone="primary"
                />
                <StatCard
                    label="Yaklaşan Görevler"
                    value={dashboardData?.upcomingTaskCount ?? 0}
                    icon={<span aria-hidden="true">&#9650;</span>}
                    tone="primary"
                />
            </section>

            <section className="dashboard-content-grid">
                <div className="dashboard-section">
                    <div className="dashboard-section-header">
                        <span className="dashboard-section-icon is-warning" aria-hidden="true">&#9650;</span>
                        <div className="dashboard-section-titles">
                            <h2 className="dashboard-section-title">Yaklaşan Görevler</h2>
                            <p className="dashboard-section-subtitle">Yaklaşan son tarihler</p>
                        </div>
                    </div>

                    {upcomingTasksLoading ? (
                        <LoadingState message="Yaklaşan görevler yükleniyor..." />
                    ) : upcomingTasksError ? (
                        <EmptyState
                            icon={<span aria-hidden="true">&#9888;</span>}
                            title={upcomingTasksError}
                        />
                    ) : upcomingTasks.length === 0 ? (
                        <EmptyState
                            icon={<span aria-hidden="true">&#9650;</span>}
                            title="Yaklaşan göreviniz bulunmuyor."
                            message="Önümüzdeki dönem için planlanmış göreviniz yok."
                        />
                    ) : (
                        <div className="dashboard-list">
                            {upcomingTasks.map(task => {
                                const content = (
                                    <>
                                        <div className="dashboard-list-item-main">
                                            <span className="dashboard-list-item-title">{task.title}</span>
                                            {task.projectName && (
                                                <span className="dashboard-list-item-sub">{task.projectName}</span>
                                            )}
                                        </div>
                                        <div className="dashboard-list-item-badges">
                                            <Badge variant="info">{formatDate(task.dueDate)}</Badge>
                                            <Badge variant={getPriorityBadgeVariant(task.priority)}>
                                                {getPriorityLabel(task.priority)}
                                            </Badge>
                                            <Badge variant={getStatusBadgeVariant(task.status)}>
                                                {getStatusLabel(task.status)}
                                            </Badge>
                                        </div>
                                    </>
                                );

                                return task.projectId ? (
                                    <button
                                        className="dashboard-list-item is-clickable"
                                        key={task.id}
                                        type="button"
                                        onClick={() => navigate(`/project/${task.projectId}`)}
                                    >
                                        {content}
                                    </button>
                                ) : (
                                    <div className="dashboard-list-item" key={task.id}>
                                        {content}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="dashboard-section">
                    <div className="dashboard-section-header">
                        <span className="dashboard-section-icon" aria-hidden="true">&#9658;</span>
                        <div className="dashboard-section-titles">
                            <h2 className="dashboard-section-title">Son Görevler</h2>
                            <p className="dashboard-section-subtitle">Son aktiviteler</p>
                        </div>
                    </div>

                    {recentTasksLoading ? (
                        <LoadingState message="Görevler yükleniyor..." />
                    ) : recentTasks.length === 0 ? (
                        <EmptyState
                            icon={<span aria-hidden="true">&#9744;</span>}
                            title="Henüz görev yok"
                            message="Oluşturulan görevler burada görünecek."
                        />
                    ) : (
                        <div className="dashboard-list">
                            {recentTasks.map(task => (
                                <div className="dashboard-list-item" key={task.id}>
                                    <div className="dashboard-list-item-main">
                                        <span className="dashboard-list-item-title">{task.title}</span>
                                    </div>
                                    <div className="dashboard-list-item-badges">
                                        <Badge variant={getStatusBadgeVariant(task.status)}>
                                            {getStatusLabel(task.status)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dashboard-section dashboard-section-full">
                    <div className="dashboard-section-header">
                        <span className="dashboard-section-icon" aria-hidden="true">&#9636;</span>
                        <div className="dashboard-section-titles">
                            <h2 className="dashboard-section-title">Son Projeler</h2>
                            <p className="dashboard-section-subtitle">Son oluşturulan projeler</p>
                        </div>
                    </div>

                    {recentProjectsLoading ? (
                        <LoadingState message="Projeler yükleniyor..." />
                    ) : recentProjects.length === 0 ? (
                        <EmptyState
                            icon={<span aria-hidden="true">&#9636;</span>}
                            title="Henüz proje yok"
                            message="Oluşturulan projeler burada görünecek."
                            action={
                                <Button variant="primary" onClick={() => navigate("/create-project")}>
                                    Yeni Proje Oluştur
                                </Button>
                            }
                        />
                    ) : (
                        <div className="dashboard-list">
                            {recentProjects.map(project => (
                                <div className="dashboard-list-item" key={project.id}>
                                    <div className="dashboard-list-item-main">
                                        <span className="dashboard-list-item-title">{project.projectName}</span>
                                        {project.description && (
                                            <span className="dashboard-list-item-sub">{project.description}</span>
                                        )}
                                    </div>
                                    <span className="dashboard-project-icon" aria-hidden="true">&#9636;</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
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

function getSafeMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

export default Dashboard;
