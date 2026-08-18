import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
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
    username?: string;
    teamId: number;
    teamName: string;
    role: TeamRole;
    joinedDate: string;
}

type UserSearchResult = {
    id: number;
    name: string;
    surname: string;
    username: string;
    email?: string;
    profileImageUrl?: string;
}

type StoredUser = {
    id: number;
}

type TeamInvitationResponse = {
    id: number;
    teamId: number;
    teamName: string;
    invitedByFullName: string;
    invitedUserFullName: string;
    status: string;
    createdAt: string;
}

function TeamDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [pendingInvitations, setPendingInvitations] = useState<TeamInvitationResponse[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
    const [removingMember, setRemovingMember] = useState(false);
    const [memberToPromote, setMemberToPromote] = useState<TeamMember | null>(null);
    const [promotingMember, setPromotingMember] = useState(false);
    const [memberToTransfer, setMemberToTransfer] = useState<TeamMember | null>(null);
    const [transferringOwnership, setTransferringOwnership] = useState(false);

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


    function getFullName(user: UserSearchResult) {
        return `${user.name} ${user.surname} (@${user.username})`;
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
                
                apiFetch(`/teams/${id}/invitations`)
                    .then(res => {
                        if (res.ok) return res.json();
                        return [];
                    })
                    .then(invData => setPendingInvitations(invData))
                    .catch(() => setPendingInvitations([]));
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

        apiFetch(`/team-invitations/team/${id}`, {
            method: "POST",
            body: JSON.stringify({
                invitedUserId: selectedUser.id
            })
        })
            .then(response => {
                if (!response.ok) {
                    return parseApiError(response, "Davet gönderilemedi")
                        .then(errorMessage => {
                            throw new Error(errorMessage);
                        });
                }
            })
            .then(() => {
                apiFetch(`/team-invitations/team/${id}`)
                    .then(res => res.ok ? res.json() : [])
                    .then(invData => setPendingInvitations(invData))
                    .catch(() => {});
                    
                setSelectedUser(null);
                setUserSearch("");
                setUserResults([]);
                showToast({ type: "success", message: "Takım daveti gönderildi." });
            })
            .catch(error => {
                showToast({
                    type: "error",
                    message: getErrorMessage(error, "Davet gönderilemedi")
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

    function canPromoteMember(member: TeamMember) {
        if (currentUserRole !== "OWNER") return false;
        if (member.userId === currentUserId) return false;
        return member.role === "MEMBER";
    }

    function canTransferOwnership(member: TeamMember) {
        if (currentUserRole !== "OWNER") return false;
        if (member.userId === currentUserId) return false;
        return member.role === "MEMBER" || member.role === "ADMIN";
    }

    async function confirmRemoveMember() {
        if (!memberToRemove || removingMember) {
            return;
        }

        setRemovingMember(true);

        try {
            const response = await apiFetch(`/teams/${id}/members/${memberToRemove.userId}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                showToast({
                    type: "error",
                    message: await parseApiError(response, "Üye çıkarılamadı")
                });
                return;
            }

            setMembers(currentMembers => currentMembers.filter(currentMember => currentMember.id !== memberToRemove.id));
            showToast({
                type: "success",
                message: "Üye takımdan çıkarıldı."
            });
            setMemberToRemove(null);
        } catch (error) {
            showToast({
                type: "error",
                message: getErrorMessage(error, "Üye çıkarılamadı")
            });
        } finally {
            setRemovingMember(false);
        }
    }

    async function confirmPromoteMember() {
        if (!memberToPromote || promotingMember) return;
        setPromotingMember(true);
        try {
            const response = await apiFetch(`/teams/${id}/members/${memberToPromote.userId}/admin`, { method: "PUT" });
            if (!response.ok) {
                showToast({ type: "error", message: await parseApiError(response, "Üye yönetici yapılamadı") });
                return;
            }
            const updatedMember: TeamMember = await response.json();
            setMembers(current => current.map(m => m.id === updatedMember.id ? updatedMember : m));
            showToast({ type: "success", message: "Üye başarıyla yönetici yapıldı." });
            setMemberToPromote(null);
        } catch (error) {
            showToast({ type: "error", message: getErrorMessage(error, "İşlem başarısız") });
        } finally {
            setPromotingMember(false);
        }
    }

    async function confirmTransferOwnership() {
        if (!memberToTransfer || transferringOwnership) return;
        setTransferringOwnership(true);
        try {
            const response = await apiFetch(`/teams/${id}/members/${memberToTransfer.userId}/owner`, { method: "PUT" });
            if (!response.ok) {
                showToast({ type: "error", message: await parseApiError(response, "Sahiplik devredilemedi") });
                return;
            }
            const updatedMembers: TeamMember[] = await response.json();
            setMembers(current => {
                const newMembers = [...current];
                for (const updated of updatedMembers) {
                    const idx = newMembers.findIndex(m => m.id === updated.id);
                    if (idx !== -1) newMembers[idx] = updated;
                }
                return newMembers;
            });
            showToast({ type: "success", message: "Takım sahipliği başarıyla devredildi." });
            setMemberToTransfer(null);
        } catch (error) {
            showToast({ type: "error", message: getErrorMessage(error, "İşlem başarısız") });
        } finally {
            setTransferringOwnership(false);
        }
    }

    return (
        <main className="page-shell app-page team-details-page">
            <section className="hero-card team-profile app-page-header">
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
                                        aria-label="Kullanıcı Ara"
                                        placeholder="Kullanıcı adı veya e-posta ile ara..."
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
                                                            style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "8px 12px" }}
                                                        >
                                                            <div style={{ fontWeight: 500 }}>{getFullName(user)}</div>
                                                            <div style={{ fontSize: "0.85em", color: "var(--text-muted, #888)" }}>
                                                                @{user.username} {user.email && `· ${user.email}`}
                                                            </div>
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )
                                    }

                                    {
                                        selectedUser && (
                                            <div className="selected-user" style={{ marginTop: "12px", padding: "12px", background: "var(--surface-low)", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                                <div style={{ fontWeight: 500 }}>{getFullName(selectedUser)}</div>
                                                <div style={{ fontSize: "0.85em", color: "var(--text-muted, #888)" }}>
                                                    @{selectedUser.username} {selectedUser.email && `· ${selectedUser.email}`}
                                                </div>
                                            </div>
                                        )
                                    }
                                </div>

                                <button className="button button-primary button-full" type="submit">Davet Gönder</button>
                            </form>
                        </div>
                    )
                }

                {
                    canManageMembers && pendingInvitations.length > 0 && (
                        <div className="panel">
                            <div className="section-heading">
                                <span className="eyebrow">Davetler</span>
                                <h2>Bekleyen Davetler</h2>
                            </div>
                            {pendingInvitations.map(inv => (
                                <div className="member-card team-member-card" key={inv.id}>
                                    <div className="user-avatar">{inv.invitedUserFullName.substring(0, 2).toUpperCase()}</div>
                                    <div className="team-member-main">
                                        <h3>{inv.invitedUserFullName}</h3>
                                        <p>Davet bekleniyor</p>
                                    </div>
                                    <div className="team-member-meta">
                                        <span className="badge badge-purple">Davet Edildi</span>
                                    </div>
                                    <div className="team-member-actions">
                                        <span className="cp-label">{new Date(inv.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
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
                                            {member.username ? `@${member.username}` : `Kullanıcı Id: ${member.userId}`}
                                            {member.userId === currentUserId ? " · Siz" : ""}
                                        </p>
                                    </div>

                                    <span className="badge badge-blue">{getTeamRoleLabel(member.role)}</span>

                                    {
                                        canRemoveMember(member) && (
                                            <button className="button button-danger" onClick={() => setMemberToRemove(member)}>
                                                Çıkar
                                            </button>
                                        )
                                    }
                                    {
                                        canPromoteMember(member) && (
                                            <button className="button button-primary" onClick={() => setMemberToPromote(member)} style={{ marginLeft: '8px' }}>
                                                Yönetici Yap
                                            </button>
                                        )
                                    }
                                    {
                                        canTransferOwnership(member) && (
                                            <button className="button button-secondary" onClick={() => setMemberToTransfer(member)} style={{ marginLeft: '8px' }}>
                                                Sahipliği Devret
                                            </button>
                                        )
                                    }
                                </div>
                            ))
                        )
                    }
                </div>
            </section>
            <ConfirmModal
                open={memberToRemove !== null}
                title="Üyeyi çıkar"
                message={`${memberToRemove?.userName ?? "Bu kullanıcı"} (${memberToRemove ? getTeamRoleLabel(memberToRemove.role) : "Üye"}) takımdan çıkarılacak. Devam etmek istiyor musunuz?`}
                confirmLabel={removingMember ? "Çıkarılıyor" : "Çıkar"}
                variant="danger"
                loading={removingMember}
                onConfirm={confirmRemoveMember}
                onCancel={() => setMemberToRemove(null)}
            />
            <ConfirmModal
                open={memberToPromote !== null}
                title="Yönetici Yap"
                message={`${memberToPromote?.userName ?? "Bu kullanıcı"} takım yöneticisi yapılacak. Devam etmek istiyor musunuz?`}
                confirmLabel={promotingMember ? "İşleniyor" : "Yönetici Yap"}
                loading={promotingMember}
                onConfirm={confirmPromoteMember}
                onCancel={() => setMemberToPromote(null)}
            />
            <ConfirmModal
                open={memberToTransfer !== null}
                title="Sahipliği Devret"
                message={`Takım sahipliğini ${memberToTransfer?.userName ?? "bu kullanıcı"} adlı kullanıcıya devretmek istediğinize emin misiniz? (Siz yönetici olarak kalacaksınız.)`}
                confirmLabel={transferringOwnership ? "İşleniyor" : "Devret"}
                variant="danger"
                loading={transferringOwnership}
                onConfirm={confirmTransferOwnership}
                onCancel={() => setMemberToTransfer(null)}
            />
        </main>
    );
}

export default TeamDetails;
