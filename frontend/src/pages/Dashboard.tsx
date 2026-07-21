import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
        const data = localStorage.getItem("user");

        if (data) {
            setUser(JSON.parse(data));
        }
    }, []);

    useEffect(() => {
        fetch("http://localhost:8085/api/dashboard")
            .then(response => response.json())
            .then(data => {
                setDashboardData(data);
            });
    }, []);

    useEffect(() => {
        fetch("http://localhost:8085/api/tasks/recent")
            .then(response => response.json())
            .then(data => {
                setRecentTasks(data);
            });
    }, []);

    useEffect(() => {
        fetch("http://localhost:8085/api/projects/recent")
            .then(response => response.json())
            .then(data => {
                setRecentProjects(Array.isArray(data) ? data : []);
            });
    }, []);

    function logout() {

        localStorage.removeItem("user");

        navigate("/login");

    }

    return (
        <div>
            <h1>Dashboard</h1>

            <section>
                <h2>
                    Hoş Geldin {user?.name ?? ""}
                </h2>

                {
                    user && (
                        <p>
                            Email:{user.email}
                        </p>
                    )
                }
            </section>

            <section>
                <div className="card">
                    <h3>Toplam Proje</h3>
                    <p>{dashboardData?.projectCount ?? 0}</p>
                </div>

                <div className="card">
                    <h3>Toplam Görev</h3>
                    <p>{dashboardData?.taskCount ?? 0}</p>
                </div>

                <div className="card">
                    <h3>Tamamlanan Görev</h3>
                    <p>{dashboardData?.completedTaskCount ?? 0}</p>
                </div>

                <div className="card">
                    <h3>Devam Eden Görev</h3>
                    <p>{dashboardData?.inProgressTaskCount ?? 0}</p>
                </div>
            </section>

            <section>
                <h2>Son Görevler</h2>

                {
                    recentTasks.length === 0 ? (
                        <p>Henüz görev yok</p>
                    ) : (
                        recentTasks.map((task) => (
                            <div className="card" key={task.id}>
                                <h3>{task.title}</h3>
                                <p>{task.status}</p>
                            </div>
                        ))
                    )
                }
            </section>

            <section>
                <h2>Son Projeler</h2>

                {
                    recentProjects.length === 0 ? (
                        <p>Henüz proje yok</p>
                    ) : (
                        recentProjects.map((project) => (
                            <div className="card" key={project.id}>
                                <h3>{project.projectName}</h3>
                                <p>{project.description}</p>
                            </div>
                        ))
                    )
                }
            </section>

            <section>
                <button onClick={logout}>
                    Çıkış Yap
                </button>
            </section>
        </div>
    )
}


export default Dashboard;
