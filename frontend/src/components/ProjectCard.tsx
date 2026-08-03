import type { Project } from "../types/project";

type ProjectCardProps = {
    projectName: string;
    teamId: Project["teamId"];
    teamName: Project["teamName"];
    teamProject: Project["teamProject"];
    taskCount: number;
}

function ProjectCard(props: ProjectCardProps) {
    const projectScopeLabel = props.teamProject
        ? `Takım: ${props.teamName || "Takım Projesi"}`
        : "Kişisel";

    return (
        <div className="project-card-body">
            <div className="card-icon">PR</div>
            <div>
                <h3>{props.projectName}</h3>
                <p>{projectScopeLabel}</p>
                <span className="badge badge-blue">{props.taskCount} görev</span>
            </div>
        </div>
    );
}

export default ProjectCard;
