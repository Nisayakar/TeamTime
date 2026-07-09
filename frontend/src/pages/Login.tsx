import { useState } from "react";
import { Link } from "react-router-dom";

function Login() {
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");

    return <div>
        <h1>TEAMTIME</h1>
         <p>Giriş Yap</p>
         <section>
            <label>E-mail : </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}></input>
            <br></br>
            <label>Şifre : </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}></input>
            <Link to="/create-project">
            <button>
                Giriş Yap
            </button>
            </Link>
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