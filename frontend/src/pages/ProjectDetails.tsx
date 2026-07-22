import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";


function ProjectDetails() {


    const { id } = useParams();


    const [tasks, setTasks] = useState<any[]>([]);


    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("BEKLIYOR");


    const [editId, setEditId] = useState<number | null>(null);


    const [message, setMessage] = useState("");




    function showMessage(text: string) {

        setMessage(text);

        setTimeout(() => {

            setMessage("");

        }, 3000);

    }





    function getTasks() {


        fetch(`http://localhost:8085/api/tasks/project/${id}`)

            .then(response => {


                if (!response.ok) {

                    throw new Error();

                }

                return response.json();

            })

            .then(data => {

                setTasks(data);

            })

            .catch(() => {

                setTasks([]);

            })


    }





    useEffect(() => {

        getTasks();

    }, [id]);







    function saveTask() {



        if (title.trim() === "") {

            showMessage("Görev başlığı boş olamaz");

            return;

        }



        const task = {

            title,

            description,

            status

        };




        let url = "";


        let method = "";



        if (editId) {


            url = `http://localhost:8085/api/tasks/${editId}`;

            method = "PUT";


        }

        else {


            url = `http://localhost:8085/api/tasks/${id}`;

            method = "POST";


        }




        fetch(url, {

            method: method,

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify(task)

        })

            .then(response => {


                if (!response.ok) {

                    return response.text()
                        .then(err => {

                            throw new Error(err);

                        });

                }


                return response.text();


            })

            .then(data => {


                showMessage(data);


                clearForm();


                getTasks();



            })


            .catch(error => {


                showMessage(error.message);


            });



    }







    function deleteTask(taskId: number) {



        fetch(`http://localhost:8085/api/tasks/${taskId}`, {

            method: "DELETE"

        })

            .then(response => response.text())

            .then(data => {


                showMessage(data);


                getTasks();


            })


    }







    function editTask(task: any) {


        setEditId(task.id);

        setTitle(task.title);

        setDescription(task.description);

        setStatus(task.status);


    }







    function clearForm() {


        setTitle("");

        setDescription("");

        setStatus("BEKLIYOR");

        setEditId(null);


    }




    function getStatusClass(taskStatus: string) {
        if (taskStatus === "TAMAMLANDI") {
            return "badge badge-green";
        }

        if (taskStatus === "DEVAM_EDIYOR") {
            return "badge badge-blue";
        }

        return "badge badge-warning";
    }





    return (


        <main className="page-shell">



            {
                message &&

                <div className="message-box">

                    {message}

                </div>

            }




            <section className="page-header">
                <div>
                    <span className="eyebrow">Proje</span>
                    <h1>Proje Detayları</h1>
                    <p>Görevleri oluştur, durumlarını güncelle ve proje ilerleyişini takip et.</p>
                </div>
            </section>


            <section className="content-grid two-columns">
                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Görev formu</span>
                        <h2>

                            {

                                editId

                                    ?

                                    "Görevi Güncelle"

                                    :

                                    "Yeni Görev"

                            }

                        </h2>
                    </div>





                    <div className="stacked-form">
                        <label>Görev başlığı</label>
                        <input

                            placeholder="Görev başlığı"

                            value={title}

                            onChange={(e) => setTitle(e.target.value)}

                        />




                        <label>Açıklama</label>
                        <textarea

                            placeholder="Açıklama"

                            value={description}

                            onChange={(e) => setDescription(e.target.value)}

                        />




                        <label>Durum</label>
                        <select

                            value={status}

                            onChange={(e) => setStatus(e.target.value)}

                        >


                            <option value="BEKLIYOR">
                                Bekliyor
                            </option>


                            <option value="DEVAM_EDIYOR">
                                Devam Ediyor
                            </option>


                            <option value="TAMAMLANDI">
                                Tamamlandı
                            </option>


                        </select>




                        <div className="button-row">
                            <button className="button button-primary" onClick={saveTask}>

                                {

                                    editId

                                        ?

                                        "Güncelle"

                                        :

                                        "Görev Ekle"

                                }

                            </button>



                            <button className="button button-secondary" onClick={clearForm}>

                                Temizle

                            </button>
                        </div>
                    </div>
                </div>




                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Akış</span>
                        <h2>Görevler</h2>
                    </div>




                    {

                        tasks.length === 0

                            ?

                            <p className="empty-state">Bu projede henüz görev yok.</p>


                            :


                            tasks.map(task => (


                                <div className="task-card" key={task.id}>


                                    <div>
                                        <h3>{task.title}</h3>


                                        <p>{task.description}</p>
                                    </div>


                                    <span className={getStatusClass(task.status)}>

                                        {task.status}

                                    </span>



                                    <div className="button-row">
                                        <button className="button button-secondary" onClick={() => editTask(task)}>

                                            Düzenle

                                        </button>



                                        <button className="button button-danger" onClick={() => deleteTask(task.id)}>

                                            Sil

                                        </button>
                                    </div>


                                </div>


                            ))


                    }
                </div>
            </section>



        </main>


    );


}


export default ProjectDetails;
