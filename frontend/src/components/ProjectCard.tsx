

type ProjectCardProps={
            projectName:string;
            teamName:string;
            taskCount:number;
        }


function ProjectCard(props:ProjectCardProps){
    
    return (
        <div>
            <h3>{props.projectName}</h3>
            <p>Team: {props.teamName}</p>
            <p>Tasks: {props.taskCount}</p>
        </div>
    );
}

export default ProjectCard;