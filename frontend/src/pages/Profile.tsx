import { useEffect, useState } from "react";
import { apiFetch, updateStoredUser } from "../api";
import { useToast } from "../context/toast";
import { getErrorMessage, parseApiError } from "../utils/apiError";

type ProfileUser = {
    id: number;
    name: string;
    surname: string;
    email: string;
}

function Profile() {
    const { showToast } = useToast();
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        apiFetch("/profile")
            .then(response => response.json())
            .then(data => {
                setUser(data);
                setName(data.name || "");
                setSurname(data.surname || "");
                setEmail(data.email || "");
                updateStoredUser(data);
            })
            .catch(() => {
                showToast({
                    type: "error",
                    message: "Profil bilgileri alınamadı"
                });
            });
    }, [showToast]);

    async function updateProfile() {
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
        }
    }

    async function updatePassword() {
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
        }
    }

    return (
        <main className="page-shell">
            <section className="hero-card profile-cover">
                <div className="profile-avatar">
                    {(user?.name || "T").slice(0, 1)}{(user?.surname || "T").slice(0, 1)}
                </div>

                <div>
                    <span className="eyebrow">Profil</span>
                    <h1>{user ? `${user.name} ${user.surname}` : "Profil"}</h1>
                    <p>{user?.email || "Profil bilgileri yükleniyor"}</p>
                </div>
            </section>

            <section className="content-grid two-columns">
                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Hesap</span>
                        <h2>Profil Bilgileri</h2>
                    </div>

                    <div className="stacked-form">
                        <div className="field">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder=" "
                            />
                            <label>Ad</label>
                        </div>

                        <div className="field">
                            <input
                                type="text"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                                placeholder=" "
                            />
                            <label>Soyad</label>
                        </div>

                        <div className="field">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder=" "
                            />
                            <label>E-mail</label>
                        </div>

                        <button className="button button-primary" onClick={updateProfile}>
                            Profil Bilgilerini Güncelle
                        </button>
                    </div>

                </div>

                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Güvenlik</span>
                        <h2>Şifre Değiştir</h2>
                    </div>

                    <div className="stacked-form">
                        <div className="field">
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                placeholder=" "
                            />
                            <label>Eski Şifre</label>
                        </div>

                        <div className="field">
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder=" "
                            />
                            <label>Yeni Şifre</label>
                        </div>

                        <button className="button button-primary" onClick={updatePassword}>
                            Şifreyi Güncelle
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Profile;
