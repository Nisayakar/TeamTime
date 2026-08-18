import { useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "../api";
import { getErrorMessage } from "../utils/apiError";
import InlineFeedback from "./ui/InlineFeedback";

export type TaskDetailModalProps = {
    open: boolean;
    task: any;
    onClose: () => void;
};

type Comment = {
    id: number;
    taskId: number;
    authorId: number;
    authorName: string;
    authorUsername: string;
    content: string;
    createdAt: string;
};

type HistoryItem = {
    id: number;
    taskId: number;
    assignedById: number | null;
    assignedByName: string;
    assignedByUsername: string | null;
    assignedToId: number | null;
    assignedToName: string | null;
    assignedToUsername: string | null;
    eventType: "ASSIGNED" | "ACCEPTED" | "REJECTED" | "UNASSIGNED" | "REASSIGNED";
    reason: string | null;
    createdAt: string;
};

export default function TaskDetailModal({ open, task, onClose }: TaskDetailModalProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [commentFeedback, setCommentFeedback] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [attachments, setAttachments] = useState<any[]>([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [attachmentFeedback, setAttachmentFeedback] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

    const [activeTab, setActiveTab] = useState<"comments" | "history" | "attachments">("comments");

    const currentUser = getStoredUser();
    const currentUserId = currentUser ? currentUser.id : null;

    useEffect(() => {
        if (open && task) {
            loadComments();
            loadHistory();
            loadAttachments();
        }
    }, [open, task]);

    async function loadComments() {
        setLoadingComments(true);
        setCommentFeedback(null);
        try {
            const response = await apiFetch(`/tasks/${task.id}/comments`);
            if (!response.ok) {
                throw new Error("Yorumlar yüklenemedi");
            }
            const data = await response.json();
            setComments(data);
        } catch (error) {
            setCommentFeedback({ type: "error", message: getErrorMessage(error, "Yorumlar yüklenemedi") });
        } finally {
            setLoadingComments(false);
        }
    }

    async function loadHistory() {
        setLoadingHistory(true);
        try {
            const response = await apiFetch(`/tasks/${task.id}/assignment-history`);
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Atama geçmişi yüklenemedi:", error);
        } finally {
            setLoadingHistory(false);
        }
    }

    async function loadAttachments() {
        setLoadingAttachments(true);
        setAttachmentFeedback(null);
        try {
            const response = await apiFetch(`/tasks/${task.id}/attachments`);
            if (!response.ok) {
                throw new Error("Dosyalar yüklenemedi");
            }
            const data = await response.json();
            setAttachments(data);
        } catch (error) {
            setAttachmentFeedback({ type: "error", message: getErrorMessage(error, "Dosyalar yüklenemedi") });
        } finally {
            setLoadingAttachments(false);
        }
    }

    async function handleUploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];

        const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setAttachmentFeedback({ type: "error", message: "Yalnızca PDF, JPEG, PNG ve WEBP formatları desteklenmektedir." });
            return;
        }

        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxFileSize) {
            setAttachmentFeedback({ type: "error", message: "Dosya en fazla 5 MB olabilir." });
            return;
        }

        setUploading(true);
        setAttachmentFeedback(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await apiFetch(`/tasks/${task.id}/attachments`, {
                method: "POST",
                body: formData
            });
            if (!response.ok) {
                throw new Error("Dosya yüklenemedi");
            }
            const created = await response.json();
            setAttachments([...attachments, created]);
            setAttachmentFeedback({ type: "success", message: "Dosya başarıyla yüklendi." });
        } catch (error) {
            setAttachmentFeedback({ type: "error", message: getErrorMessage(error, "Dosya yüklenemedi") });
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    async function handleDeleteAttachment(attachmentId: number) {
        if (!window.confirm("Bu dosyayı silmek istediğinize emin misiniz?")) return;

        setAttachmentFeedback(null);
        try {
            const response = await apiFetch(`/tasks/attachments/${attachmentId}`, {
                method: "DELETE"
            });
            if (!response.ok) {
                throw new Error("Dosya silinemedi");
            }
            setAttachments(attachments.filter(a => a.id !== attachmentId));
            setAttachmentFeedback({ type: "success", message: "Dosya başarıyla silindi." });
        } catch (error) {
            setAttachmentFeedback({ type: "error", message: getErrorMessage(error, "Dosya silinemedi") });
        }
    }

    async function handleDownloadAttachment(attachmentId: number, fileName: string) {
        try {
            const response = await apiFetch(`/tasks/attachments/${attachmentId}/download`);
            if (!response.ok) {
                throw new Error("Dosya indirilemedi");
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            alert("Dosya indirilirken bir hata oluştu.");
        }
    }

    function formatFileSize(bytes: number) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async function handleAddComment(e: React.FormEvent) {
        e.preventDefault();
        const content = newComment.trim();
        if (!content) return;
        if (content.length > 2000) {
            setCommentFeedback({ type: "warning", message: "Yorum en fazla 2000 karakter olabilir." });
            return;
        }

        setSubmittingComment(true);
        setCommentFeedback(null);
        try {
            const response = await apiFetch(`/tasks/${task.id}/comments`, {
                method: "POST",
                body: JSON.stringify({ content })
            });
            if (!response.ok) {
                throw new Error("Yorum eklenemedi");
            }
            const created = await response.json();
            setComments([...comments, created]);
            setNewComment("");
        } catch (error) {
            setCommentFeedback({ type: "error", message: getErrorMessage(error, "Yorum eklenemedi") });
        } finally {
            setSubmittingComment(false);
        }
    }

    async function handleDeleteComment(commentId: number) {
        if (!window.confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;

        setCommentFeedback(null);
        try {
            const response = await apiFetch(`/tasks/comments/${commentId}`, {
                method: "DELETE"
            });
            if (!response.ok) {
                throw new Error("Yorum silinemedi");
            }
            setComments(comments.filter(c => c.id !== commentId));
        } catch (error) {
            setCommentFeedback({ type: "error", message: getErrorMessage(error, "Yorum silinemedi") });
        }
    }

    function formatHistoryMessage(item: HistoryItem) {
        const actor = item.assignedByUsername ? `@${item.assignedByUsername}` : item.assignedByName;
        const target = item.assignedToUsername ? `@${item.assignedToUsername}` : item.assignedToName;

        switch (item.eventType) {
            case "ASSIGNED":
                return `${actor} görevi ${target} kullanıcısına atadı.`;
            case "ACCEPTED":
                return `${actor} atamayı kabul etti.`;
            case "REJECTED":
                return `${actor} atamayı reddetti.${item.reason ? ` Mazeret: "${item.reason}"` : ""}`;
            case "UNASSIGNED":
                return `${actor} atamayı kaldırdı.${item.reason ? ` Neden: ${item.reason}` : ""}`;
            case "REASSIGNED":
                return `${actor} görevi ${target} kullanıcısına yeniden atadı.`;
            default:
                return `${actor} işlem gerçekleştirdi.`;
        }
    }

    if (!open || !task) return null;

    return (
        <div className="confirm-modal-backdrop" onMouseDown={onClose}>
            <div
                className="confirm-modal"
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => e.stopPropagation()}
                style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto', display: 'block' }}
            >
                <div className="confirm-modal-copy" style={{ marginBottom: '20px' }}>
                    <h2>{task.title}</h2>
                    <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', marginTop: '10px' }}>
                        {task.description || "Açıklama belirtilmemiş."}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '15px' }}>
                    <button
                        onClick={() => setActiveTab("comments")}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === "comments" ? '2px solid #2563eb' : 'none',
                            color: activeTab === "comments" ? 'inherit' : 'var(--text-secondary)',
                            padding: '10px 5px',
                            cursor: 'pointer',
                            fontWeight: activeTab === "comments" ? 'bold' : 'normal'
                        }}
                    >
                        Yorumlar ({comments.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === "history" ? '2px solid #2563eb' : 'none',
                            color: activeTab === "history" ? 'inherit' : 'var(--text-secondary)',
                            padding: '10px 5px',
                            cursor: 'pointer',
                            fontWeight: activeTab === "history" ? 'bold' : 'normal'
                        }}
                    >
                        Atama Geçmişi ({history.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("attachments")}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === "attachments" ? '2px solid #2563eb' : 'none',
                            color: activeTab === "attachments" ? 'inherit' : 'var(--text-secondary)',
                            padding: '10px 5px',
                            cursor: 'pointer',
                            fontWeight: activeTab === "attachments" ? 'bold' : 'normal'
                        }}
                    >
                        Dosyalar ({attachments.length})
                    </button>
                </div>

                {activeTab === "comments" && (
                    <div className="comments-section">
                        {commentFeedback && <InlineFeedback type={commentFeedback.type} message={commentFeedback.message} />}

                        {loadingComments ? (
                            <p>Yorumlar yükleniyor...</p>
                        ) : comments.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Henüz yorum yapılmamış.</p>
                        ) : (
                            <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '15px 0', maxHeight: '300px', overflowY: 'auto' }}>
                                {comments.map(c => (
                                    <div key={c.id} className="comment-item" style={{
                                        padding: '10px',
                                        borderRadius: '6px',
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                {c.authorName} <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}>@{c.authorUsername}</span>
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    {new Date(c.createdAt).toLocaleString()}
                                                </span>
                                                {c.authorId === currentUserId && (
                                                    <button
                                                        onClick={() => handleDeleteComment(c.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            padding: '0'
                                                        }}
                                                    >
                                                        Sil
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p style={{ margin: '0', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{c.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                            <input
                                type="text"
                                placeholder="Bir yorum yazın..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                disabled={submittingComment}
                                style={{
                                    flex: '1',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    color: 'inherit'
                                }}
                            />
                            <button
                                type="submit"
                                className="button button-primary"
                                disabled={submittingComment || !newComment.trim()}
                            >
                                Gönder
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="history-section">
                        {loadingHistory ? (
                            <p>Geçmiş yükleniyor...</p>
                        ) : history.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Atama geçmişi bulunmuyor.</p>
                        ) : (
                            <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '15px 0', maxHeight: '300px', overflowY: 'auto' }}>
                                {history.map(item => (
                                    <div key={item.id} className="history-item" style={{
                                        padding: '10px',
                                        borderRadius: '6px',
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        borderLeft: '3px solid #2563eb',
                                        fontSize: '0.9rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '500' }}>
                                                {formatHistoryMessage(item)}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {new Date(item.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "attachments" && (
                    <div className="attachments-section">
                        {attachmentFeedback && <InlineFeedback type={attachmentFeedback.type} message={attachmentFeedback.message} />}

                        {loadingAttachments ? (
                            <p>Dosyalar yükleniyor...</p>
                        ) : attachments.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Bu görev için henüz dosya eklenmemiş.</p>
                        ) : (
                            <div className="attachments-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '15px 0', maxHeight: '300px', overflowY: 'auto' }}>
                                {attachments.map(att => (
                                    <div key={att.id} className="attachment-item" style={{
                                        padding: '10px',
                                        borderRadius: '6px',
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{att.fileName}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {formatFileSize(att.fileSize)} | {att.contentType}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <button
                                                onClick={() => handleDownloadAttachment(att.id, att.fileName)}
                                                className="button button-secondary"
                                                style={{ padding: '4px 8px', fontSize: '0.8rem', minHeight: '28px' }}
                                            >
                                                İndir
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAttachment(att.id)}
                                                className="button button-danger"
                                                style={{ padding: '4px 8px', fontSize: '0.8rem', minHeight: '28px' }}
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '15px', padding: '15px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px' }}>Yeni Dosya Yükle</label>
                            <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.webp"
                                onChange={handleUploadAttachment}
                                disabled={uploading}
                                style={{ display: 'block', width: '100%', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                            />
                            <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Sadece PDF, JPG, PNG ve WEBP (Maks: 5MB)
                            </p>
                        </div>
                    </div>
                )}

                <div className="confirm-modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="button button-secondary" type="button" onClick={onClose}>
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
