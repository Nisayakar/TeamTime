import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const featureSlides = [
    [
        {
            image: "/hightech/we1.png",
            title: "Görev Yönetimi",
            text: "Görevleri oluştur, durumlarını takip et ve ekip içinde sorumlulukları görünür yap.",
        },
        {
            image: "/hightech/we2.png",
            title: "Proje Takibi",
            text: "Proje başlangıç ve bitiş tarihlerini, açıklamaları ve ilerleme akışını düzenli tut.",
        },
        {
            image: "/hightech/we3.png",
            title: "Ekip Koordinasyonu",
            text: "Takımları ve üyeleri aynı çalışma alanında buluştur.",
        },
    ],
    [
        {
            image: "/hightech/we2.png",
            title: "İlerleme Görünürlüğü",
            text: "Bekleyen, devam eden ve tamamlanan işleri tek bakışta ayırt et.",
        },
        {
            image: "/hightech/we1.png",
            title: "Kişisel Dashboard",
            text: "Son görevler ve son projelerle çalışma ritmini hızlıca yakala.",
        },
        {
            image: "/hightech/we3.png",
            title: "Takım Alanları",
            text: "Ortak projelerde ekip bilgisini ve üyelikleri daha düzenli yönet.",
        },
    ],
];

const showcaseItems = [
    {
        image: "/hightech/prot1.png",
        title: "Proje Panosu",
        text: "Projelerin, açıklamaların ve tarih aralıklarının düzenli görünümü.",
    },
    {
        image: "/hightech/prot2.png",
        title: "Görev Akışı",
        text: "Her proje içindeki görevleri durumlarına göre takip etme deneyimi.",
    },
    {
        image: "/hightech/prot3.png",
        title: "Takım Yönetimi",
        text: "Takım oluşturma, düzenleme ve üye ekleme akışları.",
    },
    {
        image: "/hightech/prot4.png",
        title: "Profil ve Hesap",
        text: "Kullanıcı bilgilerini güncel tutan sade hesap yönetimi.",
    },
];

const benefits = [
    {
        image: "/hightech/chose1.png",
        title: "Net İş Akışı",
        value: "Düzen",
    },
    {
        image: "/hightech/chose2.png",
        title: "Görünür Sorumluluk",
        value: "Şeffaflık",
    },
    {
        image: "/hightech/chose3.png",
        title: "Takım Odağı",
        value: "Uyum",
    },
];

function Home() {
    const [featureIndex, setFeatureIndex] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setLoading(false);
        }, 900);

        return () => window.clearTimeout(timer);
    }, []);

    function previousFeature() {
        setFeatureIndex((current) => (current === 0 ? featureSlides.length - 1 : current - 1));
    }

    function nextFeature() {
        setFeatureIndex((current) => (current + 1) % featureSlides.length);
    }

    return (
        <main className="template-home">
            {loading && (
                <div className="template-loader" role="status" aria-label="Sayfa yükleniyor">
                    <div>
                        <img src="/hightech/loading.gif" alt="" />
                    </div>
                </div>
            )}

            <header className="template-header">
                <div className="template-container template-header-row">
                    <Link className="template-logo home-image-logo" to="/" aria-label="TeamTime Ana Sayfa">
                        <img src="/home/teamtime-symbol.png" alt="" aria-hidden="true" />
                        <span className="home-wordmark" aria-hidden="true">TeamTime</span>
                    </Link>

                    <nav className="template-nav" aria-label="Ana menü">
                        <button
                            className="template-menu-button"
                            type="button"
                            aria-expanded={menuOpen}
                            aria-controls="template-nav-links"
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            <span>Menü</span>
                        </button>

                        <ul id="template-nav-links" className={menuOpen ? "open" : ""}>
                            <li><a href="#top">Ana Sayfa</a></li>
                            <li><a href="#features">Özellikler</a></li>
                            <li><a href="#how-it-works">Nasıl Çalışır</a></li>
                            <li><a href="#about">Hakkımızda</a></li>
                            <li><a href="#contact">İletişim</a></li>
                        </ul>
                    </nav>

                    <div className="template-header-login">
                        <Link to="/login">Giriş Yap</Link>
                    </div>
                </div>
            </header>

            <section
                id="top"
                className="video-hero"
                aria-labelledby="video-hero-title"
            >
                <video
                    className="video-hero-media"
                    src="/media/teamtime-hero.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-hidden="true"
                    tabIndex={-1}
                />
                <div className="video-hero-overlay" aria-hidden="true" />

                <div className="template-container video-hero-inner">
                    <div className="video-hero-copy">
                        <span>TeamTime</span>
                        <h1 id="video-hero-title">Birlikte planlayın, birlikte ilerleyin.</h1>
                        <p>Görevleri, projeleri ve ekip ilerlemesini tek bir çalışma alanında yönetin.</p>
                        <div className="video-hero-actions">
                            <Link className="video-primary-cta" to="/register">Ücretsiz Başla</Link>
                            <Link className="video-secondary-cta" to="/login">Giriş Yap</Link>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="template-we-do">
                <div className="template-container">
                    <div className="template-title centered">
                        <h2>Özellikler</h2>
                    </div>

                    <div className="template-feature-carousel">
                        <div className="template-feature-grid">
                            {featureSlides[featureIndex].map((feature) => (
                                <article className="template-feature-card" key={feature.title}>
                                    <i><img src={feature.image} alt="" /></i>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.text}</p>
                                    <Link className="template-small-button" to="/register">Başla</Link>
                                </article>
                            ))}
                        </div>

                        <button className="template-section-prev" type="button" onClick={previousFeature} aria-label="Önceki özellikler">
                            ‹
                        </button>
                        <button className="template-section-next" type="button" onClick={nextFeature} aria-label="Sonraki özellikler">
                            ›
                        </button>
                    </div>
                </div>
            </section>

            <section id="about" className="template-about">
                <div className="template-container">
                    <div className="template-title centered light">
                        <h2>TeamTime Hakkında</h2>
                        <p>
                            TeamTime, ekiplerin projelerini, görevlerini ve iş birliği süreçlerini
                            tek bir alanda takip edebilmesi için geliştirilen web tabanlı bir proje
                            yönetim platformudur.
                        </p>
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="template-portfolio">
                <div className="template-container">
                    <div className="template-title left">
                        <h2>Ürün Vitrini</h2>
                    </div>

                    <div className="template-portfolio-grid">
                        {showcaseItems.map((item) => (
                            <article className="template-portfolio-card" key={item.title}>
                                <figure>
                                    <img src={item.image} alt="" />
                                    <figcaption>
                                        <div className="template-portfolio-icons" aria-hidden="true">
                                            <span>⌕</span>
                                            <span>↗</span>
                                        </div>
                                        <h3>{item.title}</h3>
                                        <p>{item.text}</p>
                                    </figcaption>
                                </figure>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="template-choose">
                <div className="template-container">
                    <div className="template-title left light">
                        <h2>Neden TeamTime?</h2>
                    </div>

                    <div className="template-benefit-grid">
                        {benefits.map((benefit) => (
                            <article className="template-benefit" key={benefit.title}>
                                <i><img src={benefit.image} alt="" /></i>
                                <h3>{benefit.title}</h3>
                                <strong>{benefit.value}</strong>
                                <Link className="template-choose-button" to="/register">Deneyin</Link>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="contact" className="template-contact">
                <div className="template-container template-contact-grid">
                    <div>
                        <div className="template-title left">
                            <h2>Başlamak İçin</h2>
                        </div>
                        <div className="template-contact-form">
                            <input aria-label="Ad Soyad" placeholder="Ad Soyad" readOnly />
                            <input aria-label="E-posta" placeholder="E-posta" readOnly />
                            <textarea aria-label="Mesaj" placeholder="Projeniz hakkında kısa not" readOnly />
                            <Link className="template-send-button" to="/register">Hemen Başla</Link>
                        </div>
                    </div>

                    <div>
                        <div className="template-title left">
                            <h2>Örnek Kullanıcı Yorumu</h2>
                        </div>
                        <article className="template-testimonial">
                            <i><img src="/hightech/clint.jpg" alt="" /></i>
                            <h3>Örnek ekip üyesi <img src="/hightech/icon.png" alt="" /></h3>
                            <p>
                                Bu alan örnek içeriktir. TeamTime gibi bir araç, ekiplerin görevleri
                                daha düzenli takip etmesine ve proje akışını tek yerde görmesine yardımcı olur.
                            </p>
                        </article>
                    </div>
                </div>
            </section>

            <footer className="template-footer">
                <div className="template-container">
                    <div className="template-footer-top">
                        <Link className="template-footer-logo" to="/">
                            <img src="/teamtime-logo.svg" alt="TeamTime" />
                        </Link>
                        <div className="template-newsletter">
                            <input aria-label="E-posta adresi" placeholder="E-posta adresinizi girin" readOnly />
                            <Link to="/register">Kayıt Ol</Link>
                        </div>
                    </div>

                    <div className="template-footer-grid">
                        <div>
                            <h3>Bağlantılar</h3>
                            <ul>
                                <li><a href="#top">Ana Sayfa</a></li>
                                <li><a href="#features">Özellikler</a></li>
                                <li><a href="#how-it-works">Nasıl Çalışır</a></li>
                                <li><a href="#contact">İletişim</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3>Ürün</h3>
                            <ul>
                                <li>Proje yönetimi</li>
                                <li>Görev takibi</li>
                                <li>Takım koordinasyonu</li>
                                <li>Dashboard görünümü</li>
                            </ul>
                        </div>
                        <div>
                            <h3>Hesap</h3>
                            <ul>
                                <li><Link to="/login">Giriş Yap</Link></li>
                                <li><Link to="/register">Kayıt Ol</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3>İletişim</h3>
                            <ul>
                                <li>TeamTime proje ekibi</li>
                                <li>Web tabanlı çalışma alanı</li>
                                <li>Öğrenci ve ekip projeleri</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="template-copyright">
                    <div className="template-container">
                        <p>© 2026 TeamTime. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </footer>
        </main>
    );
}

export default Home;
