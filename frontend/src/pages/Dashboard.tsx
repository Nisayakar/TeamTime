import ProjectCard from "../components/ProjectCard";
import TaskCard from "../components/TaskCard";

function Dashboard() {
    const tasks = [
        {
            id: 1,
            title: "Login ekranını tamamla",
            status: "Devam Ediyor"
        },
        {
            id: 2,
            title: "Backend API yaz",
            status: "Bekliyor"
        },
        {
            id: 3,
            title: "MySQL bağlantısını yap",
            status: "Tamamlandı"
        }
    ];
    const projects = [
        {
            id: 1,
            projectName: "TeamTime",
            teamName: "Frontend Ekibi",
            taskCount: 5
        },
        {
            id: 2,
            projectName: "Bitirme Projesi",
            teamName: "Backend Ekibi",
            taskCount: 3
        },
        {
            id: 3,
            projectName: "Hackathon",
            teamName: "Mobil Takım",
            taskCount: 8
        }
    ];

    return (
        <div>
            <h1>Dashboard</h1>
            <h2>Hoşgeldiniz</h2>
            <h3>Projelerim</h3>
            {
                projects.map((project) => (<ProjectCard key={project.id} projectName={project.projectName} teamName={project.teamName} taskCount={project.taskCount} />))
            }

            <h3>Yaklaşan Görevler</h3>
         {
            tasks.map((task)=>(<TaskCard key={task.id} title={task.title} status={task.status} />))
         }
        </div>
    )
}

export default Dashboard;