import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getStoredUser } from "../api";
import { useToast } from "../context/toast";
import { getTeamRoleLabel, type TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";

type Team = {
    id: number;
    name: string;
    description: string;
    createdDate?: string;
}

type TeamMember = {
    id: number;
    userId: number;
    userName: string;
    teamId: number;
    teamName: string;
    role: TeamRole;
    joinedDate: string;
}

type UserSearchResult = {
    id: number;
    name: string;
    surname: string;
}

type StoredUser = {
    id: number;
}

function TeamDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [role, setRole] = useState<TeamRole>("MEMBER");

    useEffect(() => {
        const query = userSearch.trim();

        if (query === "" || selectedUser) {
            setUserResults([]);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            apiFetch(`/users/search?query=${encodeURIComponent(query)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error();
                    }

                    return response.json();
                })
                .then(data => {
                    setUserResults(Array.isArray(data) ? data.slice(0, 10) : []);
                })
                .catch(() => {
                    setUserResults([]);
                });
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [userSearch, selectedUser]);

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

    const currentUserId = getCurrentUserId();
    const currentMember = currentUserId === null
        ? undefined
        : members.find(member => member.userId === currentUserId);
    const currentUserRole = currentMember?.role;
    const canManageMembers = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
    const roleOptions: TeamRole[] = currentUserRole === "OWNER" ? ["MEMBER", "ADMIN"] : ["MEMBER"];

    function getFullName(user: UserSearchResult) {
        return `${user.name} ${user.surname}`;
    }

    function handleUserSearchChange(value: string) {
        setUserSearch(value);
        setSelectedUser(null);
    }

    function selectUser(user: UserSearchResult) {
        setSelectedUser(user);
        setUserSearch(getFullName(user));
        setUserResults([]);
    }

    const getTeam = useCallback(() => {
        apiFetch("/teams")
            .then(response => {
                if (!response.ok) {
                    if (navigateForInitialLoadError(response.status, navigate)) {
                        return null;
                    }

                    throw new Error();
                }

                return response.json();
            })
            .then(data => {
                if (data === null) {
                    return;
                }

                const teams = Array.isArray(data) ? data : [];
                const selectedTeam = teams.find((currentTeam: Team) => currentTeam.id === Number(id));

                if (!selectedTeam) {
                    navigate("/not-found", { replace: true });
                    return;
                }

                setTeam(selectedTeam ?? null);
            })
            .catch(() => {
                setTeam(null);
            });
    }, [id, navigate]);

    const getMembers = useCallback(() => {
        apiFetch(`/teams/${id}/members`)
            .then(response => {
                if (!response.ok) {
                    if (navigateForInitialLoadError(response.status, navigate)) {
                        return null;
                    }

                    throw new Error();
                }

                return response.json();
            })
            .then(data => {
                if (data === null) {
                    return;
                }

                setMembers(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                setMembers([]);
            });
    }, [id, navigate]);

    useEffect(() => {
        getTeam();
        getMembers();
    }, [getMembers, getTeam]);

    function addMember(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canManageMembers) {
            showToast({ type: "warning", message: "Bu işlem için yetkiniz yok" });
            return;
        }

        if (!selectedUser) {
            showToast({ type: "warning", message: "Lütfen bir kullanıcı seçin" });
            return;
        }

        const roleToSubmit: TeamRole = currentUserRole === "OWNER" ? role : "MEMBER";

        apiFetch(`/teams/${id}/members`, {
            method: "POST",
            body: JSON.stringify({
                userId: selectedUser.id,
                role: roleToSubmit
            })
        })
            .then(response => {
                if (!response.ok) {
                    return parseApiError(response, "Üye eklenemedi")
                        .then(errorMessage => {
                            throw new Error(errorMessage);
                        });
                }

                return response.json();
            })
            .then(createdMember => {
                setMembers([...members, createdMember]);
                setSelectedUser(null);
                setUserSearch("");
                setUserResults([]);
                setRole("MEMBER");
                showToast({ type: "success", message: "Üye takıma eklendi." });
            })
            .catch(error => {
                showToast({
                    type: "error",
                    message: getErrorMessage(error, "Üye eklenemedi")
                });
            });
    }

    function canRemoveMember(member: TeamMember) {
        if (currentUserRole === "OWNER") {
            return member.role !== "OWNER";
        }

        if (currentUserRole === "ADMIN") {
            return member.role === "MEMBER";
        }

        return false;
    }

    async function removeMember(member: TeamMember) {
        const response = await apiFetch(`/teams/${id}/members/${member.userId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showToast({
                type: "error",
                message: await parseApiError(response, "Üye çıkarılamadı")
            });
            return;
        }

        setMembers(members.filter(currentMember => currentMember.id !== member.id));
        showToast({ type: "success", message: "Üye takımdan çıkarıldı." });
    }

    return (
        <main className="page-shell">
            <section className="hero-card team-profile">
                <div className="profile-avatar">TM</div>

                <div>
                    <span className="eyebrow">Takım profili</span>
                    <h1>{team ? team.name : "Takım Detayları"}</h1>
                    <p>{team ? team.description : "Takım bilgisi bulunamadı"}</p>
                    <span className="badge badge-purple">{members.length} üye</span>
                </div>
            </section>

            <section className="content-grid two-columns">
                {
                    canManageMembers && (
                        <div className="panel">
                            <div className="section-heading">
                                <span className="eyebrow">Üyelik</span>
                                <h2>Yeni Üye Ekle</h2>
                            </div>

                            <form className="stacked-form" onSubmit={addMember}>
                                <div className="autocomplete-field">
                                    <label>Kullanıcı Ara</label>
                                    <input
                                        type="text"
                                        value={userSearch}
                                        onChange={event => handleUserSearchChange(event.target.value)}
                                        autoComplete="off"
                                        required
                                    />

                                    {
                                        userResults.length > 0 && (
                                            <div className="autocomplete-list">
                                                {
                                                    userResults.map(user => (
                                                        <button
                                                            className="autocomplete-option"
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => selectUser(user)}
                                                        >
                                                            {getFullName(user)}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )
                                    }

                                    {
                                        selectedUser && (
                                            <p className="selected-user">
                                                {getFullName(selectedUser)}
                                            </p>
                                        )
                                    }
                                </div>

                                <label>Rol</label>
                                <select
                                    value={currentUserRole === "OWNER" ? role : "MEMBER"}
                                    onChange={event => setRole(event.target.value as TeamRole)}
                                    required
                                >
                                    {
                                        roleOptions.map(roleOption => (
                                            <option value={roleOption} key={roleOption}>
                                                {getTeamRoleLabel(roleOption)}
                                            </option>
                                        ))
                                    }
                                </select>

                                <button className="button button-primary button-full" type="submit">Üye Ekle</button>
                            </form>
                        </div>
                    )
                }

                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Takım</span>
                        <h2>Takım Üyeleri</h2>
                    </div>

                    {
                        members.length === 0 ? (
                            <p className="empty-state">Bu takımda henüz üye yok</p>
                        ) : (
                            members.map(member => (
                                <div className="member-card" key={member.id}>
                                    <div className="user-avatar">{member.userName?.slice(0, 2).toUpperCase() || "US"}</div>

                                    <div>
                                        <h3>{member.userName}</h3>
                                        <p>
                                            Kullanıcı Id: {member.userId}
                                            {member.userId === currentUserId ? " · Siz" : ""}
                                        </p>
                                    </div>

                                    <span className="badge badge-blue">{getTeamRoleLabel(member.role)}</span>

                                    {
                                        canRemoveMember(member) && (
                                            <button className="button button-danger" onClick={() => removeMember(member)}>
                                                Çıkar
                                            </button>
                                        )
                                    }
                                </div>
                            ))
                        )
                    }
                </div>
            </section>
        </main>
    );
}

export default TeamDetails;
