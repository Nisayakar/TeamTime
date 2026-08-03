import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getStoredUser } from "../api";
import { useToast } from "../context/toast";
import type { TeamRole } from "../types/team";
import { parseApiError } from "../utils/apiError";

type Team = {
    id: number;
    name: string;
    description: string;
    createdDate?: string;
}

type TeamMember = {
    userId: number;
    role: TeamRole;
}

type StoredUser = {
    id: number;
}

function Teams() {
    const { showToast } = useToast();
    const [teams, setTeams] = useState<Team[]>([]);
    const [rolesByTeamId, setRolesByTeamId] = useState<Record<number, TeamRole | undefined>>({});
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        getTeams();
    }, []);

    async function getTeams() {
        const response = await apiFetch("/teams");
        const data: unknown = await response.json();
        const loadedTeams = Array.isArray(data) ? data as Team[] : [];

        setTeams(loadedTeams);
        await loadCurrentUserRoles(loadedTeams);
    }

    function getCurrentUserId() {
        const storedUser: unknown = getStoredUser();

        if (
            storedUser &&
            typeof storedUser === "object" &&
            "id" in storedUser &&
            typeof (storedUser as StoredUser).id === "number"
        ) {
            return (storedUser as StoredUser).id;
        }

        return null;
    }

    async function loadCurrentUserRoles(loadedTeams: Team[]) {
        const currentUserId = getCurrentUserId();

        if (currentUserId === null) {
            setRolesByTeamId({});
            return;
        }

        const roleEntries = await Promise.all(
            loadedTeams.map(async team => {
                try {
                    const response = await apiFetch(`/teams/${team.id}/members`);

                    if (!response.ok) {
                        return [team.id, undefined] as const;
                    }

                    const data: unknown = await response.json();
                    const members = Array.isArray(data) ? data as TeamMember[] : [];
                    const currentMember = members.find(member => member.userId === currentUserId);

                    return [team.id, currentMember?.role] as const;
                } catch {
                    return [team.id, undefined] as const;
                }
            })
        );

        setRolesByTeamId(Object.fromEntries(roleEntries));
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
                showToast({
                    type: "error",
                    message: await parseApiError(response, "Takım oluşturulamadı")
                });
                return;
            }

            const createdTeam = await response.json();

            setTeams([...teams, createdTeam]);
            setName("");
            setDescription("");
            await loadCurrentUserRoles([...teams, createdTeam]);
            showToast({
                type: "success",
                message: "Takım başarıyla oluşturuldu."
            });
        } catch {
            showToast({
                type: "error",
                message: "Sunucuya bağlanılamadı"
            });
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

    async function updateTeam(team: Team) {
        const response = await apiFetch(`/teams/${team.id}`, {
            method: "PUT",
            body: JSON.stringify({
                name: editName,
                description: editDescription,
                createdDate: team.createdDate
            })
        });

        if (!response.ok) {
            showToast({
                type: "error",
                message: await parseApiError(response, "Takım güncellenemedi")
            });
            return;
        }

        const updatedTeam: Team = await response.json();

        setTeams(
            teams.map(currentTeam =>
                currentTeam.id === updatedTeam.id ? updatedTeam : currentTeam
            )
        );

        cancelEdit();
        showToast({
            type: "success",
            message: "Takım başarıyla güncellendi."
        });
    }

    async function deleteTeam(id: number) {
        const response = await apiFetch(`/teams/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showToast({
                type: "error",
                message: await parseApiError(response, "Takım silinemedi")
            });
            return;
        }

        setTeams(teams.filter(team => team.id !== id));
        showToast({
            type: "success",
            message: "Takım başarıyla silindi."
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

                                                    {
                                                        (rolesByTeamId[team.id] === "OWNER" || rolesByTeamId[team.id] === "ADMIN") && (
                                                            <button className="button button-secondary" onClick={() => startEdit(team)}>
                                                                Düzenle
                                                            </button>
                                                        )
                                                    }

                                                    {
                                                        rolesByTeamId[team.id] === "OWNER" && (
                                                            <button className="button button-danger" onClick={() => deleteTeam(team.id)}>
                                                                Sil
                                                            </button>
                                                        )
                                                    }
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
