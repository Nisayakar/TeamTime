import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import InlineFeedback from "../components/ui/InlineFeedback";

type TeamInvitation = {
    invitationId: number;
    teamId: number;
    teamName: string;
    inviterName: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    createdAt: string;
};

export default function TeamInvitations() {
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const navigate = useNavigate();

    const fetchInvitations = useCallback(async () => {
        setIsLoading(true);
        setFeedback(null);
        try {
            const response = await apiFetch("/team-invitations");
            if (!response.ok) {
                if (response.status === 401) {
                    navigate("/login");
                    return;
                }
                throw new Error("Davetler yüklenemedi.");
            }
            const data = await response.json();
            setInvitations(data);
        } catch {
            setFeedback({ type: "error", message: "Sunucu bağlantı hatası." });
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    async function handleAccept(id: number) {
        setFeedback(null);
        try {
            const response = await apiFetch(`/team-invitations/${id}/accept`, { method: "POST" });
            if (!response.ok) {
                throw new Error();
            }
            navigate("/teams");
        } catch {
            setFeedback({ type: "error", message: "Davet kabul edilemedi." });
        }
    }

    async function handleReject(id: number) {
        setFeedback(null);
        try {
            const response = await apiFetch(`/team-invitations/${id}/reject`, { method: "POST" });
            if (!response.ok) {
                throw new Error();
            }
            navigate("/teams");
        } catch {
            setFeedback({ type: "error", message: "Davet reddedilemedi." });
        }
    }

    return (
        <main className="page-shell app-page glass-page">
            <section className="page-header app-page-header">
                <div className="app-page-header-copy">
                    <span className="eyebrow">Davetler</span>
                    <h1>Takım Davetleri</h1>
                    <p>Sizi takımlarına katılmaya davet eden kişilerin isteklerini buradan yönetin.</p>
                </div>
            </section>

            <section className="glass-section glass-section-accent-primary" style={{ marginTop: "32px" }}>
                <div className="glass-section-line primary"></div>
                <div className="cp-section-flex">
                    <div className="cp-section-left">
                        <div className="cp-icon-circle cp-icon-primary">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div>
                            <div className="cp-step-badge primary">Bekleyen</div>
                            <h2 className="cp-title text-on-surface dark:text-on-primary">Davet Listesi</h2>
                        </div>
                    </div>
                    <div className="cp-section-right">
                        {feedback && (
                            <div style={{ marginBottom: "16px" }}>
                                <InlineFeedback type={feedback.type} message={feedback.message} />
                            </div>
                        )}

                        {isLoading ? (
                            <p className="empty-state app-empty-state">Yükleniyor...</p>
                        ) : invitations.length === 0 ? (
                            <p className="empty-state app-empty-state">Bekleyen takım davetiniz bulunmuyor.</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {invitations.map(inv => (
                                    <div key={inv.invitationId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
                                        <div>
                                            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "var(--text)" }}>{inv.teamName}</h3>
                                            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                                                <strong>{inv.inviterName}</strong> sizi bu takıma davet etti.
                                            </p>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button 
                                                onClick={() => handleAccept(inv.invitationId)}
                                                type="button" 
                                                className="cp-btn-gradient" 
                                                style={{ padding: "6px 16px", minHeight: "36px", fontSize: "14px" }}
                                            >
                                                Kabul Et
                                            </button>
                                            <button 
                                                onClick={() => handleReject(inv.invitationId)}
                                                type="button" 
                                                className="cp-btn-cancel" 
                                                style={{ padding: "6px 16px", minHeight: "36px", fontSize: "14px" }}
                                            >
                                                Reddet
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
