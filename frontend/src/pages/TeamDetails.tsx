import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
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
    userEmail?: string;
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

    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [role, setRole] = useState<TeamRole>("MEMBER");
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
    const [memberToTransfer, setMemberToTransfer] = useState<TeamMember | null>(null);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [removingMember, setRemovingMember] = useState(false);
    const [transferringOwner, setTransferringOwner] = useState(false);
    const [leavingTeam, setLeavingTeam] = useState(false);
    const [memberFeedback, setMemberFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [removeFeedback, setRemoveFeedback] = useState("");
    const [transferFeedback, setTransferFeedback] = useState("");
    const [leaveFeedback, setLeaveFeedback] = useState("");

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
    const canTransferOwnership = currentUserRole === "OWNER";

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
            setMemberFeedback({ type: "warning", message: "Bu işlem için yetkiniz yok" });
            return;
        }

        if (!selectedUser) {
            setMemberFeedback({ type: "warning", message: "Lütfen bir kullanıcı seçin" });
            return;
        }

        setMemberFeedback(null);
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
            .then(() => {
                getMembers();
                setSelectedUser(null);
                setUserSearch("");
                setUserResults([]);
                setRole("MEMBER");
                setMemberFeedback({ type: "success", message: "Üye takıma eklendi." });
            })
            .catch(error => {
                setMemberFeedback({ type: "error", message: getErrorMessage(error, "Üye eklenemedi") });
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

    function canTransferToMember(member: TeamMember) {
        return canTransferOwnership && member.userId !== currentUserId && member.role !== "OWNER";
    }

    function getInitials(member: TeamMember) {
        return member.userName
            ?.split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.slice(0, 1).toUpperCase())
            .join("") || "US";
    }

    function getMemberEmailLabel(member: TeamMember) {
        return member.userEmail?.trim() || "E-posta bilgisi yok";
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
                setRemoveFeedback(await parseApiError(response, "Üye çıkarılamadı"));
                return;
            }

            setMembers(currentMembers => currentMembers.filter(currentMember => currentMember.id !== memberToRemove.id));
            setMemberFeedback({ type: "success", message: "Üye takımdan çıkarıldı." });
            setMemberToRemove(null);
        } catch (error) {
            setRemoveFeedback(getErrorMessage(error, "Üye çıkarılamadı"));
        } finally {
            setRemovingMember(false);
        }
    }

    async function confirmTransferOwnership() {
        if (!memberToTransfer || transferringOwner) {
            return;
        }

        setTransferringOwner(true);

        try {
            const response = await apiFetch(`/teams/${id}/members/${memberToTransfer.userId}/owner`, {
                method: "PUT"
            });

            if (!response.ok) {
                setTransferFeedback(await parseApiError(response, "Takım sahipliği devredilemedi"));
                return;
            }

            const updatedMembers: unknown = await response.json();
            setMembers(Array.isArray(updatedMembers) ? updatedMembers : []);
            setMemberFeedback({ type: "success", message: "Takım sahipliği devredildi." });
            setMemberToTransfer(null);
        } catch (error) {
            setTransferFeedback(getErrorMessage(error, "Takım sahipliği devredilemedi"));
        } finally {
            setTransferringOwner(false);
        }
    }

    async function confirmLeaveTeam() {
        if (leavingTeam) {
            return;
        }

        setLeavingTeam(true);

        try {
            const response = await apiFetch(`/teams/${id}/members/me`, {
                method: "DELETE"
            });

            if (!response.ok) {
                const message = await parseApiError(response, "Takımdan ayrılamadınız");
                setLeaveFeedback(message);
                return;
            }

            setLeaveModalOpen(false);
            navigate("/teams", { replace: true });
        } catch (error) {
            const message = getErrorMessage(error, "Takımdan ayrılamadınız");
            setLeaveFeedback(message);
        } finally {
            setLeavingTeam(false);
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

                {
                    currentMember && (
                        <button
                            className="button button-danger team-leave-button"
                            type="button"
                            onClick={() => {
                                setLeaveFeedback("");
                                setLeaveModalOpen(true);
                            }}
                        >
                            Takımdan Ayrıl
                        </button>
                    )
                }
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
                                    aria-label="Rol"
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
                                {memberFeedback && <InlineFeedback type={memberFeedback.type} message={memberFeedback.message} />}
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
                                <div className={member.role === "OWNER" ? "member-card team-member-card is-owner" : "member-card team-member-card"} key={member.id}>
                                    <div className="user-avatar">{getInitials(member)}</div>

                                    <div className="team-member-main">
                                        <h3>{member.userName}</h3>
                                        <p>{getMemberEmailLabel(member)}</p>
                                    </div>

                                    <div className="team-member-meta">
                                        <span className={member.role === "OWNER" ? "badge badge-purple" : "badge badge-blue"}>
                                            {getTeamRoleLabel(member.role)}
                                        </span>
                                        {member.userId === currentUserId && <span className="badge badge-green">Siz</span>}
                                    </div>

                                    <div className="team-member-actions">
                                        {
                                            canTransferToMember(member) && (
                                                <button
                                                    className="button button-secondary"
                                                    type="button"
                                                    onClick={() => {
                                                        setTransferFeedback("");
                                                        setMemberToTransfer(member);
                                                    }}
                                                >
                                                    Sahipliği Devret
                                                </button>
                                            )
                                        }
                                        {
                                            canRemoveMember(member) && (
                                            <button
                                                className="button button-danger"
                                                type="button"
                                                onClick={() => {
                                                    setRemoveFeedback("");
                                                    setMemberToRemove(member);
                                                }}
                                            >
                                                Çıkar
                                            </button>
                                            )
                                        }
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
                errorMessage={removeFeedback}
                onConfirm={confirmRemoveMember}
                onCancel={() => {
                    setRemoveFeedback("");
                    setMemberToRemove(null);
                }}
            />
            <ConfirmModal
                open={memberToTransfer !== null}
                title="Takım sahipliğini devret"
                message={`Takım sahipliğini ${memberToTransfer?.userName ?? "bu kullanıcı"} kullanıcısına devretmek istediğinizden emin misiniz? Devretme sonrası rolünüz Yönetici olacaktır.`}
                confirmLabel={transferringOwner ? "Devrediliyor" : "Sahipliği Devret"}
                variant="warning"
                loading={transferringOwner}
                errorMessage={transferFeedback}
                onConfirm={confirmTransferOwnership}
                onCancel={() => {
                    setTransferFeedback("");
                    setMemberToTransfer(null);
                }}
            />
            <ConfirmModal
                open={leaveModalOpen}
                title="Takımdan ayrıl"
                message={
                    currentUserRole === "OWNER"
                        ? "Takımdan ayrılmadan önce takım sahipliğini başka bir üyeye devretmeniz gerekir."
                        : "Bu takımdan ayrılmak istediğinizden emin misiniz?"
                }
                confirmLabel={leavingTeam ? "Ayrılıyor" : "Takımdan Ayrıl"}
                variant="danger"
                loading={leavingTeam}
                errorMessage={leaveFeedback}
                onConfirm={confirmLeaveTeam}
                onCancel={() => {
                    setLeaveFeedback("");
                    setLeaveModalOpen(false);
                }}
            />
        </main>
    );
}

export default TeamDetails;
