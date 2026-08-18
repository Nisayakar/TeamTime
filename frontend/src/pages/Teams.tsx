import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import { useToast } from "../context/toast";
import type { TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";
import { subscribeToSync, broadcastSyncEvent } from "../sync";
import "./Teams.css";

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
    name: string;
    surname: string;
    username: string;
    email?: string;
    profileImageUrl?: string;
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
            return user.username || user.email || "";
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
        const unsubscribe = subscribeToSync((event) => {
            if (event.type === "TEAM_CHANGED") {
                getTeams();
            }
        });
        return unsubscribe;
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
            broadcastSyncEvent("TEAM_CHANGED", { teamId: createdTeam.id });
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
        broadcastSyncEvent("TEAM_CHANGED", { teamId: updatedTeam.id });
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
            broadcastSyncEvent("TEAM_CHANGED", { teamId: teamToDelete.id });
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

            <div className="teams-layout-grid">
                {/* Sol oluşturma formu */}
                <section className="teams-create-sidebar">
                    <div className="section-heading" style={{ marginBottom: "20px" }}>
                        <span className="eyebrow">Yeni takım</span>
                        <h2>Takım oluştur</h2>
                    </div>

                    <form onSubmit={createTeam}>
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
                                placeholder="Kullanıcı adı veya e-posta ile ara..."
                            />
                            {userResults.length > 0 && (
                                <div className="autocomplete-list">
                                    {userResults.map(user => (
                                        <button
                                            className="autocomplete-option"
                                            key={user.id}
                                            type="button"
                                            onClick={() => selectUser(user)}
                                            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "8px 12px" }}
                                        >
                                            <div style={{ fontWeight: 500 }}>{getFullName(user)}</div>
                                            <div style={{ fontSize: "0.85em", color: "var(--text-muted, #888)" }}>
                                                @{user.username} {user.email && `· ${user.email}`}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedUsers.length > 0 && (
                                <div className="selected-users-chips">
                                    {selectedUsers.map(user => (
                                        <span key={user.id} className="chip">
                                            {getFullName(user)} &middot; @{user.username}
                                            <button 
                                                type="button" 
                                                onClick={() => removeSelectedUser(user.id)}
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button className="button button-primary button-full" type="submit" style={{ marginTop: "10px" }}>Takımı Oluştur</button>
                    </form>
                </section>

                {/* Sağ mevcut takımlar listesi */}
                <section className="teams-list-content">
                    <div className="teams-list-header">
                        <h2>Mevcut Takımlar</h2>
                    </div>

                    {
                        teams.length === 0 ? (
                            <p className="empty-state app-empty-state">Henüz takım yok</p>
                        ) : (
                            <div className="teams-grid-container">
                                {
                                    teams.map(team => (
                                        <article className="team-glass-card" key={team.id}>
                                            {
                                                editingTeamId === team.id ? (
                                                    <div className="team-card-edit-form">
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <input
                                                                type="text"
                                                                value={editName}
                                                                onChange={event => setEditName(event.target.value)}
                                                                placeholder="Takım Adı"
                                                            />

                                                            <input
                                                                type="text"
                                                                value={editDescription}
                                                                onChange={event => setEditDescription(event.target.value)}
                                                                placeholder="Açıklama"
                                                            />
                                                        </div>

                                                        <div className="button-row" style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                                            <button className="button button-primary button-sm" onClick={() => updateTeam(team)}>
                                                                Kaydet
                                                            </button>

                                                            <button className="button button-secondary button-sm" onClick={cancelEdit}>
                                                                Vazgeç
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div>
                                                            <div className="team-card-header">
                                                                <div className="team-card-info-wrap">
                                                                    <div className="team-card-avatar">
                                                                        {team.name.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="team-card-meta">
                                                                        <h3>{team.name}</h3>
                                                                        {rolesByTeamId[team.id] && (
                                                                            <span className="role-badge">
                                                                                {rolesByTeamId[team.id] === "OWNER" ? "Takım Sahibi" :
                                                                                 rolesByTeamId[team.id] === "ADMIN" ? "Yönetici" : "Üye"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <p className="team-card-description">{team.description}</p>
                                                        </div>

                                                        <div className="team-card-actions">
                                                            <button className="button button-primary button-sm" onClick={() => navigate(`/teams/${team.id}`)}>
                                                                Üyeleri Gör
                                                            </button>

                                                            {
                                                                (rolesByTeamId[team.id] === "OWNER" || rolesByTeamId[team.id] === "ADMIN") && (
                                                                    <button className="button button-secondary button-sm" onClick={() => startEdit(team)}>
                                                                        Düzenle
                                                                    </button>
                                                                )
                                                            }

                                                            {
                                                                rolesByTeamId[team.id] === "OWNER" && (
                                                                    <button className="button button-danger button-sm" onClick={() => setTeamToDelete(team)}>
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
                            </div>
                        )
                    }
                </section>
            </div>

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
