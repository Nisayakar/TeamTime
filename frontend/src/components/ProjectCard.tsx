import type { Project } from "../types/project";

type ProjectCardProps = {
    projectName: string;
    teamId: Project["teamId"];
    teamName: Project["teamName"];
    teamProject: Project["teamProject"];
    taskCount?: number;
}

function ProjectCard(props: ProjectCardProps) {
    const projectScopeLabel = props.teamProject
        ? `Takım: ${props.teamName || "Takım Projesi"}`
        : "Kişisel";

    return (
        <div className="project-card-body">
            <div className="card-icon project-card-icon">PR</div>
            <div className="project-card-copy">
                <h3>{props.projectName}</h3>
                <span className="badge badge-blue project-scope-badge">{projectScopeLabel}</span>
                {
                    typeof props.taskCount === "number" && props.taskCount > 0 && (
                        <span className="badge badge-blue project-task-badge">{props.taskCount} görev</span>
                    )
                }
            </div>
        </div>
    );
}

export default ProjectCard;
