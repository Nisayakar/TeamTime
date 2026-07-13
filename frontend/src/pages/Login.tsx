import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    async function handleLogin() {
        try {
            const response = await fetch("http://localhost:8085/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(
                    {
                        email,
                        password
                    }
                )
            });

            const data = await response.json();

            console.log(data);

            localStorage.setItem(
                "user",
                JSON.stringify(data)
            );

            navigate("/dashboard");
        } catch (error) {
            alert("Sunucuya Bağlanılamadı");
        }
    }

    return <div>
        <h1>TEAMTIME</h1>
        <p>Giriş Yap</p>
        <section>
            <label>E-mail : </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}></input>
            <br></br>
            <label>Şifre : </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}></input>
            <button type="button" onClick={handleLogin}>Giriş Yap</button>
            <br></br>
            <p>Hesabın yok mu?</p>
            <Link to="/register">
                <button>
                    Kayıt Ol
                </button>
            </Link>

        </section>
    </div>

}

export default Login;