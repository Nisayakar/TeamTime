import { Link } from "react-router-dom";
import Footer from "../components/Footer";

const painPoints = [
    {
        icon: "!",
        title: "Dağınık İletişim",
        text: "Mesajlar, dosyalar ve kararlar farklı yerlerde kaybolmadan tek akışta tutulur.",
        tone: "rose",
    },
    {
        icon: "✓",
        title: "Görevlerin Unutulması",
        text: "Kimin neyi, ne zaman yapacağı netleşir; takım aynı plana bakar.",
        tone: "purple",
    },
    {
        icon: "↗",
        title: "Planlama Karmaşası",
        text: "Teslim tarihleri, öncelikler ve ilerleme durumu görünür hale gelir.",
        tone: "indigo",
    },
    {
        icon: "TT",
        title: "Takım Koordinasyonu",
        text: "Herkesin sorumluluğu ve katkısı aynı proje merkezinde takip edilir.",
        tone: "slate",
    },
];

const steps = [
    ["01", "Projeni oluştur", "Fikrini ekle, hedefleri belirle."],
    ["02", "Takımını ekle", "Herkesi tek çalışma alanında buluştur."],
    ["03", "Görevleri ata", "Sorumlulukları ve tarihleri netleştir."],
    ["04", "Başarıyla tamamla", "İlerlemeyi gör, birlikte teslim et."],
];

const audiences = [
    "Üniversite Öğrencileri",
    "Akademik Takımlar",
    "Startup Takımları",
    "Yazılım Projeleri",
];

function Home() {
    return (
        <main className="tt-home">
            <section className="tt-hero">
                <div className="tt-hero-pattern" aria-hidden="true" />
                <div className="tt-hero-inner">
                    <span className="tt-badge">
                        <span className="tt-badge-icon">✦</span>
                        Yapay zeka ile daha akıllı ekip çalışması
                    </span>

                    <h1>Takım projelerini kolayca yönet, başarıya birlikte ulaş.</h1>
                    <p>
                        TeamTime, öğrenci ekiplerinin projelerini planlamasına, görevleri yönetmesine
                        ve yapay zeka desteğiyle daha verimli çalışmasına yardımcı olur.
                    </p>

                    <div className="tt-hero-actions">
                        <Link className="tt-button tt-button-primary" to="/register">
                            Ücretsiz Başla <span>→</span>
                        </Link>
                        <Link className="tt-button tt-button-glass" to="/login">
                            Giriş Yap
                        </Link>
                    </div>
                </div>
            </section>

            <section className="tt-section tt-pain-section">
                <div className="tt-section-heading">
                    <span className="tt-overline">Ekip çalışmasındaki zorluklar</span>
                    <h2>Projeler, araçlar arasında dağılmak zorunda değil.</h2>
                </div>

                <div className="tt-card-grid tt-card-grid-four">
                    {painPoints.map((item) => (
                        <article className="tt-info-card" key={item.title}>
                            <span className={`tt-icon-bubble ${item.tone}`}>{item.icon}</span>
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="tt-process-section">
                <div className="tt-section-heading">
                    <h2>Fikirden teslim tarihine, dört net adım.</h2>
                </div>

                <div className="tt-process">
                    {steps.map(([number, title, text]) => (
                        <article className="tt-process-step" key={number}>
                            <span>{number}</span>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="tt-audience">
                <h2>Her ölçekte iş birliği için tasarlandı.</h2>
                <div>
                    {audiences.map((audience) => (
                        <span key={audience}>{audience}</span>
                    ))}
                </div>
            </section>

            <section className="tt-bottom-cta">
                <div aria-hidden="true" />
                <div aria-hidden="true" />
                <h2>Projelerini daha akıllı yönetmeye başla.</h2>
                <Link className="tt-button tt-button-light" to="/register">
                    TeamTime'ı Deneyin
                </Link>
            </section>

            <Footer />
        </main>
    );
}

export default Home;
