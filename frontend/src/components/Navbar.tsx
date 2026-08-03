import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { clearAuth, isAuthenticated } from "../api";
import { apiFetch } from "../api";
import type { NotificationItem, NotificationPage } from "../types/notification";

type UnreadCountResponse = {
    unreadCount: number;
};

const NOTIFICATION_PAGE_SIZE = 20;

function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoggedIn = isAuthenticated();
    const notificationRef = useRef<HTMLDivElement | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
    const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
    const [hasLoadedNotifications, setHasLoadedNotifications] = useState(false);
    const [notificationPage, setNotificationPage] = useState(0);
    const [isLastNotificationPage, setIsLastNotificationPage] = useState(true);
    const [notificationError, setNotificationError] = useState("");

    function logout() {
        clearAuth();
        clearNotificationState();
        navigate("/login");
    }

    function clearNotificationState() {
        setIsNotificationsOpen(false);
        setNotifications([]);
        setUnreadCount(0);
        setIsNotificationsLoading(false);
        setIsLoadingMoreNotifications(false);
        setHasLoadedNotifications(false);
        setNotificationPage(0);
        setIsLastNotificationPage(true);
        setNotificationError("");
    }

    useEffect(() => {
        if (!isLoggedIn) {
            clearNotificationState();
            return;
        }

        let ignore = false;

        async function loadUnreadCount() {
            try {
                const response = await apiFetch("/notifications/unread-count");
                const data = await parseJsonResponse<UnreadCountResponse>(response);

                if (!ignore) {
                    setUnreadCount(Math.max(0, data.unreadCount));
                    setNotificationError("");
                }
            } catch (error) {
                if (!ignore) {
                    setNotificationError(getSafeErrorMessage(error, "Bildirim sayısı alınamadı."));
                }
            }
        }

        loadUnreadCount();

        return () => {
            ignore = true;
        };
    }, [isLoggedIn, location.pathname]);

    useEffect(() => {
        if (!isNotificationsOpen) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            if (!notificationRef.current?.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsNotificationsOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isNotificationsOpen]);

    async function toggleNotifications() {
        const nextOpen = !isNotificationsOpen;
        setIsNotificationsOpen(nextOpen);

        if (nextOpen && !hasLoadedNotifications) {
            await loadNotificationsPage(0, false);
        }
    }

    async function loadNotificationsPage(pageToLoad: number, append: boolean) {
        if (append) {
            setIsLoadingMoreNotifications(true);
        } else {
            setIsNotificationsLoading(true);
        }

        setNotificationError("");

        try {
            const response = await apiFetch(`/notifications?page=${pageToLoad}&size=${NOTIFICATION_PAGE_SIZE}`);
            const data = await parseJsonResponse<NotificationPage>(response);

            setNotifications(currentNotifications =>
                append ? appendUniqueNotifications(currentNotifications, data.content) : data.content
            );
            setNotificationPage(data.page);
            setIsLastNotificationPage(data.last);
            setHasLoadedNotifications(true);
        } catch (error) {
            setNotificationError(getSafeErrorMessage(error, "Bildirimler alınamadı."));
        } finally {
            if (append) {
                setIsLoadingMoreNotifications(false);
            } else {
                setIsNotificationsLoading(false);
            }
        }
    }

    async function loadMoreNotifications() {
        if (isLoadingMoreNotifications || isLastNotificationPage) {
            return;
        }

        await loadNotificationsPage(notificationPage + 1, true);
    }

    async function markNotificationAsRead(notification: NotificationItem) {
        try {
            const response = await apiFetch(`/notifications/${notification.id}/read`, {
                method: "PUT"
            });
            const updatedNotification = await parseJsonResponse<NotificationItem>(response);

            setNotifications(currentNotifications =>
                currentNotifications.map(item =>
                    item.id === updatedNotification.id ? updatedNotification : item
                )
            );

            if (!notification.read) {
                setUnreadCount(currentCount => Math.max(0, currentCount - 1));
            }

            return true;
        } catch (error) {
            setNotificationError(getSafeErrorMessage(error, "Bildirim okundu olarak işaretlenemedi."));
            return false;
        }
    }

    async function markAllNotificationsAsRead() {
        try {
            await apiFetch("/notifications/read-all", {
                method: "PUT"
            });

            setNotifications(currentNotifications =>
                currentNotifications.map(notification => ({
                    ...notification,
                    read: true
                }))
            );
            setUnreadCount(0);
            setNotificationError("");
        } catch (error) {
            setNotificationError(getSafeErrorMessage(error, "Bildirimler okundu olarak işaretlenemedi."));
        }
    }

    async function openNotification(notification: NotificationItem) {
        const readSucceeded = notification.read || await markNotificationAsRead(notification);

        if (!readSucceeded) {
            return;
        }

        const destination = getNotificationDestination(notification);

        if (destination) {
            setIsNotificationsOpen(false);
            navigate(destination);
        }
    }

    return (
        <nav className={isLoggedIn ? "app-navbar app-navbar-auth" : "app-navbar app-navbar-public"}>
            <Link to={isLoggedIn ? "/dashboard" : "/"} className="brand">
                <img className="brand-symbol" src="/home/teamtime-symbol.png" alt="" aria-hidden="true" />
                <span className="brand-wordmark">TeamTime</span>
            </Link>

            {
                isLoggedIn ? (
                    <div className="nav-content">
                        <div className="nav-links">
                            <NavLink to="/dashboard">Dashboard</NavLink>
                            <NavLink to="/projects">Projelerim</NavLink>
                            <NavLink to="/teams">Takımlarım</NavLink>
                            <NavLink to="/create-project">Proje Oluştur</NavLink>
                            <NavLink to="/profile">Profil</NavLink>
                        </div>

                        <div className="nav-user">
                            <div className="notification-menu" ref={notificationRef}>
                                <button
                                    type="button"
                                    className="notification-bell"
                                    aria-label={unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Bildirimler"}
                                    aria-expanded={isNotificationsOpen}
                                    onClick={toggleNotifications}
                                >
                                    <span aria-hidden="true">🔔</span>
                                    {
                                        unreadCount > 0 && (
                                            <span className="notification-badge" aria-label={`${unreadCount} okunmamış bildirim`}>
                                                {unreadCount > 99 ? "99+" : unreadCount}
                                            </span>
                                        )
                                    }
                                </button>

                                {
                                    isNotificationsOpen && (
                                        <div className="notification-panel" role="dialog" aria-label="Bildirimler">
                                            <div className="notification-panel-header">
                                                <strong>Bildirimler</strong>
                                                {
                                                    unreadCount > 0 && (
                                                        <button
                                                            type="button"
                                                            className="notification-read-all"
                                                            onClick={markAllNotificationsAsRead}
                                                        >
                                                            Tümünü okundu işaretle
                                                        </button>
                                                    )
                                                }
                                            </div>

                                            {
                                                notificationError && (
                                                    <p className="notification-error" role="status">{notificationError}</p>
                                                )
                                            }

                                            {
                                                isNotificationsLoading ? (
                                                    <p className="notification-empty">Bildirimler yükleniyor...</p>
                                                ) : notifications.length === 0 ? (
                                                    <p className="notification-empty">Henüz bildiriminiz yok.</p>
                                                ) : (
                                                    <div className="notification-list">
                                                        {
                                                            notifications.map(notification => (
                                                                <button
                                                                    type="button"
                                                                    key={notification.id}
                                                                    className={notification.read ? "notification-item" : "notification-item is-unread"}
                                                                    onClick={() => openNotification(notification)}
                                                                >
                                                                    <span className="notification-dot" aria-hidden="true" />
                                                                    <span className="notification-copy">
                                                                        <strong>{notification.title}</strong>
                                                                        <span>{notification.message}</span>
                                                                        <time dateTime={notification.createdAt}>
                                                                            {formatNotificationDate(notification.createdAt)}
                                                                        </time>
                                                                    </span>
                                                                </button>
                                                            ))
                                                        }
                                                        {
                                                            !isLastNotificationPage && (
                                                                <button
                                                                    type="button"
                                                                    className="notification-load-more"
                                                                    onClick={loadMoreNotifications}
                                                                    disabled={isLoadingMoreNotifications}
                                                                >
                                                                    {isLoadingMoreNotifications ? "Yükleniyor..." : "Daha Fazla Göster"}
                                                                </button>
                                                            )
                                                        }
                                                    </div>
                                                )
                                            }
                                        </div>
                                    )
                                }
                            </div>
                            <span className="user-avatar">TT</span>
                            <button className="button button-ghost" onClick={logout}>Çıkış Yap</button>
                        </div>
                    </div>
                ) : (
                    <div className="nav-links nav-links-public">
                        <NavLink to="/">Ana Sayfa</NavLink>
                        <NavLink to="/login">Giriş Yap</NavLink>
                        <NavLink to="/register" className="nav-cta">Kayıt Ol</NavLink>
                    </div>
                )
            }
        </nav>
    );
}

function appendUniqueNotifications(currentNotifications: NotificationItem[], nextNotifications: NotificationItem[]) {
    const seenIds = new Set(currentNotifications.map(notification => notification.id));
    const uniqueNextNotifications = nextNotifications.filter(notification => {
        if (seenIds.has(notification.id)) {
            return false;
        }

        seenIds.add(notification.id);
        return true;
    });

    return [...currentNotifications, ...uniqueNextNotifications];
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        if (isApiError(data)) {
            throw new Error(data.message);
        }

        throw new Error("İşlem tamamlanamadı.");
    }

    return data as T;
}

function isApiError(data: unknown): data is { message: string } {
    return typeof data === "object"
        && data !== null
        && "message" in data
        && typeof (data as { message: unknown }).message === "string";
}

function getSafeErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

function formatNotificationDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function getNotificationDestination(notification: NotificationItem) {
    if (!notification.relatedEntityId) {
        return null;
    }

    if (notification.type === "TEAM_MEMBER_ADDED" && notification.relatedEntityType === "TEAM") {
        return `/teams/${notification.relatedEntityId}`;
    }

    if (notification.type === "TEAM_PROJECT_CREATED" && notification.relatedEntityType === "PROJECT") {
        return `/project/${notification.relatedEntityId}`;
    }

    return null;
}

export default Navbar;
