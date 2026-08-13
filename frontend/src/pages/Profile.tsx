import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, updateStoredUser } from "../api";
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
    email: string;
}

function Profile() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [profileFeedback, setProfileFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [passwordFeedback, setPasswordFeedback] = useState<{ type: InlineFeedbackType; message: string } | null>(null);
    const [deleteFeedback, setDeleteFeedback] = useState("");

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
                setEmail(data.email || "");
                updateStoredUser(data);
            } catch (error) {
                showToast({
                    type: "error",
                    message: getErrorMessage(error, "Profil bilgileri alınamadı")
                });
            }
        }

        loadProfile();
    }, [navigate, showToast]);

    async function updateProfile() {
        if (savingProfile) {
            return;
        }

        if (name.trim() === "" || surname.trim() === "" || email.trim() === "") {
            setProfileFeedback({ type: "error", message: "Ad, soyad ve e-mail alanları boş bırakılamaz." });
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
                    email
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

    return (
        <main className="page-shell app-page profile-page">
            <section className="hero-card profile-cover app-page-header profile-hero">
                <div className="profile-avatar">
                    {(user?.name || "T").slice(0, 1)}{(user?.surname || "T").slice(0, 1)}
                </div>

                <div className="app-page-header-copy">
                    <span className="eyebrow">Profil</span>
                    <h1>{user ? `${user.name} ${user.surname}` : "Profil"}</h1>
                    <p>{user?.email || "Profil bilgileri yükleniyor"}</p>
                </div>
            </section>

            <section className="content-grid two-columns profile-grid">
                <div className="panel app-form-card">
                    <div className="section-heading">
                        <span className="eyebrow">Hesap</span>
                        <h2>Profil Bilgileri</h2>
                    </div>

                    <div className="stacked-form">
                        <div className="field">
                            <input
                                aria-label="Ad"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder=" "
                            />
                            <label>Ad</label>
                        </div>

                        <div className="field">
                            <input
                                aria-label="Soyad"
                                type="text"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                                placeholder=" "
                            />
                            <label>Soyad</label>
                        </div>

                        <div className="field">
                            <input
                                aria-label="E-mail"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder=" "
                            />
                            <label>E-mail</label>
                        </div>

                        <button className="button button-primary" onClick={updateProfile} disabled={savingProfile}>
                            {savingProfile ? "Güncelleniyor..." : "Profil Bilgilerini Güncelle"}
                        </button>
                        {profileFeedback && <InlineFeedback type={profileFeedback.type} message={profileFeedback.message} />}
                    </div>

                </div>

                <div className="panel app-form-card">
                    <div className="section-heading">
                        <span className="eyebrow">Ayarlar</span>
                        <h2>Hesap Ayarları</h2>
                    </div>

                    <div className="stacked-form">
                        <div className="profile-settings-block">
                            <div>
                                <strong>Tema</strong>
                                <span>Uygulama görünümünü seçin.</span>
                            </div>
                            <ThemeSwitcher />
                        </div>

                        <div className="section-heading compact-heading">
                            <span className="eyebrow">Güvenlik</span>
                            <h3>Şifre Değiştir</h3>
                        </div>

                        <div className="field">
                            <input
                                aria-label="Eski Şifre"
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder=" "
                            />
                            <label>Eski Şifre</label>
                        </div>

                        <div className="field">
                            <input
                                aria-label="Yeni Şifre"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder=" "
                            />
                            <label>Yeni Şifre</label>
                        </div>

                        <button className="button button-primary" onClick={updatePassword} disabled={savingPassword}>
                            {savingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                        </button>
                        {passwordFeedback && <InlineFeedback type={passwordFeedback.type} message={passwordFeedback.message} />}

                        <div className="profile-danger-zone">
                            <div>
                                <strong>Hesabı Sil</strong>
                                <span>Bu işlem hesabınızı ve size bağlı verileri kalıcı olarak kaldırır.</span>
                            </div>
                            <button className="button button-danger" onClick={openDeleteModal} disabled={deletingAccount}>
                                Hesabı Sil
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <ConfirmModal
                open={deleteModalOpen}
                title="Hesabınızı silmek istediğinizden emin misiniz?"
                message="Bu işlem geri alınamaz. Hesabınız ve hesabınıza bağlı veriler kalıcı olarak silinecektir."
                cancelLabel="İptal"
                confirmLabel="Hesabımı Kalıcı Olarak Sil"
                variant="danger"
                loading={deletingAccount}
                errorMessage={deleteFeedback}
                onCancel={closeDeleteModal}
                onConfirm={deleteAccount}
            />
        </main>
    );
}

export default Profile;
