import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, saveAuth } from "../api";
import { parseApiError } from "../utils/apiError";

type RedirectLocationState = {
    from?: {
        pathname?: string;
        search?: string;
    };
};

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

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
                const errorMessage = await parseApiError(response, "Giriş yapılamadı");
                setMessage(errorMessage);
                return;
            }

            const data = await response.json();

            saveAuth(data);

            navigate(getRedirectPath(), { replace: true });
        } catch {
            setMessage("Sunucuya bağlanılamadı");
        }
    }

    function getRedirectPath() {
        const state = location.state as RedirectLocationState | null;
        const pathname = state?.from?.pathname;
        const search = state?.from?.search ?? "";

        if (!pathname || pathname === "/login" || pathname === "/register") {
            return "/dashboard";
        }

        return `${pathname}${search}`;
    }

    return (
        <div className="auth-page login-designed-page login-reference-page">
            <video
                className="login-star-page-video"
                src="/media/yıldız.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
            />
            <div className="login-star-page-overlay" aria-hidden="true" />

            <section className="auth-panel auth-visual login-design-visual">
                <span className="eyebrow">TeamTime Workspace</span>
                <h1>Projelerini ve takımlarını tek merkezden yönet.</h1>
                <p>Modern proje takibi, ekip yönetimi ve görev akışları için sade bir çalışma alanı.</p>
            </section>

            <section className="auth-panel auth-form-panel login-design-form-panel">
                <form className="form-card login-design-card" onSubmit={(event) => { event.preventDefault(); handleLogin(); }}>
                    <span className="eyebrow">Giriş</span>
                    <h2 id="login-title">Hesabına giriş yap</h2>
                    <p className="muted">Takım panona devam etmek için bilgilerini gir.</p>

                    {
                        message &&
                        <div className="message-box message-error" role="alert">
                            {message}
                        </div>
                    }

                    <div className="field">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta Adresi" />
                        <label>E-mail adresi</label>
                    </div>

                    <div className="field">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" />
                        <label>Şifre</label>
                    </div>

                    <div className="login-design-options">
                        <Link to="/forgot-password">Şifremi Unuttum</Link>
                    </div>

                    <button className="button button-primary button-full login-design-submit" type="submit">
                        Giriş Yap
                    </button>

                    <div className="login-design-divider">
                        <span>Veya</span>
                    </div>

                    <div className="login-design-register">
                        <p className="auth-switch">Hesabın yok mu?</p>
                        <Link className="button button-secondary button-full" to="/register">
                            Kayıt Ol
                        </Link>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default Login;
