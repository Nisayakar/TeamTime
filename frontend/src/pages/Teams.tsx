import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
import type { TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";

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
    const [teams, setTeams] = useState<Team[]>([]);
    const [rolesByTeamId, setRolesByTeamId] = useState<Record<number, TeamRole | undefined>>({});
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
    const [deletingTeam, setDeletingTeam] = useState(false);
    const [sectionFeedback, setSectionFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [createFeedback, setCreateFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [editFeedback, setEditFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [deleteFeedback, setDeleteFeedback] = useState("");
    const navigate = useNavigate();

    const getCurrentUserId = useCallback(() => {
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
    }, []);

    const loadCurrentUserRoles = useCallback(async (loadedTeams: Team[]) => {
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
    }, [getCurrentUserId]);

    const getTeams = useCallback(async () => {
        try {
            const response = await apiFetch("/teams");

            if (!response.ok) {
                if (navigateForInitialLoadError(response.status, navigate)) {
                    return;
                }

                setSectionFeedback({ type: "error", message: await parseApiError(response, "Takımlar yüklenemedi") });
                return;
            }

            const data: unknown = await response.json();
            const loadedTeams = Array.isArray(data) ? data as Team[] : [];

            setTeams(loadedTeams);
            setSectionFeedback(null);
            await loadCurrentUserRoles(loadedTeams);
        } catch {
            setSectionFeedback({ type: "error", message: "Sunucuya bağlanılamadı" });
            setTeams([]);
            setRolesByTeamId({});
        }
    }, [loadCurrentUserRoles, navigate]);

    useEffect(() => {
        getTeams();
    }, [getTeams]);

    async function createTeam(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateFeedback(null);

        try {
            const response = await apiFetch("/teams", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    description
                })
            });

            if (!response.ok) {
                setCreateFeedback({ type: "error", message: await parseApiError(response, "Takım oluşturulamadı") });
                return;
            }

            const createdTeam = await response.json();

            setTeams([...teams, createdTeam]);
            setName("");
            setDescription("");
            await loadCurrentUserRoles([...teams, createdTeam]);
            setCreateFeedback({ type: "success", message: "Takım başarıyla oluşturuldu." });
        } catch {
            setCreateFeedback({ type: "error", message: "Sunucuya bağlanılamadı" });
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
        setEditFeedback(null);

        const response = await apiFetch(`/teams/${team.id}`, {
            method: "PUT",
            body: JSON.stringify({
                name: editName,
                description: editDescription,
                createdDate: team.createdDate
            })
        });

        if (!response.ok) {
            setEditFeedback({ type: "error", message: await parseApiError(response, "Takım güncellenemedi") });
            return;
        }

        const updatedTeam: Team = await response.json();

        setTeams(
            teams.map(currentTeam =>
                currentTeam.id === updatedTeam.id ? updatedTeam : currentTeam
            )
        );

        cancelEdit();
        setSectionFeedback({ type: "success", message: "Takım başarıyla güncellendi." });
    }

    async function confirmDeleteTeam() {
        if (!teamToDelete || deletingTeam) {
            return;
        }

        setDeletingTeam(true);

        try {
            const response = await apiFetch(`/teams/${teamToDelete.id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                setDeleteFeedback(await parseApiError(response, "Takım silinemedi"));
                return;
            }

            setTeams(currentTeams => currentTeams.filter(team => team.id !== teamToDelete.id));
            setSectionFeedback({ type: "success", message: "Takım başarıyla silindi." });
            setTeamToDelete(null);
        } catch (error) {
            setDeleteFeedback(getErrorMessage(error, "Takım silinemedi"));
        } finally {
            setDeletingTeam(false);
        }
    }

    return (
        <main className="page-shell app-page teams-page">
            <section className="page-header app-page-header">
                <div className="app-page-header-copy">
                    <span className="eyebrow">Takımlar</span>
                    <h1>Takımlarım</h1>
                    <p>Üyeleri, rolleri ve ekip odaklarını düzenli bir alanda yönet.</p>
                </div>
            </section>

            <section className="panel app-form-card teams-create-panel">
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
                {createFeedback && <InlineFeedback type={createFeedback.type} message={createFeedback.message} />}
            </section>
            {sectionFeedback && <InlineFeedback type={sectionFeedback.type} message={sectionFeedback.message} />}

            {
                sectionFeedback?.type === "error" ? null : teams.length === 0 ? (
                    <p className="empty-state app-empty-state">Henüz takım yok</p>
                ) : (
                    <section className="cards-grid teams-grid">
                        {
                            teams.map(team => (
                                <article className="data-card team-card app-entity-card" key={team.id}>
                                    {
                                        editingTeamId === team.id ? (
                                            <div className="team-edit-form">
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
                                                {editFeedback && <InlineFeedback type={editFeedback.type} message={editFeedback.message} />}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="project-card-body">
                                                    <div className="card-icon app-card-icon">TM</div>
                                                    <div className="app-card-copy">
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
                                                            <button
                                                                className="button button-danger"
                                                                onClick={() => {
                                                                    setDeleteFeedback("");
                                                                    setTeamToDelete(team);
                                                                }}
                                                            >
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
            <ConfirmModal
                open={teamToDelete !== null}
                title="Takımı sil"
                message={`"${teamToDelete?.name ?? "Bu takım"}" adlı takımı silmek istediğinizden emin misiniz? Bu takım bağlı projelere sahipse silinemeyebilir.`}
                confirmLabel={deletingTeam ? "Siliniyor" : "Sil"}
                variant="danger"
                loading={deletingTeam}
                errorMessage={deleteFeedback}
                onConfirm={confirmDeleteTeam}
                onCancel={() => {
                    setDeleteFeedback("");
                    setTeamToDelete(null);
                }}
            />
        </main>
    );
}

export default Teams;
