import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, getStoredUser } from "../api";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
import type { TeamRole } from "../types/team";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";
import "./CreateProject.css";

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
        <main className="page-shell app-page teams-page glass-page">
            <section className="page-header app-page-header">
                <div className="app-page-header-copy">
                    <span className="eyebrow">Takımlar</span>
                    <h1>Takımlarım</h1>
                    <p>Üyeleri, rolleri ve ekip odaklarını düzenli bir alanda yönet.</p>
                </div>
            </section>

            {/* Section 1: Takım Oluştur */}
            <section className="glass-section glass-section-accent-primary">
                <div className="glass-section-line primary"></div>
                <div className="cp-section-flex">
                    <div className="cp-section-left">
                        <div className="cp-icon-circle cp-icon-primary">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                        </div>
                        <div>
                            <div className="cp-step-badge primary">Yeni Takım</div>
                            <h2 className="cp-title text-on-surface dark:text-on-primary">Takım Oluştur</h2>
                        </div>
                    </div>
                    <div className="cp-section-right">
                        <form onSubmit={createTeam}>
                            <div className="cp-grid-2">
                                <div className="cp-input-group">
                                    <label>Takım Adı</label>
                                    <input type="text" className="ghost-input" value={name} onChange={event => setName(event.target.value)} required />
                                </div>
                                <div className="cp-input-group">
                                    <label>Açıklama</label>
                                    <input type="text" className="ghost-input" value={description} onChange={event => setDescription(event.target.value)} required />
                                </div>
                            </div>
                            <div className="cp-actions" style={{ marginTop: "24px", justifyContent: "flex-start" }}>
                                <button className="cp-btn-gradient" type="submit">
                                    Takım Oluştur
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: "8px" }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                </button>
                            </div>
                            {createFeedback && <div style={{marginTop: "16px"}}><InlineFeedback type={createFeedback.type} message={createFeedback.message} /></div>}
                        </form>
                    </div>
                </div>
            </section>
            
            {sectionFeedback && <div style={{marginTop: "16px", marginBottom: "16px"}}><InlineFeedback type={sectionFeedback.type} message={sectionFeedback.message} /></div>}

            {/* Section 2: Mevcut Takımlar */}
            {sectionFeedback?.type !== "error" && (
                <section className="glass-section glass-section-accent-secondary" style={{ marginTop: "32px" }}>
                    <div className="glass-section-line secondary"></div>
                    <div className="cp-section-flex">
                        <div className="cp-section-left">
                            <div className="cp-icon-circle cp-icon-secondary">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            </div>
                            <div>
                                <div className="cp-step-badge secondary">Liste</div>
                                <h2 className="cp-title text-on-surface dark:text-on-primary">Mevcut Takımlar</h2>
                            </div>
                        </div>
                        <div className="cp-section-right">
                            {teams.length === 0 ? (
                                <p className="empty-state app-empty-state">Henüz takım yok</p>
                            ) : (
                                <div className="cp-grid-2">
                                    {teams.map(team => (
                                        <div className="cp-radio-tile" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }} key={team.id}>
                                            {editingTeamId === team.id ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                                                    <input type="text" className="ghost-input" value={editName} onChange={event => setEditName(event.target.value)} />
                                                    <input type="text" className="ghost-input" value={editDescription} onChange={event => setEditDescription(event.target.value)} />
                                                    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                                                        <button type="button" className="cp-btn-gradient" style={{ padding: "8px 16px", flex: 1, minHeight: "36px" }} onClick={() => updateTeam(team)}>Kaydet</button>
                                                        <button type="button" className="cp-btn-cancel" style={{ padding: "8px 16px", flex: 1, minHeight: "36px" }} onClick={cancelEdit}>Vazgeç</button>
                                                    </div>
                                                    {editFeedback && <InlineFeedback type={editFeedback.type} message={editFeedback.message} />}
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--tt-text)", margin: "0 0 4px 0" }}>{team.name}</h3>
                                                        <p style={{ fontSize: "14px", color: "var(--tt-text-secondary)", margin: 0 }}>{team.description}</p>
                                                    </div>
                                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "auto" }}>
                                                        <button type="button" className="cp-btn-gradient" style={{ padding: "6px 12px", fontSize: "13px", minHeight: "32px", flex: 1 }} onClick={() => navigate(`/teams/${team.id}`)}>Üyeleri Gör</button>
                                                        {(rolesByTeamId[team.id] === "OWNER" || rolesByTeamId[team.id] === "ADMIN") && (
                                                            <button type="button" className="cp-btn-cancel" style={{ padding: "6px 12px", fontSize: "13px", minHeight: "32px" }} onClick={() => startEdit(team)}>Düzenle</button>
                                                        )}
                                                        {rolesByTeamId[team.id] === "OWNER" && (
                                                            <button type="button" className="cp-btn-cancel" style={{ padding: "6px 12px", fontSize: "13px", minHeight: "32px", color: "var(--tt-danger, #e11d48)" }} onClick={() => { setDeleteFeedback(""); setTeamToDelete(team); }}>Sil</button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

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
