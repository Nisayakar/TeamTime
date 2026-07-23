import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api";


function CreateProject() {
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [teamName, setTeamName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const { id } = useParams();

    useEffect(() => {

        if (id) {

            apiFetch(`/projects/${id}`)
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

        apiFetch("/projects", {
            method: "POST",
            body: JSON.stringify(project)
        })
            .then(response => response.text())
            .then(data => {
                alert(data);
            });
    }

    return (
        <main className="page-shell narrow-page">
            <section className="page-header">
                <div>
                    <span className="eyebrow">Proje</span>
                    <h1>Proje Oluştur</h1>
                    <p>Yeni bir proje alanı aç ve takım planını zaman çizelgesiyle başlat.</p>
                </div>
            </section>

            <form className="form-card" onSubmit={projeOlustur}>
                <label>Proje Adı</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} />

                <label>Proje Açıklaması</label>
                <input type="text" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />

                <label>Takım Adı</label>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} />

                <div className="form-grid two-columns">
                    <div>
                        <label>Başlangıç Tarihi</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>

                    <div>
                        <label>Bitiş Tarihi</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>

                <button className="button button-primary button-full" type="submit">Proje Oluştur</button>
            </form>
        </main>
    );
}

export default CreateProject;
