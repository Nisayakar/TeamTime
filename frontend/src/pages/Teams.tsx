import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

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
        apiFetch("/teams")
            .then(response => response.json())
            .then(data => {
                setTeams(Array.isArray(data) ? data : []);
            });
    }

    async function readErrorMessage(response: Response) {
        const contentType = response.headers.get("Content-Type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.errors) {
                return Object.values(data.errors).join("\n");
            }

            if (data.message) {
                return data.message;
            }

            return "Takım oluşturulamadı";
        }

        const message = await response.text();

        if (message) {
            return message;
        }

        switch (response.status) {
            case 401:
                return "Bu işlem için giriş yapmalısınız";
            case 403:
                return "Bu işlem için yetkiniz yok";
            case 404:
                return "İstenen kaynak bulunamadı";
            case 409:
                return "Bu işlem mevcut kayıtlarla çakışıyor";
            case 500:
                return "Sunucuda beklenmeyen bir hata oluştu";
            default:
                return "Takım oluşturulamadı";
        }
    }

    async function createTeam(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            const response = await apiFetch("/teams", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    description
                })
            });

            if (!response.ok) {
                alert(await readErrorMessage(response));
                return;
            }

            const createdTeam = await response.json();

            setTeams([...teams, createdTeam]);
            setName("");
            setDescription("");
        } catch (error) {
            alert("Sunucuya bağlanılamadı");
        }
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
        apiFetch(`/teams/${team.id}`, {
            method: "PUT",
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
        apiFetch(`/teams/${id}`, {
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
