type TaskCardProps={
    title:string;
    status:string;
}

function TaskCard(props:TaskCardProps){
    return(
        <div className="card">
            <h4>{props.title}</h4>
            <p>{props.status}</p>
        </div>
    )
}

export default TaskCard;