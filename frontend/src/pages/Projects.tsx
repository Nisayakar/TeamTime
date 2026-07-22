import ProjectCard from "../components/ProjectCard";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Projects() {

    type Project = {
        id: number;
        projectName: string;
        description: string;
        teamName: string;
        startDate: string;
        endDate: string;
    }

    const [projects, setProjects] = useState<Project[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetch("http://localhost:8085/api/projects")
            .then(response => response.json())
            .then(data => {
                setProjects(data);
            });
    }, []);

    function deleteProject(id: number) {

        fetch(`http://localhost:8085/api/projects/${id}`, {
            method: "DELETE"
        })
            .then(response => response.text())
            .then(data => {

                alert(data);

                setProjects(
                    projects.filter(project => project.id !== id)
                );

            });

    }

    return (
        <main className="page-shell">
            <section className="page-header">
                <div>
                    <span className="eyebrow">Projeler</span>
                    <h1>Projelerim</h1>
                    <p>Aktif proje portföyünü, ekipleri ve tarih aralıklarını takip et.</p>
                </div>

                <Link to="/create-project">
                    <button className="button button-primary">Yeni Proje</button>
                </Link>
            </section>

            <section className="cards-grid">
                {
                    projects.map((project) => (

                        <article className="data-card project-card" key={project.id}>
                            <ProjectCard
                                projectName={project.projectName}
                                teamName={project.teamName}
                                taskCount={0}
                            />

                            <p className="card-description">{project.description}</p>

                            <div className="meta-grid">
                                <span>Başlangıç: {project.startDate || "-"}</span>
                                <span>Bitiş: {project.endDate || "-"}</span>
                            </div>

                            <div className="button-row">
                                <button
                                    className="button button-primary"
                                    onClick={() => navigate(`/project/${project.id}`)}
                                >
                                    Görevleri Gör
                                </button>

                                <button
                                    className="button button-secondary"
                                    onClick={() => navigate(`/edit-project/${project.id}`)}
                                >
                                    Düzenle
                                </button>

                                <button
                                    className="button button-danger"
                                    onClick={() => deleteProject(project.id)}
                                >
                                    Sil
                                </button>
                            </div>
                        </article>

                    ))
                }
            </section>
        </main>
    );
}

export default Projects;
