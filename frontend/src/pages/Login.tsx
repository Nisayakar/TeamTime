import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, saveAuth } from "../api";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    async function handleLogin() {
        try {
            const response = await apiFetch("/login", {
                method: "POST",
                body: JSON.stringify(
                    {
                        email,
                        password
                    }
                )
            });

            const data = await response.json();

            console.log(data);

            saveAuth(data);

            navigate("/dashboard");
        } catch (error) {
            alert("Sunucuya Bağlanılamadı");
        }
    }

    return (
        <div className="auth-page">
            <section className="auth-panel auth-visual">
                <span className="eyebrow">TeamTime Workspace</span>
                <h1>Projelerini ve takımlarını tek merkezden yönet.</h1>
                <p>Modern proje takibi, ekip yönetimi ve görev akışları için sade bir çalışma alanı.</p>

                <div className="auth-preview">
                    <div>
                        <span className="mini-label">Aktif Proje</span>
                        <strong>Frontend Sprint</strong>
                    </div>
                    <span className="badge badge-green">78% tamamlandı</span>
                </div>
            </section>

            <section className="auth-panel auth-form-panel">
                <div className="form-card">
                    <span className="eyebrow">Giriş</span>
                    <h2>Hesabına giriş yap</h2>
                    <p className="muted">Takım panona devam etmek için bilgilerini gir.</p>

                    <label>E-mail</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

                    <label>Şifre</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

                    <button className="button button-primary button-full" type="button" onClick={handleLogin}>
                        Giriş Yap
                    </button>

                    <p className="auth-switch">Hesabın yok mu?</p>
                    <Link to="/register">
                        <button className="button button-secondary button-full">
                            Kayıt Ol
                        </button>
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default Login;
