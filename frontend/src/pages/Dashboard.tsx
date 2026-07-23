import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, getStoredUser } from "../api";

function Dashboard() {
    type DashboardData = {
        projectCount: number;
        taskCount: number;
        completedTaskCount: number;
        inProgressTaskCount: number;
    }

    type RecentTask = {
        id: number;
        title: string;
        status: string;
    }

    type RecentProject = {
        id: number;
        projectName: string;
        description: string;
    }

    const [user, setUser] = useState<any>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
    const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    useEffect(() => {
        apiFetch("/dashboard")
            .then(response => response.json())
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
            </section>

            <section className="content-grid two-columns">
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

export default Dashboard;
