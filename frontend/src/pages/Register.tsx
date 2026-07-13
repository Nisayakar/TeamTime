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

            if(response.ok){
                navigate("/login");
            }


        } catch(error) {

            alert("Sunucuya bağlanılamadı");

        }

    }


    return (
        <div>

            <h1>TEAMTIME</h1>

            <p>Kayıt Ol</p>


            <section>

                <label>Ad :</label>
                <input 
                    type="text"
                    value={name}
                    onChange={(e)=>setName(e.target.value)}
                />

                <br></br>


                <label>Soyad :</label>
                <input 
                    type="text"
                    value={surname}
                    onChange={(e)=>setSurname(e.target.value)}
                />


                <br></br>


                <label>E-mail :</label>
                <input 
                    type="email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                />


                <br></br>


                <label>Şifre :</label>
                <input 
                    type="password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                />


                <br></br>


                <label>Şifre Tekrar :</label>
                <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e)=>setConfirmPassword(e.target.value)}
                />


            </section>


            <br></br>


            <button onClick={handleRegister}>
                Kayıt Ol
            </button>


            <br></br>


            <p>Zaten hesabın var mı?</p>

            <Link to="/login">
                <button>
                    Giriş Yap
                </button>
            </Link>


        </div>
    )
}


export default Register;