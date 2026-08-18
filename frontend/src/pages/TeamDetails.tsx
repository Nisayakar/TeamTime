import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import { useToast } from "../context/toast";
import { getTeamRoleLabel, type TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";
import { subscribeToSync, broadcastSyncEvent } from "../sync";
import "./TeamDetails.css";

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
    invitationId: number;
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
    const [pendingInvitationsLoading, setPendingInvitationsLoading] = useState(true);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
    const [removingMember, setRemovingMember] = useState(false);
    const [memberToPromote, setMemberToPromote] = useState<TeamMember | null>(null);
    const [promotingMember, setPromotingMember] = useState(false);
    const [memberToTransfer, setMemberToTransfer] = useState<TeamMember | null>(null);
    const [transferringOwnership, setTransferringOwnership] = useState(false);
    const [invitationToRevoke, setInvitationToRevoke] = useState<TeamInvitationResponse | null>(null);
    const [revokingInvitation, setRevokingInvitation] = useState(false);
    const [memberToDemote, setMemberToDemote] = useState<TeamMember | null>(null);
    const [demotingMember, setDemotingMember] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingTeam, setDeletingTeam] = useState(false);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

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

    useEffect(() => {
        if (canManageMembers && id) {
            setPendingInvitationsLoading(true);
            apiFetch(`/team-invitations/team/${id}`)
                .then(res => {
                    if (res.ok) return res.json();
                    return [];
                })
                .then(invData => {
                    setPendingInvitations(invData);
                })
                .catch(() => {
                    setPendingInvitations([]);
                })
                .finally(() => {
                    setPendingInvitationsLoading(false);
                });
        } else {
            setPendingInvitations([]);
            setPendingInvitationsLoading(false);
        }
    }, [id, canManageMembers]);


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
            })
            .catch(() => {
                setMembers([]);
            });
    }, [id, navigate]);

    useEffect(() => {
        getTeam();
        getMembers();
    }, [getMembers, getTeam]);

    useEffect(() => {
        const unsubscribe = subscribeToSync((event) => {
            if (event.type === "TEAM_CHANGED") {
                const payload = event.payload as { teamId: number } | undefined;
                if (payload && payload.teamId === Number(id)) {
                    getTeam();
                    getMembers();
                }
            }
        });
        return unsubscribe;
    }, [id, getTeam, getMembers]);

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

    function canDemoteMember(member: TeamMember) {
        if (currentUserRole !== "OWNER") return false;
        if (member.userId === currentUserId) return false;
        return member.role === "ADMIN";
    }

    function canTransferOwnership(member: TeamMember) {
        if (currentUserRole !== "OWNER") return false;
        if (member.userId === currentUserId) return false;
        return member.role === "ADMIN";
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
            broadcastSyncEvent("TEAM_CHANGED", { teamId: Number(id) });
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
            broadcastSyncEvent("TEAM_CHANGED", { teamId: Number(id) });
        } catch (error) {
            showToast({ type: "error", message: getErrorMessage(error, "İşlem başarısız") });
        } finally {
            setPromotingMember(false);
        }
    }

    async function confirmDemoteMember() {
        if (!memberToDemote || demotingMember) return;
        setDemotingMember(true);
        try {
            const response = await apiFetch(`/teams/${id}/members/${memberToDemote.userId}/member`, { method: "PUT" });
            if (!response.ok) {
                showToast({ type: "error", message: await parseApiError(response, "Üye rütbesi düşürülemedi") });
                return;
            }
            const updatedMember: TeamMember = await response.json();
            setMembers(current => current.map(m => m.id === updatedMember.id ? updatedMember : m));
            showToast({ type: "success", message: "Üye başarıyla üyeliğe düşürüldü." });
            setMemberToDemote(null);
            broadcastSyncEvent("TEAM_CHANGED", { teamId: Number(id) });
        } catch (error) {
            showToast({ type: "error", message: getErrorMessage(error, "İşlem başarısız") });
        } finally {
            setDemotingMember(false);
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
            broadcastSyncEvent("TEAM_CHANGED", { teamId: Number(id) });
        } catch (error) {
            showToast({ type: "error", message: getErrorMessage(error, "İşlem başarısız") });
        } finally {
            setTransferringOwnership(false);
        }
    }

    async function confirmRevokeInvitation() {
        if (!invitationToRevoke || revokingInvitation) return;
        setRevokingInvitation(true);
        try {
            const response = await apiFetch(`/team-invitations/${invitationToRevoke.invitationId}`, { method: "DELETE" });
            if (!response.ok) {
                showToast({ type: "error", message: await parseApiError(response, "Davet geri çekilemedi") });
                return;
            }
            setPendingInvitations(current => current.filter(inv => inv.invitationId !== invitationToRevoke.invitationId));
            showToast({ type: "success", message: "Takım daveti geri çekildi." });
            setInvitationToRevoke(null);
        } catch (error) {
            showToast({ type: "error", message: getErrorMessage(error, "Davet geri çekilemedi") });
        } finally {
            setRevokingInvitation(false);
        }
    }

    async function confirmDeleteTeam() {
        if (!team || deletingTeam) return;

        setDeletingTeam(true);
        setDeleteErrorMessage("");

        try {
            const response = await apiFetch(`/teams/${team.id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const errMsg = await parseApiError(response, "Takım silinemedi");
                setDeleteErrorMessage(errMsg);
                return;
            }

            showToast({
                type: "success",
                message: "Takım başarıyla silindi."
            });
            broadcastSyncEvent("TEAM_CHANGED", { teamId: team.id });
            setIsDeleteModalOpen(false);
            navigate("/teams");
        } catch (error) {
            setDeleteErrorMessage(getErrorMessage(error, "Takım silinemedi"));
        } finally {
            setDeletingTeam(false);
        }
    }

    return (
        <main className="page-shell app-page team-details-page">
            <section className="team-header-card">
                <div className="team-header-main">
                    <div className="team-header-avatar">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <div className="team-header-info">
                        <span className="eyebrow">Takım Profili</span>
                        <h1>{team ? team.name : "Takım Detayları"}</h1>
                        <p>{team?.description || "Takım açıklaması belirtilmemiş."}</p>
                        <div className="team-header-badges">
                            <span className="badge badge-purple">{members.length} Üye</span>
                            {currentUserRole && (
                                <span className={`badge ${currentUserRole === "OWNER" ? "badge-red" : currentUserRole === "ADMIN" ? "badge-purple" : "badge-blue"}`}>
                                    Rolünüz: {getTeamRoleLabel(currentUserRole)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {
                    currentUserRole === "OWNER" && (
                        <button
                            className="button button-danger"
                            onClick={() => {
                                setDeleteErrorMessage("");
                                setIsDeleteModalOpen(true);
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px", display: "inline-block", verticalAlign: "middle" }}>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Takımı Sil
                        </button>
                    )
                }
            </section>

            {canManageMembers && (
                <section className="team-actions-grid">
                    <div className="team-details-panel">
                        <div className="section-heading">
                            <span className="eyebrow">Üyelik</span>
                            <h2>Yeni Üye Ekle</h2>
                        </div>
                        <p className="section-description">Takıma davet etmek için organizasyon içindeki kullanıcıları arayın.</p>

                        <form className="stacked-form" onSubmit={addMember}>
                            <div className="autocomplete-field">
                                <label>Kullanıcı Ara</label>
                                <div className="input-with-icon">
                                    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        aria-label="Kullanıcı Ara"
                                        placeholder="Kullanıcı adı veya e-posta ile ara..."
                                        type="text"
                                        value={userSearch}
                                        onChange={event => handleUserSearchChange(event.target.value)}
                                        autoComplete="off"
                                        required
                                    />
                                </div>

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
                                                        <div className="option-name">{getFullName(user)}</div>
                                                        <div className="option-sub">
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
                                        <div className="selected-user-box">
                                            <div className="box-name">{getFullName(selectedUser)}</div>
                                            <div className="box-sub">
                                                @{selectedUser.username} {selectedUser.email && `· ${selectedUser.email}`}
                                            </div>
                                        </div>
                                    )
                                }
                            </div>

                            <button className="button button-primary button-full" type="submit">Davet Gönder</button>
                        </form>
                    </div>

                    <div className="team-details-panel">
                        <div className="section-heading">
                            <span className="eyebrow">Davetler</span>
                            <h2>Bekleyen Davetler</h2>
                        </div>
                        <p className="section-description">Gönderilen ve henüz yanıtlanmamış üyelik davetleri.</p>
                        
                        <div className="invitations-list-wrapper">
                            {pendingInvitationsLoading ? (
                                <p className="empty-state">Yükleniyor...</p>
                            ) : pendingInvitations.length === 0 ? (
                                <p className="empty-state">Bekleyen davet yok</p>
                            ) : (
                                pendingInvitations.map(inv => (
                                    <div className="invitation-item-row" key={inv.invitationId}>
                                        <div className="invitation-user-info">
                                            <div className="invitation-avatar">{inv.invitedUserFullName.substring(0, 2).toUpperCase()}</div>
                                            <div>
                                                <h3>{inv.invitedUserFullName}</h3>
                                                <p>{new Date(inv.createdAt).toLocaleDateString()} tarihinde davet edildi</p>
                                            </div>
                                        </div>
                                        <div className="invitation-actions">
                                            <button className="button button-danger button-sm" onClick={() => setInvitationToRevoke(inv)}>
                                                Geri Çek
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            )}

            <section className="team-members-panel">
                <div className="panel-header-row">
                    <div className="section-heading">
                        <span className="eyebrow">Takım</span>
                        <h2>Takım Üyeleri</h2>
                    </div>
                </div>

                <div className="members-list-wrapper">
                    {
                        members.length === 0 ? (
                            <p className="empty-state">Bu takımda henüz üye yok</p>
                        ) : (
                            members.map(member => (
                                <div className="member-list-item" key={member.id}>
                                    <div className="member-user-info">
                                        <div className="member-avatar">
                                            {member.userName?.slice(0, 2).toUpperCase() || "US"}
                                        </div>
                                        <div>
                                            <h3>
                                                {member.userName}
                                                {member.userId === currentUserId && <span className="self-badge">Siz</span>}
                                            </h3>
                                            <p>
                                                {member.username ? `@${member.username}` : `Kullanıcı ID: ${member.userId}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="member-actions-wrapper">
                                        <span className={`badge ${member.role === "OWNER" ? "badge-red" : member.role === "ADMIN" ? "badge-purple" : "badge-blue"}`}>
                                            {getTeamRoleLabel(member.role)}
                                        </span>

                                        <div className="member-buttons-group">
                                            {
                                                canRemoveMember(member) && (
                                                    <button className="button button-danger button-sm" onClick={() => setMemberToRemove(member)}>
                                                        Çıkar
                                                    </button>
                                                )
                                            }
                                            {
                                                canPromoteMember(member) && (
                                                    <button className="button button-primary button-sm" onClick={() => setMemberToPromote(member)}>
                                                        Yönetici Yap
                                                    </button>
                                                )
                                            }
                                            {
                                                canDemoteMember(member) && (
                                                    <button className="button button-secondary button-sm" onClick={() => setMemberToDemote(member)}>
                                                        Üyeye Düşür
                                                    </button>
                                                )
                                            }
                                            {
                                                canTransferOwnership(member) && (
                                                    <button className="button button-secondary button-sm" onClick={() => setMemberToTransfer(member)}>
                                                        Sahipliği Devret
                                                    </button>
                                                )
                                            }
                                        </div>
                                    </div>
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
                open={memberToDemote !== null}
                title="Üyeliğe Düşür"
                message={`${memberToDemote?.userName ?? "Bu kullanıcı"} takım üyeliğine düşürülecek. Devam etmek istiyor musunuz?`}
                confirmLabel={demotingMember ? "İşleniyor" : "Üyeye Düşür"}
                loading={demotingMember}
                onConfirm={confirmDemoteMember}
                onCancel={() => setMemberToDemote(null)}
            />
            <ConfirmModal
                open={memberToTransfer !== null}
                title="Sahipliği Devret"
                message={`Takım sahipliğini @${memberToTransfer?.username ?? memberToTransfer?.userName} kullanıcısına devretmek istediğinize emin misiniz?`}
                confirmLabel={transferringOwnership ? "İşleniyor" : "Devret"}
                variant="danger"
                loading={transferringOwnership}
                onConfirm={confirmTransferOwnership}
                onCancel={() => setMemberToTransfer(null)}
            />
            <ConfirmModal
                open={invitationToRevoke !== null}
                title="Daveti Geri Çek"
                message={`${invitationToRevoke?.invitedUserFullName} adlı kullanıcıya gönderilen takım davetini geri çekmek istediğinize emin misiniz?`}
                confirmLabel={revokingInvitation ? "Geri Çekiliyor" : "Daveti Geri Çek"}
                variant="danger"
                loading={revokingInvitation}
                onConfirm={confirmRevokeInvitation}
                onCancel={() => setInvitationToRevoke(null)}
            />
            <ConfirmModal
                open={isDeleteModalOpen}
                title="Takımı Sil"
                message={`"${team?.name ?? "Bu takım"}" adlı takımı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
                confirmLabel={deletingTeam ? "Siliniyor" : "Sil"}
                variant="danger"
                loading={deletingTeam}
                errorMessage={deleteErrorMessage}
                onConfirm={confirmDeleteTeam}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteErrorMessage("");
                }}
            />
        </main>
    );
}

export default TeamDetails;

