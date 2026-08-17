import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, getStoredUser } from "../api";
import type { Task } from "../types/task";
import { Badge, EmptyState, LoadingState } from "../components/ui";
import "../dashboard-v2.css";

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
        setUpcomingTasksLoading(true);
        setUpcomingTasksError("");

        apiFetch("/tasks/upcoming")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Yaklaşan görevler yüklenemedi.");
                }

                return response.json() as Promise<Task[]>;
            })
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

    const taskCount = dashboardData?.taskCount ?? 0;
    const completedTaskCount = dashboardData?.completedTaskCount ?? 0;
    const rawCompletionRate = taskCount === 0 ? 0 : Math.round((completedTaskCount / taskCount) * 100);
    const completionRate = Math.min(100, Math.max(0, rawCompletionRate));

    return (
        <main className="dashboard-v2-container">
            <section className="dashboard-v2-welcome">
                <div className="dashboard-v2-welcome-text">
                    <h1 className="dashboard-v2-title">
                        Hoş geldin, <span className="dashboard-v2-title-highlight">{user?.name ?? ""}</span>
                    </h1>
                    <p className="dashboard-v2-subtitle">
                        Genel duruma hızlıca göz at. Bugün <strong className="dashboard-v2-subtitle-strong">{dashboardData?.dueTodayTaskCount ?? 0}</strong> görevin, <strong className="dashboard-v2-subtitle-strong">{dashboardData?.upcomingTaskCount ?? 0}</strong> yaklaşan görevin var.
                    </p>
                </div>
                <button
                    className="dashboard-v2-create-btn"
                    onClick={() => navigate("/create-project")}
                    type="button"
                >
                    <PlusIcon />
                    Yeni Proje Oluştur
                </button>
            </section>

            <section className="dashboard-v2-stats-layout">
                <div className="dashboard-v2-gauge-card">
                    <div>
                        <h2 className="dashboard-v2-gauge-header">İlerleme</h2>
                        <div className="dashboard-v2-gauge-container">
                            <div className="dashboard-v2-gauge-wrapper">
                                <svg className="dashboard-v2-gauge-svg" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                                    <circle className="dashboard-v2-gauge-track" cx="18" cy="18" fill="none" r="16" strokeWidth="2"></circle>
                                    <circle 
                                        className="dashboard-v2-gauge-progress" 
                                        cx="18" 
                                        cy="18" 
                                        fill="none" 
                                        r="16" 
                                        strokeDasharray="100" 
                                        strokeDashoffset={100 - completionRate} 
                                        strokeLinecap="round" 
                                        strokeWidth="2"
                                    ></circle>
                                </svg>
                                <div className="dashboard-v2-gauge-content">
                                    <span className="dashboard-v2-gauge-percent">{completionRate}%</span>
                                    <CheckIcon />
                                </div>
                            </div>
                        </div>
                        <p className="dashboard-v2-gauge-desc">Tüm görevlerinizdeki genel tamamlama oranınız.</p>
                    </div>
                    <div className="dashboard-v2-gauge-footer">
                        <span className="dashboard-v2-gauge-completed-val">{completedTaskCount}</span>
                        <span className="dashboard-v2-gauge-completed-lbl">Tamamlanan Görevler</span>
                    </div>
                </div>

                <div className="dashboard-v2-status-grid">
                    <button className="dashboard-v2-status-card" onClick={() => navigate("/projects")} type="button">
                        <div className="dashboard-v2-status-card-header">
                            <div className="dashboard-v2-status-icon-wrap info">
                                <FolderIcon />
                            </div>
                        </div>
                        <div>
                            <span className="dashboard-v2-status-main-val">{dashboardData?.projectCount ?? 0}</span>
                            <span className="dashboard-v2-status-main-lbl">Aktif Proje</span>
                        </div>
                    </button>

                    <button className="dashboard-v2-status-card" onClick={() => navigate("/my-tasks")} type="button">
                        <div className="dashboard-v2-status-card-header">
                            <div className="dashboard-v2-status-icon-wrap primary">
                                <CheckIcon size={18} />
                            </div>
                        </div>
                        <div>
                            <span className="dashboard-v2-status-main-val">{dashboardData?.taskCount ?? 0}</span>
                            <span className="dashboard-v2-status-main-lbl">Toplam Görev</span>
                        </div>
                    </button>

                    <button className="dashboard-v2-status-card" onClick={() => navigate("/teams")} type="button">
                        <div className="dashboard-v2-status-card-header">
                            <div className="dashboard-v2-status-icon-wrap info">
                                <UsersIcon />
                            </div>
                        </div>
                        <div>
                            <span className="dashboard-v2-status-main-val">{dashboardData?.teamCount ?? 0}</span>
                            <span className="dashboard-v2-status-main-lbl">Takımlar</span>
                        </div>
                    </button>

                    <button className="dashboard-v2-status-card" onClick={() => navigate("/my-tasks?status=DEVAM_EDIYOR")} type="button">
                        <div className="dashboard-v2-status-card-header">
                            <div className="dashboard-v2-status-icon-wrap warning">
                                <PlayIcon />
                            </div>
                        </div>
                        <div>
                            <span className="dashboard-v2-status-main-val">{dashboardData?.inProgressTaskCount ?? 0}</span>
                            <span className="dashboard-v2-status-main-lbl">Devam Eden Görevler</span>
                        </div>
                    </button>

                    <button className="dashboard-v2-status-card" onClick={() => navigate("/my-tasks?due=overdue")} type="button">
                        <div className="dashboard-v2-status-card-header">
                            <div className="dashboard-v2-status-icon-wrap danger">
                                <WarningIcon />
                            </div>
                        </div>
                        <div>
                            <span className="dashboard-v2-status-main-val">{dashboardData?.overdueTaskCount ?? 0}</span>
                            <span className="dashboard-v2-status-main-lbl">Gecikmiş Görevler</span>
                        </div>
                    </button>

                    <button className="dashboard-v2-status-card" onClick={() => focusUpcomingTasksSection()} type="button">
                        <div className="dashboard-v2-status-card-header">
                            <div className="dashboard-v2-status-icon-wrap primary">
                                <CalendarIcon />
                            </div>
                        </div>
                        <div>
                            <span className="dashboard-v2-status-main-val">{dashboardData?.upcomingTaskCount ?? 0}</span>
                            <span className="dashboard-v2-status-main-lbl">Yaklaşan Görevler</span>
                        </div>
                    </button>
                </div>
            </section>

            <section className="dashboard-v2-recent">
                <div className="dashboard-v2-recent-header">
                    <div>
                        <h2 className="dashboard-v2-recent-title">Son Projeler</h2>
                        <p className="dashboard-v2-recent-subtitle">En son üzerinde çalıştığınız projeler ve durumları.</p>
                    </div>
                    <Link className="dashboard-v2-recent-link" to="/projects">
                        Tümünü Gör
                        <ArrowForwardIcon />
                    </Link>
                </div>

                {recentProjects.length === 0 ? (
                    <div className="dashboard-v2-empty">
                        <div className="dashboard-v2-empty-icon">
                            <PhotoIcon />
                        </div>
                        <h3 className="dashboard-v2-empty-title">Henüz yeni bir proje bulunmuyor</h3>
                        <p className="dashboard-v2-empty-message">Çalışmalarınıza başlamak için yeni bir proje oluşturun ve takımınızı davet edin.</p>
                        <button className="dashboard-v2-create-btn" onClick={() => navigate("/create-project")} type="button">
                            İlk projeni oluştur
                        </button>
                    </div>
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
            </section>

            <div
                className="dashboard-section"
                id="dashboard-upcoming-tasks"
                tabIndex={-1}
            >
                <div className="dashboard-section-header">
                    <div className="dashboard-section-titles">
                        <h2 className="dashboard-section-title">Yaklaşan Görevler Listesi</h2>
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
        </main>
    );
}


function focusUpcomingTasksSection() {
    const section = document.getElementById("dashboard-upcoming-tasks");

    if (!section) {
        return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
    });
    section.focus({ preventScroll: true });
}

/* ---- Inline SVG icons ---- */

function FolderIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
}


function CheckIcon({ size = 18 }: { size?: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}

function CalendarIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}

function PlayIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
}

function WarningIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}


function ArrowForwardIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}

function PlusIcon() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function UsersIcon() {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

function PhotoIcon() {
    return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
}

/* ---- Label/format helpers ---- */


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
