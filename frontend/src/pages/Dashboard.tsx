import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
    const [user, setUser] = useState<any>(null);
    //"Ben bir kullanıcı saklayacağım ama tipi şu an
    // belli değil.<any> ondan dolayı var"
    const navigate = useNavigate();

    useEffect(() => {
        const data = localStorage.getItem("user");

        if (data) {
            setUser(JSON.parse(data));
        }
    }, []);
    //useEffect: "Sayfa açıldığı zaman bunu çalıştır"

    function logout() {

        localStorage.removeItem("user");

        navigate("/login");

    }

    return (
        <div>
            <h1>Dashboard</h1>
            {   // user && bu işaret "User varsa bunu göster" demek
                user && (
                    <section>
                        <h2>
                            Hoş Geldin {user.name}
                        </h2>

                        <p>
                            Email:{user.email}
                        </p>

                        <button onClick={logout}>
                            Çıkış Yap
                        </button>
                    </section>
                )
            }
        </div>
    )
}


export default Dashboard;