type ProjectCardProps = {
    projectName: string;
    teamName: string;
    taskCount: number;
}

function ProjectCard(props: ProjectCardProps) {
    return (
        <div className="project-card-body">
            <div className="card-icon">PR</div>
            <div>
                <h3>{props.projectName}</h3>
                <p>Takım: {props.teamName}</p>
                <span className="badge badge-blue">{props.taskCount} görev</span>
            </div>
        </div>
    );
}

export default ProjectCard;
