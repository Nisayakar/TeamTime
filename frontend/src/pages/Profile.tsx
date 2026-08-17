import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, updateStoredUser, getMediaUrl } from "../api";
import { useToast } from "../context/toast";
import { ThemeSwitcher } from "../components/ui/ThemeSwitcher";
import InlineFeedback, { type InlineFeedbackType } from "../components/ui/InlineFeedback";
import ConfirmModal from "../components/ConfirmModal";
import { getErrorMessage, parseApiError } from "../utils/apiError";
import { navigateForInitialLoadError } from "../utils/routeErrors";

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
        if (!user || username === user.username) {
            setUsernameAvailable(null);
            setIsCheckingUsername(false);
            return;
        }

        const trimmed = username.trim().toLowerCase();
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

        if (name.trim() === "" || surname.trim() === "") {
            setProfileFeedback({ type: "error", message: "Ad ve soyad alanları boş bırakılamaz." });
            return;
        }

        if (username.trim() === "") {
            setProfileFeedback({ type: "error", message: "Kullanıcı adı boş bırakılamaz." });
            return;
        }

        if (usernameAvailable === false) {
            setProfileFeedback({ type: "error", message: "Bu kullanıcı adı zaten kullanılıyor." });
            return;
        }

        setProfileFeedback(null);
        setSavingProfile(true);

        try {
            const response = await apiFetch("/profile", {
                method: "PUT",
                body: JSON.stringify({
                    name,
                    surname,
                    username
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

    function formatCountdown(seconds: number) {
        return `00:${String(seconds).padStart(2, "0")}`;
    }

    async function updatePassword() {
        if (savingPassword) {
            return;
        }

        if (oldPassword.trim() === "" || newPassword.trim() === "") {
            setPasswordFeedback({ type: "error", message: "Eski şifre ve yeni şifre alanları boş bırakılamaz." });
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

            const data = await response.text();

            setOldPassword("");
            setNewPassword("");
            setPasswordFeedback({ type: "success", message: data || "Şifreniz başarıyla güncellendi." });
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
            window.dispatchEvent(new Event("user-updated"));
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
            window.dispatchEvent(new Event("user-updated"));
        } catch (error) {
            setAvatarFeedback({ type: "error", message: getErrorMessage(error, "Profil fotoğrafı kaldırılamadı") });
        } finally {
            setRemovingAvatar(false);
        }
    }

    return (
        <main className="page-shell app-page profile-page">
            <section className="hero-card profile-cover app-page-header profile-hero" style={{ position: "relative" }}>
                <div className="profile-avatar-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", position: "relative", zIndex: 1 }}>
                    <div className="profile-avatar">
                        {avatarPreview && !imageLoadError ? (
                            <img src={avatarPreview} alt="Profil Fotoğrafı" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImageLoadError(true)} />
                        ) : (
                            <span>{(user?.name || "T").slice(0, 1)}{(user?.surname || "T").slice(0, 1)}</span>
                        )}
                        {uploadingAvatar && (
                            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>
                                Yükleniyor...
                            </div>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                            className="button button-secondary" 
                            style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                        >
                            {avatarPreview ? "Fotoğrafı Değiştir" : "Profil Fotoğrafı Ekle"}
                        </button>
                        {avatarPreview && (
                            <button 
                                className="button button-danger" 
                                style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                                onClick={() => setAvatarModalOpen(true)}
                                disabled={uploadingAvatar}
                            >
                                Kaldır
                            </button>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: "none" }} 
                            accept="image/jpeg, image/png, image/webp" 
                            onChange={handleFileSelect} 
                        />
                    </div>
                    {avatarFeedback && (
                        <div style={{ position: "absolute", top: "100%", marginTop: "8px", width: "200px" }}>
                            <InlineFeedback type={avatarFeedback.type} message={avatarFeedback.message} />
                        </div>
                    )}
                </div>

                <div className="app-page-header-copy">
                    <span className="eyebrow">Profil</span>
                    <h1>{user ? `${user.name} ${user.surname}` : "Profil"}</h1>
                    <p>{user?.username ? `@${user.username}` : (user?.email || "Profil bilgileri yükleniyor")}</p>
                </div>
            </section>

            <section className="content-grid two-columns profile-grid">
                <div className="form-section profile-details-card">
                    <div className="section-heading">
                        <span className="eyebrow">Hesap</span>
                        <h2>Profil Bilgileri</h2>
                    </div>

                    <div className="stacked-form">
                        <label>Ad</label>
                        <input
                            aria-label="Ad"
                            type="text"
                            className="ghost-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <label style={{ marginTop: "16px", display: "block" }}>Soyad</label>
                        <input
                            aria-label="Soyad"
                            type="text"
                            className="ghost-input"
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                        />

                        <label style={{ marginTop: "16px", display: "block" }}>Kullanıcı Adı</label>
                        <input
                            aria-label="Kullanıcı Adı"
                            type="text"
                            className="ghost-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            minLength={3}
                            maxLength={30}
                        />
                        {isCheckingUsername && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#6c757d' }}>Kontrol ediliyor...</div>}
                        {!isCheckingUsername && usernameAvailable === true && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#198754' }}>Bu kullanıcı adı kullanılabilir.</div>}
                        {!isCheckingUsername && usernameAvailable === false && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#dc3545' }}>Bu kullanıcı adı zaten kullanılıyor.</div>}

                        <label style={{ marginTop: "16px", display: "block" }}>E-mail</label>
                        <input
                            aria-label="E-mail"
                            type="email"
                            className="ghost-input"
                            value={email}
                            readOnly
                            disabled
                        />

                        <button className="button button-secondary profile-email-change-trigger" type="button" onClick={openEmailChangePanel}>
                            E-posta Adresini Değiştir
                        </button>

                        {
                            emailChangeOpen && (
                                <div className="profile-email-change-panel">
                                    {
                                        emailChangeStep === "request" ? (
                                            <form className="stacked-form" onSubmit={requestEmailChangeCode} noValidate>
                                                <label>Yeni E-posta Adresi</label>
                                                <input
                                                    aria-label="Yeni E-posta Adresi"
                                                    type="email"
                                                    className="ghost-input"
                                                    value={newEmail}
                                                    onChange={(event) => setNewEmail(event.target.value)}
                                                    autoComplete="email"
                                                />

                                                <div className="profile-email-change-actions">
                                                    <button className="button button-primary" type="submit" disabled={requestingEmailCode}>
                                                        {requestingEmailCode ? "Kod gönderiliyor..." : "Doğrulama Kodu Gönder"}
                                                    </button>
                                                    <button className="button button-ghost" type="button" onClick={closeEmailChangePanel}>
                                                        İptal
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <form className="stacked-form" onSubmit={verifyEmailChange} noValidate>
                                                <p className="profile-email-change-copy">
                                                    {submittedEmail} adresine gönderilen 6 haneli kodu girin.
                                                </p>

                                                <div className="verification-code-field" style={{ marginTop: "16px" }}>
                                                    <label htmlFor="profile-email-code">Doğrulama kodu</label>
                                                    <input
                                                        ref={emailCodeInputRef}
                                                        id="profile-email-code"
                                                        className="ghost-input verification-code-input"
                                                        type="text"
                                                        value={emailCode}
                                                        onChange={(event) => handleEmailCodeChange(event.target.value)}
                                                        inputMode="numeric"
                                                        autoComplete="one-time-code"
                                                        maxLength={6}
                                                        minLength={6}
                                                        pattern="[0-9]{6}"
                                                        placeholder="000000"
                                                    />
                                                </div>

                                                <button className="button button-primary" type="submit" disabled={verifyingEmailCode}>
                                                    {verifyingEmailCode ? "Doğrulanıyor..." : "Doğrula ve E-postayı Değiştir"}
                                                </button>

                                                <div className="resend-panel profile-email-resend">
                                                    <p>
                                                        {
                                                            resendCountdown > 0
                                                                ? `Yeni kod gönderebilmek için ${resendCountdown} saniye bekleyin.`
                                                                : "Yeni kod isteyebilirsiniz."
                                                        }
                                                    </p>
                                                    <button
                                                        className="button button-secondary"
                                                        type="button"
                                                        onClick={resendEmailChangeCode}
                                                        disabled={resendingEmailCode || resendCountdown > 0}
                                                    >
                                                        {
                                                            resendCountdown > 0
                                                                ? `Yeni kod gönder: ${formatCountdown(resendCountdown)}`
                                                                : resendingEmailCode
                                                                    ? "Kod gönderiliyor..."
                                                                    : "Kodu Yeniden Gönder"
                                                        }
                                                    </button>
                                                </div>

                                                <button className="button button-ghost" type="button" onClick={closeEmailChangePanel}>
                                                    İptal
                                                </button>
                                            </form>
                                        )
                                    }
                                </div>
                            )
                        }

                        <button className="button button-primary" onClick={updateProfile} disabled={savingProfile}>
                            {savingProfile ? "Güncelleniyor..." : "Profil Bilgilerini Güncelle"}
                        </button>
                        {profileFeedback && <InlineFeedback type={profileFeedback.type} message={profileFeedback.message} />}
                    </div>
                </div>

                <div className="profile-side-column">
                    <section className="form-section profile-section-card">
                        <div className="profile-settings-block">
                            <div>
                                <strong>Tema</strong>
                                <span className="muted" style={{ display: "block", fontSize: "14px" }}>Uygulama görünümünü seçin.</span>
                            </div>
                            <ThemeSwitcher />
                        </div>
                    </section>

                    <hr className="section-divider" style={{ margin: "24px 0" }} />

                    <section className="form-section profile-section-card">
                        <div className="section-heading compact-heading">
                            <span className="eyebrow">Güvenlik</span>
                            <h3>Şifre Değiştir</h3>
                        </div>

                        <div className="stacked-form">
                            <label>Eski Şifre</label>
                            <input
                                aria-label="Eski Şifre"
                                type="password"
                                className="ghost-input"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                            />

                            <label style={{ marginTop: "16px", display: "block" }}>Yeni Şifre</label>
                            <input
                                aria-label="Yeni Şifre"
                                type="password"
                                className="ghost-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />

                            <button className="button button-primary" onClick={updatePassword} disabled={savingPassword}>
                                {savingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                            </button>
                            {passwordFeedback && <InlineFeedback type={passwordFeedback.type} message={passwordFeedback.message} />}
                        </div>
                    </section>

                    <hr className="section-divider" style={{ margin: "24px 0" }} />

                    <section className="form-section profile-section-card profile-danger-card">
                        <div className="profile-danger-zone">
                            <div>
                                <strong>Hesabı Sil</strong>
                                <span className="muted" style={{ display: "block", fontSize: "14px", marginTop: "4px" }}>Bu işlem hesabınızı ve size bağlı verileri kalıcı olarak kaldırır.</span>
                            </div>
                            <button className="button button-danger" onClick={openDeleteModal} disabled={deletingAccount}>
                                Hesabı Sil
                            </button>
                        </div>
                    </section>
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
