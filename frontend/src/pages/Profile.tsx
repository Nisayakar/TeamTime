import { useEffect, useState } from "react";
import { apiFetch, updateStoredUser } from "../api";

type ProfileUser = {
    id: number;
    name: string;
    surname: string;
    email: string;
}

function Profile() {
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [message, setMessage] = useState("");

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
                showMessage("Profil bilgileri alınamadı");
            });
    }, []);

    function showMessage(text: string) {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    }

    async function readErrorMessage(response: Response) {
        const contentType = response.headers.get("Content-Type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.errors) {
                return Object.values(data.errors).join("\n");
            }

            return data.message || "İşlem tamamlanamadı";
        }

        return await response.text();
    }

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
                throw new Error(await readErrorMessage(response));
            }

            const updatedUser = await response.json();

            setUser(updatedUser);
            updateStoredUser(updatedUser);
            showMessage("Profil bilgileri güncellendi");
        } catch (error: any) {
            showMessage(error.message || "Profil güncellenemedi");
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
                throw new Error(await readErrorMessage(response));
            }

            const data = await response.text();

            setOldPassword("");
            setNewPassword("");
            showMessage(data || "Şifre başarıyla güncellendi");
        } catch (error: any) {
            showMessage(error.message || "Şifre güncellenemedi");
        }
    }

    return (
        <main className="page-shell">
            {
                message &&
                <div className="message-box">
                    {message}
                </div>
            }

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
