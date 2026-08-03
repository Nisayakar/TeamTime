import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, getStoredUser } from "../api";
import type { Task, TaskPriority, TaskStatus } from "../types/task";

function Dashboard() {
    type DashboardData = {
        projectCount: number;
        taskCount: number;
        completedTaskCount: number;
        inProgressTaskCount: number;
        teamCount: number;
        overdueTaskCount: number;
        dueTodayTaskCount: number;
        upcomingTaskCount: number;
    }

    type RecentProject = {
        id: number;
        projectName: string;
        description: string;
    }

    type StoredUser = {
        id: number;
        name: string;
        surname: string;
        email: string;
    }

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

    function logout() {

        clearAuth();

        navigate("/login");

    }

    return (
        <main className="page-shell">
            <section className="hero-card dashboard-hero">
                <div>
                    <span className="eyebrow">Dashboard</span>
                    <h1>Hoş Geldin {user?.name ?? ""}</h1>
                    <p>Projeler, görevler ve takım akışlarını tek ekranda takip et.</p>
                    {
                        user && (
                            <p className="muted">Email: {user.email}</p>
                        )
                    }
                </div>

                <button className="button button-secondary" onClick={logout}>
                    Çıkış Yap
                </button>
            </section>

            <section className="stats-grid">
                <div className="stat-card">
                    <span className="card-icon">PR</span>
                    <p>Toplam Proje</p>
                    <strong>{dashboardData?.projectCount ?? 0}</strong>
                </div>

                <div className="stat-card">
                    <span className="card-icon">GV</span>
                    <p>Toplam Görev</p>
                    <strong>{dashboardData?.taskCount ?? 0}</strong>
                </div>

                <div className="stat-card">
                    <span className="card-icon success">OK</span>
                    <p>Tamamlanan Görev</p>
                    <strong>{dashboardData?.completedTaskCount ?? 0}</strong>
                </div>

                <div className="stat-card">
                    <span className="card-icon warning">IP</span>
                    <p>Devam Eden Görev</p>
                    <strong>{dashboardData?.inProgressTaskCount ?? 0}</strong>
                </div>

                <div className="stat-card">
                    <span className="card-icon">TM</span>
                    <p>👥 Takımlarım</p>
                    <strong>{dashboardData?.teamCount ?? 0}</strong>
                </div>

                <div className="stat-card">
                    <span className="card-icon warning">GC</span>
                    <p>Gecikmiş Görevler</p>
                    <strong>{dashboardData?.overdueTaskCount ?? 0}</strong>
                </div>

                <div className="stat-card">
                    <span className="card-icon">BG</span>
                    <p>Bugün Bitenler</p>
                    <strong>{dashboardData?.dueTodayTaskCount ?? 0}</strong>
                </div>

                <div className="stat-card">
                    <span className="card-icon success">YG</span>
                    <p>Yaklaşan Görevler</p>
                    <strong>{dashboardData?.upcomingTaskCount ?? 0}</strong>
                </div>
            </section>

            <section className="content-grid two-columns">
                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Takvim</span>
                        <h2>Yaklaşan Görevler</h2>
                    </div>

                    {
                        upcomingTasksLoading ? (
                            <p className="empty-state">Yaklaşan görevler yükleniyor...</p>
                        ) : upcomingTasksError ? (
                            <p className="empty-state">{upcomingTasksError}</p>
                        ) : upcomingTasks.length === 0 ? (
                            <p className="empty-state">Yaklaşan göreviniz bulunmuyor.</p>
                        ) : (
                            upcomingTasks.map((task) => {
                                const content = (
                                    <>
                                        <div>
                                            <h3>{task.title}</h3>
                                            {task.projectName && <p>{task.projectName}</p>}
                                        </div>

                                        <div className="task-meta-row">
                                            <span className="badge badge-blue">{formatDate(task.dueDate)}</span>
                                            <span className={getPriorityClass(task.priority)}>
                                                {getPriorityLabel(task.priority)}
                                            </span>
                                            <span className="badge">{getStatusLabel(task.status)}</span>
                                        </div>
                                    </>
                                );

                                return task.projectId ? (
                                    <button
                                        className="list-card list-card-button"
                                        key={task.id}
                                        type="button"
                                        onClick={() => navigate(`/project/${task.projectId}`)}
                                    >
                                        {content}
                                    </button>
                                ) : (
                                    <div className="list-card" key={task.id}>
                                        {content}
                                    </div>
                                );
                            })
                        )
                    }
                </div>

                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Aktivite</span>
                        <h2>Son Görevler</h2>
                    </div>

                    {
                        recentTasks.length === 0 ? (
                            <p className="empty-state">Henüz görev yok</p>
                        ) : (
                            recentTasks.map((task) => (
                                <div className="list-card" key={task.id}>
                                    <div>
                                        <h3>{task.title}</h3>
                                        <span className="badge badge-blue">{task.status}</span>
                                    </div>
                                </div>
                            ))
                        )
                    }
                </div>

                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Portföy</span>
                        <h2>Son Projeler</h2>
                    </div>

                    {
                        recentProjects.length === 0 ? (
                            <p className="empty-state">Henüz proje yok</p>
                        ) : (
                            recentProjects.map((project) => (
                                <div className="list-card" key={project.id}>
                                    <div>
                                        <h3>{project.projectName}</h3>
                                        <p>{project.description}</p>
                                    </div>
                                </div>
                            ))
                        )
                    }
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

function getPriorityClass(priority: TaskPriority) {
    if (priority === "URGENT" || priority === "HIGH") {
        return "badge badge-warning";
    }

    return "badge";
}

function getStatusLabel(status: TaskStatus) {
    const labels: Record<TaskStatus, string> = {
        BEKLIYOR: "Bekliyor",
        DEVAM_EDIYOR: "Devam Ediyor",
        TAMAMLANDI: "Tamamlandı"
    };

    return labels[status];
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
