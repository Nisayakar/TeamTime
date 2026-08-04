import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, updateStoredUser } from "../api";
import { useToast } from "../context/toast";
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
            showToast({
                type: "success",
                message: "Profil bilgileri güncellendi."
            });
        } catch (error) {
            showToast({
                type: "error",
                message: getErrorMessage(error, "Profil güncellenemedi")
            });
        } finally {
            setSavingProfile(false);
        }
    }

    async function updatePassword() {
        if (savingPassword) {
            return;
        }

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
            showToast({
                type: "success",
                message: data || "Şifre başarıyla güncellendi."
            });
        } catch (error) {
            showToast({
                type: "error",
                message: getErrorMessage(error, "Şifre güncellenemedi")
            });
        } finally {
            setSavingPassword(false);
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
                    </div>

                </div>

                <div className="panel app-form-card">
                    <div className="section-heading">
                        <span className="eyebrow">Güvenlik</span>
                        <h2>Şifre Değiştir</h2>
                    </div>

                    <div className="stacked-form">
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
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Profile;
