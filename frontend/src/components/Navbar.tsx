import { Link } from "react-router-dom";

function Navbar() {
    const isLoggedIn = false;
    return (
        <nav>
            <h2>TEAMTIME</h2>
            {
                isLoggedIn ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/projects">Projelerim</Link>
                        <Link to="/create-project">Proje Oluştur</Link>
                        <Link to="/profile">Profil</Link>
                        <button>Çıkış Yap</button>
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