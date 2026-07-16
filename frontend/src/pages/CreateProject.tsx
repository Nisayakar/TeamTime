import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";


function CreateProject() {
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [teamName, setTeamName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const { id } = useParams();

    useEffect(() => {

        if (id) {

            fetch(`http://localhost:8085/api/projects/${id}`)
                .then(response => response.json())
                .then(data => {

                    setProjectName(data.projectName);
                    setProjectDescription(data.description);
                    setTeamName(data.teamName);
                    setStartDate(data.startDate);
                    setEndDate(data.endDate);

                })

        }

    }, [])

    function projeOlustur(e: any) {
        e.preventDefault();

        const project = {
            projectName: projectName,
            description: projectDescription,
            teamName: teamName,
            startDate: startDate,
            endDate: endDate
        };

        fetch("http://localhost:8085/api/projects", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(project)
        })
            .then(response => response.text())
            .then(data => {
                alert(data);
            });
    }

    return <div>
        <h1>TEAMTIME</h1>
        <p>Proje Oluştur</p>
        <form onSubmit={projeOlustur}>
            <label>Proje Adı  : </label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}></input>
            <br></br>
            <label>Proje Açıklaması : </label>
            <input type="text" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)}></input>
            <br></br>
            <label>Takım Adı : </label>
            <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)}></input>
            <br></br>
            <label> Başlangıç Tarihi : </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}></input>
            <br></br>
            <label> Bitiş Tarihi : </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}></input>
            <br></br>
            <button type="submit"> Proje Oluştur </button>
        </form>



    </div>
}

export default CreateProject;