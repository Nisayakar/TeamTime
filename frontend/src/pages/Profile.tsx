import { useState } from "react";

function Profile() {
    const [user] = useState({ name: "Nisa", surname: "Yakar", email: "nisa@gmail.com" });
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    return (
        <main className="page-shell">
            <section className="hero-card profile-cover">
                <div className="profile-avatar">{user.name.slice(0, 1)}{user.surname.slice(0, 1)}</div>

                <div>
                    <span className="eyebrow">Profil</span>
                    <h1>{user.name} {user.surname}</h1>
                    <p>{user.email}</p>
                </div>
            </section>

            <section className="content-grid two-columns">
                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Hesap</span>
                        <h2>Profil Bilgileri</h2>
                    </div>

                    <div className="list-card">
                        <p>Ad Soyad</p>
                        <strong>{user.name} {user.surname}</strong>
                    </div>

                    <div className="list-card">
                        <p>E-mail</p>
                        <strong>{user.email}</strong>
                    </div>
                </div>

                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Güvenlik</span>
                        <h2>Şifre Değiştir</h2>
                    </div>

                    <div className="stacked-form">
                        <label>Eski Şifre</label>
                        <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />

                        <label>Yeni Şifre</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

                        <button className="button button-primary">Şifreyi Güncelle</button>
                        <button className="button button-secondary">Çıkış Yap</button>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Profile;
