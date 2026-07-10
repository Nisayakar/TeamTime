import ProjectCard from "../components/ProjectCard";
import { Link } from "react-router-dom";

function Projects() {
    const projects = [
        {
            id: 1,
            projectName: "TeamTime",
            teamName: "Frontend",
            taskCount: 5
        },
        {
            id: 2,
            projectName: "Hackathon",
            teamName: "Mobil",
            taskCount: 8
        }
    ]
    return (
        <div>
            <h1>Projelerim</h1>
            <Link to="/create-project">
                <button>+ Yeni Proje</button>
            </Link>
            <br></br>
            {
                projects.map((project) => (
                    <div key={project.id}>
                        <ProjectCard projectName={project.projectName} teamName={project.teamName} taskCount={project.taskCount} />
                        <button>Düzenle</button>
                        <button>Sil</button>
                        <br />
                        <br />
                    </div>
                ))
            }
        </div>
    )
}
export default Projects;