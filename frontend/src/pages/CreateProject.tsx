import { useState } from "react";

function CreateProject() {
    const [projectName, setProjectName]=useState("");
    const [projectDescription,setProjectDescription]=useState("");
    const [teamName,setTeamName]=useState("");
    const [startDate,setStartDate]=useState("");
    const [endDate,setEndDate]=useState("");

    function projeOlustur(e:any){
        e.preventDefault();

        console.log(projectName);
        console.log(projectDescription);
        console.log(teamName);
        console.log(startDate);
        console.log(endDate);
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