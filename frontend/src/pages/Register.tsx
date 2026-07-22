import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {

    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const navigate = useNavigate();


    async function handleRegister() {

        if (password !== confirmPassword) {
            alert("Şifreler uyuşmuyor");
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


            const data = await response.text();

            alert(data);

            if (response.ok) {
                navigate("/login");
            }


        } catch (error) {

            alert("Sunucuya bağlanılamadı");

        }

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

                    <div className="form-grid two-columns">
                        <div>
                            <label>Ad</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label>Soyad</label>
                            <input
                                type="text"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                            />
                        </div>
                    </div>

                    <label>E-mail</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <label>Şifre</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <label>Şifre Tekrar</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />

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
