import { Link } from "react-router-dom";
import Footer from "../components/Footer";


function Home() {
    return (
        <div className="hero">
            <section>
                <h1>TEAMTIME</h1>
                <p>
                    Proje süreçlerini tek platformda yönetin.
                </p>

                <div className="hero-buttons">

                    <Link to="/create-project">
                        <button>Proje Oluştur</button>
                    </Link>

                    <Link to="/login">
                        <button>Giriş Yap</button>
                    </Link>

                </div>
            </section>

            <section className="features">

                <h2>Nasıl Çalışır?</h2>

                <div className="feature-container">

                    <div className="feature-card">
                        📁
                        <h3>Proje Oluştur</h3>
                        <p>Yeni proje oluştur.</p>
                    </div>

                    <div className="feature-card">
                        👥
                        <h3>Takımını Davet Et</h3>
                        <p>Ekip arkadaşlarını ekle.</p>
                    </div>

                    <div className="feature-card">
                        📋
                        <h3>Görevleri Dağıt</h3>
                        <p>Görevleri organize et.</p>
                    </div>

                    <div className="feature-card">
                        📈
                        <h3>Takip Et</h3>
                        <p>İlerlemeyi izle.</p>
                    </div>

                </div>

            </section>
            <section>
                <h2>Neden TeamTime?</h2>
                <p>Basit</p>
                <p>Hızlı</p>
                <p>Takım Odaklı</p>
                <p>Ücretsiz</p>
            </section>
            <Footer />
        </div>
    )
}

export default Home;