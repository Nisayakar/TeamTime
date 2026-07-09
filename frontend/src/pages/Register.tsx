import { useState } from "react";
import { Link } from "react-router-dom";

function Register() {
    const [name, setName] = useState("");
    const [email,setEmail]=useState("");
    const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
    return <div>
        <h1>TEAMTIME</h1>
        <p>Kayıt Ol</p>

        <section>
            <label>Ad Soyad: </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}></input>
            <br></br>
            <label>E-mail :</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}></input>
            <br></br>
            <label>Şifre : </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}></input>
            <br></br>
            <label>Şifre Tekrar : </label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}></input>
        </section>
        <Link to="/login">
            <button>
                Kayıt ol
            </button>
        </Link>
        <br></br>
        <p>Zaten hesabın var mı?</p>
        <Link to="/login">
            <button>
                Giriş Yap
            </button>
        </Link>
    </div>
}

export default Register;