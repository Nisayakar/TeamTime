import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearAuth, isAuthenticated } from "../api";

function Navbar() {
    useLocation();
    const navigate = useNavigate();
    const isLoggedIn = isAuthenticated();

    function logout() {
        clearAuth();
        navigate("/login");
    }

    return (
        <nav className={isLoggedIn ? "app-navbar app-navbar-auth" : "app-navbar app-navbar-public"}>
            <Link to={isLoggedIn ? "/dashboard" : "/"} className="brand">
                <img className="brand-logo" src="/teamtime-logo.svg" alt="TeamTime" />
            </Link>

            {
                isLoggedIn ? (
                    <div className="nav-content">
                        <div className="nav-links">
                            <NavLink to="/dashboard">Dashboard</NavLink>
                            <NavLink to="/projects">Projelerim</NavLink>
                            <NavLink to="/teams">Takımlarım</NavLink>
                            <NavLink to="/create-project">Proje Oluştur</NavLink>
                            <NavLink to="/profile">Profil</NavLink>
                        </div>

                        <div className="nav-user">
                            <span className="user-avatar">TT</span>
                            <button className="button button-ghost" onClick={logout}>Çıkış Yap</button>
                        </div>
                    </div>
                ) : (
                    <div className="nav-links nav-links-public">
                        <NavLink to="/">Ana Sayfa</NavLink>
                        <NavLink to="/login">Giriş Yap</NavLink>
                        <NavLink to="/register" className="nav-cta">Kayıt Ol</NavLink>
                    </div>
                )
            }
        </nav>
    );
}

export default Navbar;
