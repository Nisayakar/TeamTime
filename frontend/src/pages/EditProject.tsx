import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";


function EditProject() {

    const { id } = useParams();
    const navigate = useNavigate();


    const [project, setProject] = useState({
        id: 0,
        projectName: "",
        description: "",
        teamName: "",
        startDate: "",
        endDate: ""
    });


    useEffect(() => {

        fetch(`http://localhost:8085/api/projects/${id}`)
            .then(response => response.json())
            .then(data => {
                console.log("Backend'den gelen:", data);

                setProject({
                    id: data.id,
                    projectName: data.projectName || "",
                    description: data.description || "",
                    teamName: data.teamName || "",
                    startDate: data.startDate || "",
                    endDate: data.endDate || ""
                });
            })

    }, [id]);



    function handleChange(e: any) {

        setProject({
            ...project,
            [e.target.name]: e.target.value
        });

    }



    function updateProject() {

        fetch(`http://localhost:8085/api/projects/${id}`, {

            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(project)

        })
            .then(response => response.text())
            .then(data => {

                alert(data);

                navigate("/projects");

            })


    }



    return (
        <div>

            <h1>Proje Düzenle</h1>


            <label>Proje Adı</label>
            <input
                name="projectName"
                value={project.projectName}
                onChange={handleChange}
            />


            <br />


            <label>Açıklama</label>
            <input
                name="description"
                value={project.description}
                onChange={handleChange}
            />


            <br />


            <label>Takım</label>
            <input
                name="teamName"
                value={project.teamName}
                onChange={handleChange}
            />


            <br />


            <label>Başlangıç Tarihi</label>
            <input
                type="date"
                name="startDate"
                value={project.startDate}
                onChange={handleChange}
            />


            <br />


            <label>Bitiş Tarihi</label>
            <input
                type="date"
                name="endDate"
                value={project.endDate}
                onChange={handleChange}
            />


            <br />


            <button onClick={updateProject}>
                Güncelle
            </button>


        </div>
    )

}


export default EditProject;