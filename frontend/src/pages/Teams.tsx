import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Team = {
    id: number;
    name: string;
    description: string;
    createdDate?: string;
}

function Teams() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        getTeams();
    }, []);

    function getTeams() {
        fetch("http://localhost:8085/api/teams")
            .then(response => response.json())
            .then(data => {
                setTeams(Array.isArray(data) ? data : []);
            });
    }

    function createTeam(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        fetch("http://localhost:8085/api/teams", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                description
            })
        })
            .then(response => response.json())
            .then(createdTeam => {
                setTeams([...teams, createdTeam]);
                setName("");
                setDescription("");
            });
    }

    function startEdit(team: Team) {
        setEditingTeamId(team.id);
        setEditName(team.name);
        setEditDescription(team.description);
    }

    function cancelEdit() {
        setEditingTeamId(null);
        setEditName("");
        setEditDescription("");
    }

    function updateTeam(team: Team) {
        fetch(`http://localhost:8085/api/teams/${team.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: editName,
                description: editDescription,
                createdDate: team.createdDate
            })
        })
            .then(response => response.json())
            .then(updatedTeam => {
                setTeams(
                    teams.map(currentTeam =>
                        currentTeam.id === updatedTeam.id ? updatedTeam : currentTeam
                    )
                );

                cancelEdit();
            });
    }

    function deleteTeam(id: number) {
        fetch(`http://localhost:8085/api/teams/${id}`, {
            method: "DELETE"
        })
            .then(() => {
                setTeams(teams.filter(team => team.id !== id));
            });
    }

    return (
        <main className="page-shell">
            <section className="page-header">
                <div>
                    <span className="eyebrow">Takımlar</span>
                    <h1>Takımlarım</h1>
                    <p>Üyeleri, rolleri ve ekip odaklarını düzenli bir alanda yönet.</p>
                </div>
            </section>

            <section className="panel">
                <div className="section-heading">
                    <span className="eyebrow">Yeni takım</span>
                    <h2>Takım oluştur</h2>
                </div>

                <form className="inline-form" onSubmit={createTeam}>
                    <div>
                        <label>Takım Adı</label>
                        <input
                            type="text"
                            value={name}
                            onChange={event => setName(event.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label>Açıklama</label>
                        <input
                            type="text"
                            value={description}
                            onChange={event => setDescription(event.target.value)}
                            required
                        />
                    </div>

                    <button className="button button-primary" type="submit">Takım Oluştur</button>
                </form>
            </section>

            {
                teams.length === 0 ? (
                    <p className="empty-state">Henüz takım yok</p>
                ) : (
                    <section className="cards-grid">
                        {
                            teams.map(team => (
                                <article className="data-card team-card" key={team.id}>
                                    {
                                        editingTeamId === team.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={event => setEditName(event.target.value)}
                                                />

                                                <input
                                                    type="text"
                                                    value={editDescription}
                                                    onChange={event => setEditDescription(event.target.value)}
                                                />

                                                <div className="button-row">
                                                    <button className="button button-primary" onClick={() => updateTeam(team)}>
                                                        Kaydet
                                                    </button>

                                                    <button className="button button-secondary" onClick={cancelEdit}>
                                                        Vazgeç
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="project-card-body">
                                                    <div className="card-icon">TM</div>
                                                    <div>
                                                        <h3>{team.name}</h3>
                                                        <p>{team.description}</p>
                                                    </div>
                                                </div>

                                                <div className="button-row">
                                                    <button className="button button-primary" onClick={() => navigate(`/teams/${team.id}`)}>
                                                        Üyeleri Gör
                                                    </button>

                                                    <button className="button button-secondary" onClick={() => startEdit(team)}>
                                                        Düzenle
                                                    </button>

                                                    <button className="button button-danger" onClick={() => deleteTeam(team.id)}>
                                                        Sil
                                                    </button>
                                                </div>
                                            </>
                                        )
                                    }
                                </article>
                            ))
                        }
                    </section>
                )
            }
        </main>
    );
}

export default Teams;
