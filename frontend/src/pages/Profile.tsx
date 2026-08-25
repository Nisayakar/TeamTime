import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, updateStoredUser, getMediaUrl } from "../api";
import { subscribeToSync } from "../sync";
import { useToast } from "../context/toast";
import { useTheme } from "../hooks/useTheme";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
import ConfirmModal from "../components/ConfirmModal";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";
import "../styles/profile-v2.css";

type ProfileUser = {
    id: number;
    name: string;
    surname: string;
    username: string;
    email: string;
    profileImageUrl?: string;
}

type EmailChangeStep = "request" | "verify";

const RESEND_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SvgIcon({ d, viewBox = "0 0 24 24", fill = "none", stroke = "currentColor", size = 20, className, style }: any) {
    return (
        <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
            {d}
        </svg>
    );
}

const ProfileIcon = (props: any) => <SvgIcon {...props} d={<><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" /></>} />;
const LockIcon = (props: any) => <SvgIcon {...props} d={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>} />;
const PaletteIcon = (props: any) => <SvgIcon {...props} d={<><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.992 6.012 17.5 2 12 2z"/></>} />;
const TrashIcon = (props: any) => <SvgIcon {...props} d={<><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>} />;
const CheckIcon = (props: any) => <SvgIcon {...props} d={<polyline points="20 6 9 17 4 12" />} />;
const CameraIcon = (props: any) => <SvgIcon {...props} d={<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>} />;
const MailIcon = (props: any) => <SvgIcon {...props} d={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>} />;
const VerifiedIcon = (props: any) => <SvgIcon {...props} d={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>} />;
const WarningIcon = (props: any) => <SvgIcon {...props} d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>} />;

function Profile() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const emailCodeInputRef = useRef<HTMLInputElement>(null);
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [emailChangeOpen, setEmailChangeOpen] = useState(false);
    const [emailChangeStep, setEmailChangeStep] = useState<EmailChangeStep>("request");
    const [newEmail, setNewEmail] = useState("");
    const [submittedEmail, setSubmittedEmail] = useState("");
    const [emailCode, setEmailCode] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [requestingEmailCode, setRequestingEmailCode] = useState(false);
    const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);
    const [resendingEmailCode, setResendingEmailCode] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS);
    const [savingPassword, setSavingPassword] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [profileFeedback, setProfileFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [passwordFeedback, setPasswordFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [deleteFeedback, setDeleteFeedback] = useState("");
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [removingAvatar, setRemovingAvatar] = useState(false);
    const [imageLoadError, setImageLoadError] = useState(false);
    const [avatarFeedback, setAvatarFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const { preference, resolvedTheme, setPreference } = useTheme();
    const [activeSection, setActiveSection] = useState<"profile" | "password" | "theme" | "delete">("profile");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setImageLoadError(false);
    }, [avatarPreview]);

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await apiFetch("/profile");

                if (!response.ok) {
                    if (navigateForInitialLoadError(response.status, navigate)) {
                        return;
                    }

                    throw new Error(await parseApiError(response, "Profil bilgileri alınamadı"));
                }

                const data: ProfileUser = await response.json();
                setUser(data);
                setName(data.name || "");
                setSurname(data.surname || "");
                setUsername(data.username || "");
                setEmail(data.email || "");
                updateStoredUser(data);
                
                if (data.profileImageUrl) {
                    setAvatarPreview(getMediaUrl(data.profileImageUrl) ?? null);
                } else {
                    setAvatarPreview(null);
                }
            } catch (error) {
                showToast({
                    type: "error",
                    message: getErrorMessage(error, "Profil bilgileri alınamadı")
                });
            }
        }

        loadProfile();
    }, [navigate, showToast]);

    useEffect(() => {
        return subscribeToSync(async (event) => {
            if (event.type === "USER_UPDATED") {
                try {
                    const response = await apiFetch("/profile");
                    if (!response.ok) return;
                    const data: ProfileUser = await response.json();
                    
                    setUser(prevUser => {
                        if (!prevUser) return data;
                        
                        setName(currentName => {
                            if (currentName === (prevUser.name || "")) return data.name || "";
                            return currentName;
                        });
                        setSurname(currentSurname => {
                            if (currentSurname === (prevUser.surname || "")) return data.surname || "";
                            return currentSurname;
                        });
                        setUsername(currentUsername => {
                            if (currentUsername === (prevUser.username || "")) return data.username || "";
                            return currentUsername;
                        });
                        setEmail(data.email || "");
                        
                        return data;
                    });
                    
                    setAvatarPreview(() => {
                        return data.profileImageUrl ? (getMediaUrl(data.profileImageUrl) ?? null) : null;
                    });
                } catch {
                    // Ignore
                }
            }
        });
    }, []);

    useEffect(() => {
        if (!user) {
            setUsernameAvailable(null);
            setIsCheckingUsername(false);
            return;
        }

        const trimmed = username.trim().toLowerCase();
        const originalUsername = (user.username || "").trim().toLowerCase();

        if (trimmed === originalUsername) {
            setUsernameAvailable(null);
            setIsCheckingUsername(false);
            return;
        }
        if (!/^[a-z0-9_.]+$/.test(trimmed) || trimmed.length < 3 || trimmed.length > 30) {
            setUsernameAvailable(null);
            setIsCheckingUsername(false);
            return;
        }

        setIsCheckingUsername(true);
        setUsernameAvailable(null);

        const timerId = window.setTimeout(async () => {
            try {
                const res = await apiFetch(`/users/username-availability?username=${encodeURIComponent(trimmed)}`);
                if (res.ok) {
                    const data = await res.json();
                    setUsernameAvailable(data.available);
                } else {
                    setUsernameAvailable(null);
                }
            } catch {
                setUsernameAvailable(null);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 400);

        return () => window.clearTimeout(timerId);
    }, [username, user]);

    useEffect(() => {
        if (!emailChangeOpen || emailChangeStep !== "verify") {
            return;
        }

        emailCodeInputRef.current?.focus();
        setResendCountdown(RESEND_SECONDS);
    }, [emailChangeOpen, emailChangeStep, submittedEmail]);

    useEffect(() => {
        if (!emailChangeOpen || emailChangeStep !== "verify" || resendCountdown <= 0) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setResendCountdown((currentValue) => Math.max(0, currentValue - 1));
        }, 1000);

        return () => window.clearTimeout(timerId);
    }, [emailChangeOpen, emailChangeStep, resendCountdown]);

    async function updateProfile() {
        if (savingProfile) {
            return;
        }

        const trimmedName = name.trim();
        const trimmedSurname = surname.trim();
        const trimmedUsername = username.trim();

        if (trimmedName === "" || trimmedSurname === "") {
            setProfileFeedback({ type: "error", message: "Ad ve soyad alanları boş bırakılamaz." });
            return;
        }

        if (trimmedUsername === "") {
            setProfileFeedback({ type: "error", message: "Kullanıcı adı boş bırakılamaz." });
            return;
        }

        if (usernameAvailable === false) {
            setProfileFeedback({ type: "error", message: "Bu kullanıcı adı zaten kullanılıyor." });
            return;
        }

        if (user) {
            const originalName = (user.name || "").trim();
            const originalSurname = (user.surname || "").trim();
            const originalUsername = (user.username || "").trim().toLowerCase();

            if (trimmedName === originalName && 
                trimmedSurname === originalSurname && 
                trimmedUsername.toLowerCase() === originalUsername) {
                
                setProfileFeedback({ type: "info", message: "Değişiklik yapılmadı." });
                return;
            }
        }

        setProfileFeedback(null);
        setSavingProfile(true);

        try {
            const response = await apiFetch("/profile", {
                method: "PUT",
                body: JSON.stringify({
                    name: trimmedName,
                    surname: trimmedSurname,
                    username: trimmedUsername
                })
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Profil güncellenemedi"));
            }

            const updatedUser = await response.json();

            setUser(updatedUser);
            updateStoredUser(updatedUser);
            setProfileFeedback({ type: "success", message: "Profil bilgileriniz güncellendi." });
        } catch (error) {
            setProfileFeedback({ type: "error", message: getErrorMessage(error, "Profil güncellenemedi") });
        } finally {
            setSavingProfile(false);
        }
    }

    async function requestEmailChangeCode(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (requestingEmailCode) {
            return;
        }

        const validationMessage = validateNewEmail();

        if (validationMessage) {
            setProfileFeedback({ type: "error", message: validationMessage });
            return;
        }

        const normalizedEmail = newEmail.trim();

        setProfileFeedback(null);
        setRequestingEmailCode(true);

        try {
            const response = await apiFetch("/profile/email/request-code", {
                method: "POST",
                body: JSON.stringify({ email: normalizedEmail })
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Doğrulama kodu gönderilemedi"));
            }

            setSubmittedEmail(normalizedEmail);
            setEmailCode("");
            setEmailChangeStep("verify");
            setProfileFeedback({ type: "success", message: "Doğrulama kodu yeni e-posta adresinize gönderildi." });
        } catch (error) {
            setProfileFeedback({ type: "error", message: getErrorMessage(error, "Doğrulama kodu gönderilemedi") });
        } finally {
            setRequestingEmailCode(false);
        }
    }

    async function verifyEmailChange(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (verifyingEmailCode) {
            return;
        }

        if (!/^[0-9]{6}$/.test(emailCode)) {
            setProfileFeedback({ type: "error", message: "Lütfen 6 haneli doğrulama kodunu girin." });
            return;
        }

        setProfileFeedback(null);
        setVerifyingEmailCode(true);

        try {
            const response = await apiFetch("/profile/email/verify", {
                method: "POST",
                body: JSON.stringify({
                    email: submittedEmail,
                    code: emailCode
                })
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "E-posta adresi değiştirilemedi"));
            }

            const updatedUser: ProfileUser = await response.json();

            setUser(updatedUser);
            setEmail(updatedUser.email || "");
            updateStoredUser(updatedUser);
            closeEmailChangePanel();
            setProfileFeedback({ type: "success", message: "E-posta adresiniz güncellendi." });
        } catch (error) {
            setProfileFeedback({ type: "error", message: getErrorMessage(error, "E-posta adresi değiştirilemedi") });
        } finally {
            setVerifyingEmailCode(false);
        }
    }

    async function resendEmailChangeCode() {
        if (resendingEmailCode || resendCountdown > 0) {
            return;
        }

        setProfileFeedback(null);
        setResendingEmailCode(true);

        try {
            const response = await apiFetch("/profile/email/resend-code", {
                method: "POST",
                body: JSON.stringify({ email: submittedEmail })
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Doğrulama kodu yeniden gönderilemedi"));
            }

            setEmailCode("");
            setResendCountdown(RESEND_SECONDS);
            emailCodeInputRef.current?.focus();
            setProfileFeedback({ type: "success", message: "Yeni doğrulama kodu gönderildi." });
        } catch (error) {
            setProfileFeedback({ type: "error", message: getErrorMessage(error, "Doğrulama kodu yeniden gönderilemedi") });
        } finally {
            setResendingEmailCode(false);
        }
    }

    function openEmailChangePanel() {
        setEmailChangeOpen(true);
        setEmailChangeStep("request");
        setNewEmail("");
        setSubmittedEmail("");
        setEmailCode("");
        setProfileFeedback(null);
    }

    function closeEmailChangePanel() {
        setEmailChangeOpen(false);
        setEmailChangeStep("request");
        setNewEmail("");
        setSubmittedEmail("");
        setEmailCode("");
    }

    function handleEmailCodeChange(value: string) {
        setEmailCode(value.replace(/[^0-9]/g, "").slice(0, 6));
    }

    function validateNewEmail() {
        const normalizedEmail = newEmail.trim();

        if (normalizedEmail === "") {
            return "Yeni e-posta adresi boş bırakılamaz.";
        }

        if (!EMAIL_PATTERN.test(normalizedEmail)) {
            return "Email formatı doğru olmalı.";
        }

        if (email && email.toLocaleLowerCase("tr-TR") === normalizedEmail.toLocaleLowerCase("tr-TR")) {
            return "Mevcut e-posta adresinizden farklı bir e-posta girin.";
        }

        return "";
    }



    async function updatePassword() {
        if (savingPassword) {
            return;
        }

        if (oldPassword.trim() === "" || newPassword.trim() === "") {
            setPasswordFeedback({ type: "error", message: "Eski şifre ve yeni şifre alanları boş bırakılamaz." });
            return;
        }

        if (confirmNewPassword.trim() === "") {
            setPasswordFeedback({ type: "error", message: "Yeni şifre tekrar alanı zorunludur." });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordFeedback({ type: "error", message: "Yeni şifreler eşleşmiyor." });
            return;
        }

        setPasswordFeedback(null);
        setSavingPassword(true);

        try {
            const response = await apiFetch("/profile/password", {
                method: "PUT",
                body: JSON.stringify({
                    oldPassword,
                    newPassword
                })
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Şifre güncellenemedi"));
            }

            await response.text();

            setOldPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setPasswordFeedback({ type: "success", message: "Şifreniz başarıyla güncellendi." });
        } catch (error) {
            setPasswordFeedback({ type: "error", message: getErrorMessage(error, "Şifre güncellenemedi") });
        } finally {
            setSavingPassword(false);
        }
    }

    async function deleteAccount() {
        if (deletingAccount) {
            return;
        }

        setDeletingAccount(true);

        try {
            const response = await apiFetch("/profile", {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Hesap silinemedi"));
            }

            clearAuth();
            setDeleteModalOpen(false);
            navigate("/login", { replace: true });
        } catch (error) {
            setDeleteFeedback(getErrorMessage(error, "Hesap silinemedi"));
        } finally {
            setDeletingAccount(false);
        }
    }

    function openDeleteModal() {
        setDeleteFeedback("");
        setDeleteModalOpen(true);
    }

    function closeDeleteModal() {
        if (!deletingAccount) {
            setDeleteModalOpen(false);
        }
    }

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setAvatarFeedback({ type: "error", message: "Dosya boyutu 5MB'dan küçük olmalıdır." });
            return;
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
            setAvatarFeedback({ type: "error", message: "Sadece JPEG, PNG ve WEBP formatları desteklenmektedir." });
            return;
        }

        setAvatarFeedback(null);
        setUploadingAvatar(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await apiFetch("/profile/avatar", {
                method: "POST",
                body: formData,
                headers: {} // Need to override content-type to let browser set boundary
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Profil fotoğrafı yüklenemedi"));
            }

            const updatedUser: ProfileUser = await response.json();
            setUser(updatedUser);
            updateStoredUser(updatedUser);
            
            if (updatedUser.profileImageUrl) {
                setAvatarPreview(getMediaUrl(updatedUser.profileImageUrl) ?? null);
            }
            
            setAvatarFeedback(null);
            showToast({ type: "success", message: "Profil fotoğrafı güncellendi." });
        } catch (error) {
            setAvatarFeedback({ type: "error", message: getErrorMessage(error, "Profil fotoğrafı yüklenemedi") });
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }

    async function handleRemoveAvatar() {
        if (removingAvatar) return;

        setRemovingAvatar(true);
        try {
            const response = await apiFetch("/profile/avatar", {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response, "Profil fotoğrafı kaldırılamadı"));
            }

            const updatedUser: ProfileUser = await response.json();
            setUser(updatedUser);
            updateStoredUser(updatedUser);
            setAvatarPreview(null);
            setAvatarModalOpen(false);
            setAvatarFeedback(null);
            showToast({ type: "success", message: "Profil fotoğrafı kaldırıldı." });
        } catch (error) {
            setAvatarFeedback({ type: "error", message: getErrorMessage(error, "Profil fotoğrafı kaldırılamadı") });
        } finally {
            setRemovingAvatar(false);
        }
    }

    return (
        <main className="profile-page-v2">
            <div className="bg-decor"></div>
            
            {/* Sidebar */}
            <aside className="profile-sidebar">
                <div className="profile-sidebar-header">
                    <div className="profile-sidebar-header-row">
                        <div className="sidebar-icon-container">
                            <ProfileIcon style={{ color: 'var(--primary)' }} />
                        </div>
                        <h2>Ayarlar</h2>
                    </div>
                    <p>Hesap ve görünüm tercihlerinizi yönetin.</p>
                </div>
                
                <nav className="sidebar-nav">
                    <button 
                        className={`sidebar-nav-item ${activeSection === "profile" ? "active" : ""}`}
                        onClick={() => setActiveSection("profile")}
                    >
                        <ProfileIcon size={20} />
                        <span>Profil Bilgileri</span>
                    </button>
                    
                    <button 
                        className={`sidebar-nav-item ${activeSection === "password" ? "active" : ""}`}
                        onClick={() => setActiveSection("password")}
                    >
                        <LockIcon size={20} />
                        <span>Şifre Değiştir</span>
                    </button>
                    
                    <button 
                        className={`sidebar-nav-item ${activeSection === "theme" ? "active" : ""}`}
                        onClick={() => setActiveSection("theme")}
                    >
                        <PaletteIcon size={20} />
                        <span>Tema Ayarları</span>
                    </button>
                    
                    <button 
                        className={`sidebar-nav-item danger ${activeSection === "delete" ? "active" : ""}`}
                        onClick={() => setActiveSection("delete")}
                    >
                        <TrashIcon size={20} />
                        <span>Hesabı Sil</span>
                    </button>
                </nav>
            </aside>
            
            {/* Content Area */}
            <section className="profile-content-area">
                <div className="profile-content-container">
                    
                    {activeSection === "profile" && (
                        <>
                            <header className="content-header">
                                <h1>Profil Bilgileri</h1>
                                <p>Kişisel bilgilerinizi ve iletişim detaylarınızı güncelleyin.</p>
                            </header>

                            <div className="profile-top">
                                <div className="avatar-wrapper">
                                    <div className="avatar-circle">
                                        {avatarPreview && !imageLoadError ? (
                                            <img src={avatarPreview} alt="Profil" onError={() => setImageLoadError(true)} />
                                        ) : (
                                            <span>{(user?.name || "T").slice(0, 1)}{(user?.surname || "T").slice(0, 1)}</span>
                                        )}
                                        {uploadingAvatar && (
                                            <div className="avatar-overlay">
                                                <svg className='spin' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><line x1='12' y1='2' x2='12' y2='6'/><line x1='12' y1='18' x2='12' y2='22'/><line x1='4.93' y1='4.93' x2='7.76' y2='7.76'/><line x1='16.24' y1='16.24' x2='19.07' y2='19.07'/><line x1='2' y1='12' x2='6' y2='12'/><line x1='18' y1='12' x2='22' y2='12'/><line x1='4.93' y1='19.07' x2='7.76' y2='16.24'/><line x1='16.24' y1='7.76' x2='19.07' y2='4.93'/></svg>
                                            </div>
                                        )}
                                        <div className="avatar-overlay" onClick={() => fileInputRef.current?.click()}>
                                            <CameraIcon style={{ color: '#fff' }} />
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} />
                                </div>
                                
                                <div className="avatar-info">
                                    <h1>{user ? `${user.name} ${user.surname}` : "Profil"}</h1>
                                    <p>{user?.username ? `@${user.username}` : (user?.email || "Yükleniyor...")}</p>
                                </div>

                                {avatarPreview && (
                                    <button className="btn-outline" onClick={() => setAvatarModalOpen(true)} disabled={uploadingAvatar}>
                                        Fotoğrafı Kaldır
                                    </button>
                                )}
                            </div>

                            {avatarFeedback && (
                                <div className="mb-4">
                                    <InlineFeedback type={avatarFeedback.type} message={avatarFeedback.message} />
                                </div>
                            )}

                            <div className="divider"></div>

                            <section className="glass-panel">
                                <h3>Kişisel Bilgiler</h3>
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label htmlFor="name-input">Ad</label>
                                        <div className="input-wrapper">
                                            <input id="name-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız" />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="surname-input">Soyad</label>
                                        <div className="input-wrapper">
                                            <input id="surname-input" type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Soyadınız" />
                                        </div>
                                    </div>
                                    
                                    <div className="input-group full-width">
                                        <label htmlFor="username-input">Kullanıcı Adı</label>
                                        <div className="input-wrapper profile-username-input-wrapper">
                                            <span className="input-prefix">@</span>
                                            <input id="username-input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={30} placeholder="kullanici_adi" />
                                        </div>
                                        <p className="input-hint">Kullanıcı adınız platformdaki diğer kullanıcılar tarafından görünür olacaktır.</p>
                                        {isCheckingUsername && <p className="input-hint">Kontrol ediliyor...</p>}
                                        {!isCheckingUsername && usernameAvailable === true && <p className="input-hint" style={{ color: '#82d385' }}>Bu kullanıcı adı kullanılabilir.</p>}
                                        {!isCheckingUsername && usernameAvailable === false && <p className="input-hint" style={{ color: 'var(--danger)' }}>Bu kullanıcı adı zaten kullanılıyor.</p>}
                                    </div>
                                </div>
                                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn-primary" onClick={updateProfile} disabled={savingProfile}>
                                        {savingProfile ? "Güncelleniyor..." : "Profili Güncelle"}
                                    </button>
                                </div>
                                {profileFeedback && <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}><InlineFeedback type={profileFeedback.type} message={profileFeedback.message} /></div>}
                            </section>

                            <section className="glass-panel">
                                <h3>İletişim Bilgileri</h3>
                                <div className="form-grid">
                                    <div className="input-group full-width">
                                        <label>E-posta Adresi</label>
                                        <div className="input-wrapper">
                                            <MailIcon size={20} className="input-prefix" />
                                            <input type="email" value={email} readOnly disabled />
                                            <VerifiedIcon size={20} className="input-suffix" />
                                        </div>
                                    </div>
                                </div>
                                
                                {!emailChangeOpen ? (
                                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-start' }}>
                                        <button className="btn-outline" onClick={openEmailChangePanel}>E-posta Adresini Değiştir</button>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '24px', padding: '24px', borderRadius: '12px', backgroundColor: 'var(--surface-high)', border: '1px solid var(--border)' }}>
                                        {emailChangeStep === "request" ? (
                                            <form onSubmit={requestEmailChangeCode} noValidate>
                                                <div className="input-group">
                                                    <label>Yeni E-posta Adresi</label>
                                                    <div className="input-wrapper">
                                                        <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="yeni@email.com" />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                                    <button className="btn-primary" type="submit" disabled={requestingEmailCode}>
                                                        {requestingEmailCode ? "Gönderiliyor..." : "Kod Gönder"}
                                                    </button>
                                                    <button className="btn-cancel" type="button" onClick={closeEmailChangePanel}>İptal</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <form onSubmit={verifyEmailChange} noValidate>
                                                <p style={{ fontSize: '14px', color: 'var(--text-variant)', marginBottom: '16px' }}>
                                                    {submittedEmail} adresine gönderilen 6 haneli kodu girin.
                                                </p>
                                                <div className="input-group">
                                                    <label>Doğrulama Kodu</label>
                                                    <div className="input-wrapper">
                                                        <input ref={emailCodeInputRef} type="text" style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontFamily: 'monospace' }} value={emailCode} onChange={(e) => handleEmailCodeChange(e.target.value)} maxLength={6} placeholder="000000" />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                                    <button className="btn-primary" type="submit" disabled={verifyingEmailCode}>
                                                        {verifyingEmailCode ? "Doğrulanıyor..." : "Doğrula ve Değiştir"}
                                                    </button>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginTop: '8px' }}>
                                                        <span style={{ color: 'var(--text-variant)' }}>
                                                            {resendCountdown > 0 ? `Yeni kod için ${resendCountdown}s bekleyin` : "Yeni kod isteyin"}
                                                        </span>
                                                        <button type="button" style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={resendEmailChangeCode} disabled={resendingEmailCode || resendCountdown > 0}>
                                                            Kodu Yeniden Gönder
                                                        </button>
                                                    </div>
                                                    <button className="btn-cancel" type="button" onClick={closeEmailChangePanel}>İptal</button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {activeSection === "password" && (
                        <>
                            <header className="content-header">
                                <h1>Şifre Değiştir</h1>
                                <p>Hesabınızın güvenliği için güçlü bir şifre kullanın.</p>
                            </header>

                            <div className="password-form-wrapper">
                                <div className="password-form">
                                    <div className="input-group">
                                        <label htmlFor="old-password-input">Eski Şifre</label>
                                        <input id="old-password-input" type="password" className="password-input" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Mevcut şifrenizi girin" />
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="new-password-input">Yeni Şifre</label>
                                        <input id="new-password-input" type="password" className="password-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Yeni şifrenizi girin" />
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="confirm-new-password-input">Yeni Şifre Tekrar</label>
                                        <input id="confirm-new-password-input" type="password" className="password-input" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Yeni şifrenizi tekrar girin" />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn-primary" onClick={updatePassword} disabled={savingPassword}>
                                            {savingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                                        </button>
                                    </div>
                                    {passwordFeedback && <InlineFeedback type={passwordFeedback.type} message={passwordFeedback.message} />}
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === "theme" && (
                        <>
                            <header className="content-header">
                                <h1>Tema Ayarları</h1>
                                <p>Uygulama görünümünü seçin.</p>
                            </header>

                            <div className="theme-grid">
                                <button
                                    type="button"
                                    className={`theme-card ${preference === "light" ? "active" : ""}`}
                                    onClick={() => setPreference("light")}
                                >
                                    <div className="theme-preview" style={{ backgroundColor: '#ffffff' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '16px', backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}></div>
                                        <div style={{ position: 'absolute', top: '32px', left: '16px', right: '16px', bottom: '16px', backgroundColor: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb' }}></div>
                                        <div style={{ position: 'absolute', top: '48px', left: '32px', width: '40px', height: '8px', backgroundColor: '#d1d5db', borderRadius: '4px' }}></div>
                                    </div>
                                    <div className="theme-card-footer">
                                        <span className="theme-name">Açık Tema</span>
                                        <div className="theme-indicator">
                                            {preference === "light" && <CheckIcon size={14} />}
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className={`theme-card ${preference === "dark" ? "active" : ""}`}
                                    onClick={() => setPreference("dark")}
                                >
                                    <div className="theme-preview" style={{ backgroundColor: '#131313' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '16px', backgroundColor: '#1c1b1b', borderBottom: '1px solid #2a2a2a' }}></div>
                                        <div style={{ position: 'absolute', top: '32px', left: '16px', right: '16px', bottom: '16px', backgroundColor: '#0e0e0e', borderRadius: '4px', border: '1px solid #2a2a2a' }}></div>
                                        <div style={{ position: 'absolute', top: '48px', left: '32px', width: '40px', height: '8px', backgroundColor: '#353534', borderRadius: '4px' }}></div>
                                    </div>
                                    <div className="theme-card-footer">
                                        <span className="theme-name">Koyu Tema</span>
                                        <div className="theme-indicator">
                                            {preference === "dark" && <CheckIcon size={14} />}
                                        </div>
                                    </div>
                                </button>
                            </div>
                            
                            <div className="theme-toggle-row">
                                <div className="system-theme-toggle" onClick={() => { if (preference === "system") { setPreference(resolvedTheme); } else { setPreference("system"); } }}>
                                    <div className="toggle-info">
                                        <span className="theme-name">Sistem Teması</span>
                                        <p className="input-hint" style={{ marginTop: '2px' }}>Cihazınızın tema ayarlarına uyum sağlar</p>
                                    </div>
                                    <div style={{ width: '46px', height: '26px', borderRadius: '9999px', backgroundColor: preference === "system" ? 'var(--primary)' : 'var(--outline-variant)', position: 'relative', transition: '0.2s', flexShrink: 0 }}>
                                        <span style={{ position: 'absolute', width: '20px', height: '20px', top: '3px', left: '3px', backgroundColor: '#fff', borderRadius: '50%', transform: preference === "system" ? 'translateX(20px)' : 'translateX(0)', transition: '0.2s', pointerEvents: 'none' }}></span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === "delete" && (
                        <>
                            <header className="content-header">
                                <h1>Hesabı Sil</h1>
                                <p>Kalıcı olarak hesabınızı ve tüm verilerinizi sistemden kaldırın.</p>
                            </header>

                            <div className="danger-box">
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexDirection: 'row' }}>
                                    <div className="danger-icon-wrapper">
                                        <WarningIcon style={{ color: 'var(--danger)' }} />
                                    </div>
                                    <div className="danger-text-content">
                                        <h3>Dikkat</h3>
                                        <p>
                                            Bu işlem hesabınızı ve size bağlı verileri kalıcı olarak kaldırır. Silinen hesaplar geri alınamaz. Devam etmeden önce önemli verilerinizi yedeklediğinizden emin olun.
                                        </p>
                                    </div>
                                </div>
                                <div className="danger-actions">
                                    <button className="danger-btn" onClick={openDeleteModal} disabled={deletingAccount}>
                                        <TrashIcon size={18} />
                                        Hesabı Sil
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </section>

            <ConfirmModal
                open={deleteModalOpen}
                title="Hesabınızı silmek istediğinizden emin misiniz?"
                message="Bu işlem geri alınamaz. Hesabınız ve hesabınıza bağlı veriler kalıcı olarak silinecektir."
                confirmLabel="Hesabımı Kalıcı Olarak Sil"
                cancelLabel="İptal"
                onConfirm={deleteAccount}
                onCancel={closeDeleteModal}
                variant="danger"
                errorMessage={deleteFeedback}
                loading={deletingAccount}
            />

            <ConfirmModal
                open={avatarModalOpen}
                title="Profil fotoğrafını kaldır"
                message="Profil fotoğrafınızı kaldırmak istediğinizden emin misiniz?"
                confirmLabel="Kaldır"
                cancelLabel="İptal"
                onConfirm={handleRemoveAvatar}
                onCancel={() => {
                    if (!removingAvatar) setAvatarModalOpen(false);
                }}
                variant="danger"
                loading={removingAvatar}
            />
        </main>
    );
}
export default Profile;
