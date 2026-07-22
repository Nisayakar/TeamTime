import { Link, useLocation, useNavigate } from "react-router-dom";

function Navbar() {
    useLocation();
    const navigate = useNavigate();
    const isLoggedIn = localStorage.getItem("user") !== null;

    function logout() {
        localStorage.removeItem("user");
        navigate("/login");
    }

    return (
        <nav>
            <h2>TEAMTIME</h2>
            {
                isLoggedIn ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/projects">Projelerim</Link>
                        <Link to="/teams">Takımlarım</Link>
                        <Link to="/create-project">Proje Oluştur</Link>
                        <Link to="/profile">Profil</Link>
                        <button onClick={logout}>Çıkış Yap</button>
                    </>
                ) : (
                    <>
                        <Link to="/">Ana Sayfa</Link>
                        <Link to="/login">Giriş Yap</Link>
                        <Link to="/register">Kayıt Ol</Link>
                    </>
                )
            }
        </nav>
    );
}

export default Navbar;
