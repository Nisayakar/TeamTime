import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {

    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");

    const navigate = useNavigate();


    async function handleRegister() {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (name.trim() === "") {
            setMessage("Ad boş bırakılamaz");
            return;
        }

        if (surname.trim() === "") {
            setMessage("Soyad boş bırakılamaz");
            return;
        }

        if (email.trim() === "") {
            setMessage("Email boş bırakılamaz");
            return;
        }

        if (!emailPattern.test(email.trim())) {
            setMessage("Email formatı doğru olmalı");
            return;
        }

        if (password.trim() === "") {
            setMessage("Şifre boş bırakılamaz");
            return;
        }

        if (password.length < 6) {
            setMessage("Şifre en az 6 karakter olmalı");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Şifreler uyuşmuyor");
            return;
        }


        try {

            const response = await fetch(
                "http://localhost:8085/api/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: name,
                        surname: surname,
                        email: email,
                        password: password
                    })
                }
            );


            if (response.ok) {
                const data = await response.text();
                setMessage(data || "Kayıt başarılı");

                navigate("/login");
                return;
            }

            setMessage(await readErrorMessage(response));


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

            return data.message || "Kayıt oluşturulamadı";
        }

        return await response.text();
    }


    return (
        <div className="auth-page">
            <section className="auth-panel auth-visual">
                <span className="eyebrow">Yeni çalışma alanı</span>
                <h1>TeamTime ile ekip ritmini düzenle.</h1>
                <p>Projeleri, görevleri ve takım üyelerini profesyonel bir panelde takip et.</p>

                <div className="auth-preview auth-preview-grid">
                    <span className="badge badge-blue">Projeler</span>
                    <span className="badge badge-purple">Takımlar</span>
                    <span className="badge badge-green">Görevler</span>
                </div>
            </section>

            <section className="auth-panel auth-form-panel">
                <div className="form-card">
                    <span className="eyebrow">Kayıt</span>
                    <h2>Hesap oluştur</h2>
                    <p className="muted">TeamTime çalışma alanına katılmak için bilgilerini gir.</p>

                    {
                        message &&
                        <div className="message-box">
                            {message}
                        </div>
                    }

                    <div className="form-grid two-columns">
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

                    <div className="field">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder=" "
                        />
                        <label>Şifre</label>
                    </div>

                    <div className="field">
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder=" "
                        />
                        <label>Şifre Tekrar</label>
                    </div>

                    <button className="button button-primary button-full" onClick={handleRegister}>
                        Kayıt Ol
                    </button>

                    <p className="auth-switch">Zaten hesabın var mı?</p>

                    <Link to="/login">
                        <button className="button button-secondary button-full">
                            Giriş Yap
                        </button>
                    </Link>
                </div>
            </section>
        </div>
    );
}

export default Register;
