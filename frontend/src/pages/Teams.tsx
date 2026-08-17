import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import { useToast } from "../context/toast";
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

type UserSearchResult = {
    id: number;
    email: string;
    name?: string;
    surname?: string;
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
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
    const [deletingTeam, setDeletingTeam] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
    const navigate = useNavigate();

    function getFullName(user: UserSearchResult): string {
        if (!user.name && !user.surname) {
            return user.email;
        }

        return `${user.name ?? ""} ${user.surname ?? ""}`.trim();
    }

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

                showToast({
                    type: "error",
                    message: await parseApiError(response, "Takımlar yüklenemedi")
                });
                return;
            }

            const data: unknown = await response.json();
            const loadedTeams = Array.isArray(data) ? data as Team[] : [];

            setTeams(loadedTeams);
            await loadCurrentUserRoles(loadedTeams);
        } catch {
            showToast({
                type: "error",
                message: "Sunucuya bağlanılamadı"
            });
            setTeams([]);
            setRolesByTeamId({});
        }
    }, [loadCurrentUserRoles, navigate, showToast]);

    useEffect(() => {
        getTeams();
    }, [getTeams]);

    useEffect(() => {
        const query = userSearch.trim();

        if (query === "") {
            setUserResults([]);
            return;
        }

        const debounceTimer = setTimeout(() => {
            apiFetch(`/users/search?query=${encodeURIComponent(query)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Kullanıcılar aranamadı");
                    }
                    return response.json();
                })
                .then(data => {
                    const results = Array.isArray(data) ? data : [];
                    const filteredResults = results.filter((user: UserSearchResult) => {
                        if (user.id === getCurrentUserId()) return false;
                        if (selectedUsers.some(u => u.id === user.id)) return false;
                        return true;
                    });
                    setUserResults(filteredResults);
                })
                .catch(() => {
                    setUserResults([]);
                });
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [userSearch, selectedUsers, getCurrentUserId]);

    async function createTeam(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            const response = await apiFetch("/teams", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    description,
                    memberIds: selectedUsers.map(u => u.id)
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
            setRolesByTeamId({ ...rolesByTeamId, [createdTeam.id]: "OWNER" });

            setName("");
            setDescription("");
            setSelectedUsers([]);
            setUserSearch("");

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

    function selectUser(user: UserSearchResult) {
        if (selectedUsers.some(u => u.id === user.id)) {
            return;
        }
        setSelectedUsers([...selectedUsers, user]);
        setUserSearch("");
        setUserResults([]);
    }

    function removeSelectedUser(userId: number) {
        setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
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
                showToast({
                    type: "error",
                    message: await parseApiError(response, "Takım silinemedi")
                });
                return;
            }

            setTeams(currentTeams => currentTeams.filter(team => team.id !== teamToDelete.id));
            showToast({
                type: "success",
                message: "Takım başarıyla silindi."
            });
            setTeamToDelete(null);
        } catch (error) {
            showToast({
                type: "error",
                message: getErrorMessage(error, "Takım silinemedi")
            });
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

                    <div className="autocomplete-field">
                        <label>Üyeler</label>
                        <input
                            aria-label="Üyeler"
                            type="text"
                            value={userSearch}
                            onChange={event => setUserSearch(event.target.value)}
                            autoComplete="off"
                            placeholder="Kişi ara..."
                        />
                        {userResults.length > 0 && (
                            <div className="autocomplete-list">
                                {userResults.map(user => (
                                    <button
                                        className="autocomplete-option"
                                        key={user.id}
                                        type="button"
                                        onClick={() => selectUser(user)}
                                    >
                                        {getFullName(user)}
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedUsers.length > 0 && (
                            <div className="selected-users-chips" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {selectedUsers.map(user => (
                                    <span key={user.id} className="chip" style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '4px 12px', fontSize: '13px' }}>
                                        {getFullName(user)}
                                        <button 
                                            type="button" 
                                            onClick={() => removeSelectedUser(user.id)}
                                            style={{ background: 'transparent', border: 'none', marginLeft: '6px', cursor: 'pointer', padding: '0 4px' }}
                                        >
                                            &times;
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <button className="button button-primary" type="submit">Takımı Oluştur</button>
                </form>
            </section>

            {
                teams.length === 0 ? (
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
                                                            <button className="button button-danger" onClick={() => setTeamToDelete(team)}>
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
                onConfirm={confirmDeleteTeam}
                onCancel={() => setTeamToDelete(null)}
            />
        </main>
    );
}

export default Teams;
