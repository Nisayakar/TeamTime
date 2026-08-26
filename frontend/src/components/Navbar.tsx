import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch, clearAuth, getMediaUrl, getStoredUser, isAuthenticated } from "../api";
import { broadcastSyncEvent, subscribeToSync } from "../sync";
import type { NotificationItem, NotificationPage } from "../types/notification";
import ConfirmModal from "./ConfirmModal";

type UnreadCountResponse = {
    unreadCount: number;
};

const NOTIFICATION_PAGE_SIZE = 20;

function getInitials(name: string, surname: string): string {
    const first = (name ?? "").trim().charAt(0).toUpperCase();
    const last = (surname ?? "").trim().charAt(0).toUpperCase();

    if (first && last) {
        return `${first}${last}`;
    }

    if (first) {
        return first;
    }

    return "TT";
}

function DashboardIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}

function ProjectsIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
    );
}

function MyTasksIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    );
}

function TeamsIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function CreateIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function ProfileIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    );
}

function renderNavIcon(to: string): ReactNode {
    if (to === "/dashboard") return <DashboardIcon />;
    if (to === "/projects") return <ProjectsIcon />;
    if (to === "/my-tasks") return <MyTasksIcon />;
    if (to === "/teams") return <TeamsIcon />;
    if (to === "/create-project") return <CreateIcon />;
    return null;
}

function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoggedIn = isAuthenticated();
    const notificationRef = useRef<HTMLDivElement | null>(null);
    const profileRef = useRef<HTMLDivElement | null>(null);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
    const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
    const [hasLoadedNotifications, setHasLoadedNotifications] = useState(false);
    const [notificationPage, setNotificationPage] = useState(0);
    const [isLastNotificationPage, setIsLastNotificationPage] = useState(true);
    const [notificationError, setNotificationError] = useState("");
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [imageLoadError, setImageLoadError] = useState(false);
    const [notificationSyncTrigger, setNotificationSyncTrigger] = useState(0);

    const [storedUser, setStoredUser] = useState(() => getStoredUser());
    
    useEffect(() => {
        function handleUserUpdated() {
            setStoredUser(getStoredUser());
        }
        window.addEventListener("user-updated", handleUserUpdated);
        
        const unsubscribe = subscribeToSync((event) => {
            if (event.type === "NOTIFICATIONS_CHANGED") {
                setNotificationSyncTrigger(current => current + 1);
            }
        });

        return () => {
            window.removeEventListener("user-updated", handleUserUpdated);
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        setImageLoadError(false);
    }, [storedUser?.profileImageUrl]);

    const userInitials = storedUser
        ? getInitials(storedUser.name ?? "", storedUser.surname ?? "")
        : "TT";
    const userDisplayName = storedUser
        ? `${storedUser.name ?? ""} ${storedUser.surname ?? ""}`.trim()
        : "Hesap";
    const userAvatar = getMediaUrl(storedUser?.profileImageUrl);

    function logout() {
        clearAuth();
        clearNotificationState();
        setIsProfileMenuOpen(false);
        setIsMobileNavOpen(false);
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
        setIsClearModalOpen(false);
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
    }, [isLoggedIn, location.pathname, notificationSyncTrigger]);

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

    useEffect(() => {
        if (isNotificationsOpen && notificationSyncTrigger > 0) {
            loadNotificationsPage(0, false);
        }
    }, [notificationSyncTrigger, isNotificationsOpen]);

    useEffect(() => {
        if (!isProfileMenuOpen) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            if (!profileRef.current?.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsProfileMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isProfileMenuOpen]);

    useEffect(() => {
        setIsMobileNavOpen(false);
        setIsProfileMenuOpen(false);
    }, [location.pathname]);

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
                broadcastSyncEvent("NOTIFICATIONS_CHANGED");
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
            broadcastSyncEvent("NOTIFICATIONS_CHANGED");
        } catch (error) {
            setNotificationError(getSafeErrorMessage(error, "Bildirimler okundu olarak işaretlenemedi."));
        }
    }

    async function clearAllNotifications() {
        try {
            await apiFetch("/notifications", { method: "DELETE" });
            setNotifications([]);
            setUnreadCount(0);
            setNotificationPage(0);
            setIsLastNotificationPage(true);
            setHasLoadedNotifications(true);
            setIsClearModalOpen(false);
            setNotificationError("");
            broadcastSyncEvent("NOTIFICATIONS_CHANGED");
        } catch (error) {
            setIsClearModalOpen(false);
            setNotificationError(getSafeErrorMessage(error, "Bildirimler temizlenemedi."));
        }
    }

    async function openNotification(notification: NotificationItem) {
        const readSucceeded = notification.read || await markNotificationAsRead(notification);

        if (!readSucceeded) {
            return;
        }

        setIsNotificationsOpen(false);

        if (notification.targetPath) {
            navigate(notification.targetPath);
        }
    }

    function toggleProfileMenu() {
        setIsProfileMenuOpen(current => !current);
    }

    function toggleMobileNav() {
        setIsMobileNavOpen(current => !current);
    }

    const navbarClassName = [
        isLoggedIn ? "app-navbar app-navbar-auth" : "app-navbar app-navbar-public",
        isMobileNavOpen ? "is-expanded" : ""
    ].filter(Boolean).join(" ");

    const navLinks = [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/projects", label: "Projelerim" },
        { to: "/my-tasks", label: "Görevlerim" },
        { to: "/teams", label: "Takımlarım" },
        { to: "/create-project", label: "Proje Oluştur" }
    ];

    return (
        <>
        <nav className={navbarClassName}>
            <Link to={isLoggedIn ? "/dashboard" : "/"} className="brand">
                <img className="brand-symbol" src="/home/teamtime-symbol.png" alt="" aria-hidden="true" />
                <span className="brand-wordmark">TeamTime</span>
            </Link>

            {
                isLoggedIn ? (
                    <div className="nav-content">
                        <button
                            type="button"
                            className="app-navbar-mobile-toggle"
                            aria-label={isMobileNavOpen ? "Menüyü kapat" : "Menüyü aç"}
                            aria-expanded={isMobileNavOpen}
                            onClick={toggleMobileNav}
                        >
                            <span aria-hidden="true">{isMobileNavOpen ? "\u2715" : "\u2630"}</span>
                        </button>

                        <div className="nav-links app-navbar-nav-links">
                            {navLinks.map(link => (
                                <NavLink key={link.to} to={link.to}>
                                    <span className="app-navbar-nav-icon">{renderNavIcon(link.to)}</span>
                                    {link.label}
                                </NavLink>
                            ))}
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
                                    <BellIcon />
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
                                                <div className="notification-panel-actions">
                                                    {
                                                        unreadCount > 0 && (
                                                            <button
                                                                type="button"
                                                                className="notification-read-all"
                                                                onClick={markAllNotificationsAsRead}
                                                            >
                                                                <CheckIcon /> Tümünü okundu yap
                                                            </button>
                                                        )
                                                    }
                                                    {
                                                        notifications.length > 0 && (
                                                            <button
                                                                type="button"
                                                                className="notification-clear-all"
                                                                onClick={() => setIsClearModalOpen(true)}
                                                            >
                                                                <TrashIcon /> Bildirimleri Temizle
                                                            </button>
                                                        )
                                                    }
                                                </div>
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

                            <div className="app-navbar-profile" ref={profileRef}>
                                <button
                                    type="button"
                                    className="app-navbar-profile-toggle"
                                    aria-label={`Hesap menüsü: ${userDisplayName}`}
                                    aria-expanded={isProfileMenuOpen}
                                    aria-haspopup="menu"
                                    onClick={toggleProfileMenu}
                                >
                                    <div className="avatar-circle">
                                        {userAvatar ? (
                                            <img src={userAvatar} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : (
                                            <span aria-hidden="true">{userInitials}</span>
                                        )}
                                    </div>
                                    <span className="app-navbar-profile-name">{userDisplayName}</span>
                                </button>

                                {
                                    isProfileMenuOpen && (
                                        <div className="app-navbar-profile-menu" role="menu" aria-label="Hesap menüsü">
                                            <div className="app-navbar-profile-menu-header">
                                                <div className="app-navbar-profile-menu-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                                                    {userAvatar ? (
                                                        <img src={userAvatar} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    ) : (
                                                        <span aria-hidden="true">{userInitials}</span>
                                                    )}
                                                </div>
                                                <div className="app-navbar-profile-menu-info">
                                                    <span className="app-navbar-profile-menu-name">{userDisplayName}</span>
                                                    {storedUser && 'email' in storedUser && typeof storedUser.email === 'string' && (
                                                        <span className="app-navbar-profile-menu-email">{storedUser.email}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="app-navbar-profile-menu-divider" aria-hidden="true" />
                                            <Link
                                                to="/profile"
                                                className="app-navbar-profile-menu-item"
                                                role="menuitem"
                                                onClick={() => setIsProfileMenuOpen(false)}
                                            >
                                                <ProfileIcon />
                                                Profil
                                            </Link>
                                            <div className="app-navbar-profile-menu-divider" aria-hidden="true" />
                                            <button
                                                type="button"
                                                className="app-navbar-profile-menu-item is-danger"
                                                role="menuitem"
                                                onClick={logout}
                                            >
                                                Oturumu Kapat
                                            </button>
                                        </div>
                                    )
                                }
                            </div>

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

            <ConfirmModal
                open={isClearModalOpen}
                title="Bildirimleri temizle"
                message="Tüm bildirimlerinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
                confirmLabel="Tümünü Temizle"
                cancelLabel="İptal"
                onConfirm={clearAllNotifications}
                onCancel={() => setIsClearModalOpen(false)}
            />
        </>
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

export default Navbar;
