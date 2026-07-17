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
        <div>

            <h1>Projelerim</h1>

            <Link to="/create-project">
                <button>+ Yeni Proje</button>
            </Link>

            <br /><br />

            {
                projects.map((project) => (

                    <div key={project.id}>

                        <ProjectCard
                            projectName={project.projectName}
                            teamName={project.teamName}
                            taskCount={0}
                        />

                        <button
                            onClick={() => navigate(`/project/${project.id}`)}
                        >
                            Görevleri Gör
                        </button>

                        <button
                            onClick={() => navigate(`/edit-project/${project.id}`)}
                        >
                            Düzenle
                        </button>

                        <button
                            onClick={() => deleteProject(project.id)}
                        >
                            Sil
                        </button>

                        <br />
                        <br />

                    </div>

                ))
            }

        </div>
    );
}

export default Projects;