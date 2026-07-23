import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, saveAuth } from "../api";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    async function handleLogin() {
        if (email.trim() === "") {
            setMessage("Email boş bırakılamaz");
            return;
        }

        if (password.trim() === "") {
            setMessage("Şifre boş bırakılamaz");
            return;
        }

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

            if (!response.ok) {
                setMessage(await readErrorMessage(response));
                return;
            }

            const data = await response.json();

            saveAuth(data);

            navigate("/dashboard");
        } catch (error) {
            setMessage("Sunucuya bağlanılamadı");
        }
    }

    async function readErrorMessage(response: Response) {
        const contentType = response.headers.get("Content-Type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.errors) {
                return Object.values(data.errors).join("\n");
            }

            return data.message || "Giriş yapılamadı";
        }

        return await response.text();
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

                    {
                        message &&
                        <div className="message-box">
                            {message}
                        </div>
                    }

                    <div className="field">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " />
                        <label>E-mail</label>
                    </div>

                    <div className="field">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder=" " />
                        <label>Şifre</label>
                    </div>

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
