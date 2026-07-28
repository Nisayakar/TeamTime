import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from "react";
import { useForm } from "@formspree/react";
import { Link } from "react-router-dom";
import "./Home.css";

const features = [
    {
        title: "Görev Yönetimi",
        category: "Görev Akışı",
        description:
            "Görevleri oluşturun, sorumluları belirleyin ve çalışma durumlarını takip edin.",
        image: "/home/features/6.png",
        alt:
            "Planlanan, devam eden ve tamamlanan görevlerin yönetildiği görev panosu",
        tags: ["Atama", "Durum", "Son tarih"],
    },
    {
        title: "Proje Takibi",
        category: "Proje Kontrolü",
        description:
            "Proje tarihlerini, aşamalarını ve ilerleme durumunu tek alanda görüntüleyin.",
        image: "/home/features/4.png",
        alt:
            "Proje aşamalarını ve zaman çizelgesini gösteren proje takip ekranı",
        tags: ["Aşamalar", "Tarihler", "İlerleme"],
    },
    {
        title: "Ekip Koordinasyonu",
        category: "Ortak Çalışma",
        description:
            "Ekip üyelerinin aynı çalışma alanında koordineli biçimde ilerlemesini sağlayın.",
        image: "/home/features/2.png",
        alt:
            "Ortak masa etrafında koordineli çalışan ekip üyeleri",
        tags: ["Ortak alan", "Sorumluluk", "İş birliği"],
    },
    {
        title: "Takım Yönetimi",
        category: "Takım Yapısı",
        description:
            "Takımları oluşturun, düzenleyin ve ilgili projelerle ilişkilendirin.",
        image: "/home/features/3.png",
        alt:
            "Birden fazla ekip grubunun merkezi alandan yönetildiği takım yönetimi ekranı",
        tags: ["Takım oluşturma", "Düzenleme", "Proje bağlantısı"],
    },
    {
        title: "Üye ve Rol Yönetimi",
        category: "Yetki Dağılımı",
        description:
            "Takım üyelerini ekleyin ve proje içindeki yetki ve sorumluluklarını belirleyin.",
        image: "/home/features/1.png",
        alt:
            "Üyelere rollerin ve yetkilerin atandığı rol yönetimi ekranı",
        tags: ["Üye ekleme", "Rol", "Yetki"],
    },
    {
        title: "İlerleme Görünürlüğü",
        category: "Durum Özeti",
        description:
            "Tamamlanan, devam eden ve bekleyen işleri tek bakışta ayırt edin.",
        image: "/home/features/5.png",
        alt:
            "Projelerin ilerleme oranlarını gösteren görsel durum özeti",
        tags: ["Tamamlanan", "Devam eden", "Bekleyen"],
    },
];

const featureDeckItems = [
    ...features.map((feature) => ({
        type: "feature" as const,
        ...feature,
    })),
    {
        type: "cta" as const,
        title: "Ekibinizle aynı çalışma alanında buluşun.",
        description:
            "Görevleri, projeleri ve ekip ilerlemesini tek bir ortak akışta yönetin.",
    },
];

function Home() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
    const [hasFeatureDeckChanged, setHasFeatureDeckChanged] = useState(false);
    const [contactFields, setContactFields] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const activeFeatureIndexRef = useRef(0);
    const featureHoverDelayRef = useRef<number | null>(null);
    const featureHoverRepeatRef = useRef<number | null>(null);
    const featureHoverLockedRef = useRef(false);
    const featureTouchStartXRef = useRef<number | null>(null);
    const featureItems = useMemo(() => featureDeckItems, []);
    const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;
    const formspreeFormId = import.meta.env.VITE_FORMSPREE_FORM_ID;
    const [contactState, submitContactForm] = useForm(formspreeFormId);

    const clearFeatureDeckTimers = useCallback(() => {
        if (featureHoverDelayRef.current !== null) {
            window.clearTimeout(featureHoverDelayRef.current);
            featureHoverDelayRef.current = null;
        }

        if (featureHoverRepeatRef.current !== null) {
            window.clearTimeout(featureHoverRepeatRef.current);
            featureHoverRepeatRef.current = null;
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setLoading(false);
        }, 900);

        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => clearFeatureDeckTimers, [clearFeatureDeckTimers]);

    useEffect(() => {
        activeFeatureIndexRef.current = activeFeatureIndex;
    }, [activeFeatureIndex]);

    useEffect(() => {
        if (contactState.succeeded) {
            setContactFields({
                name: "",
                email: "",
                subject: "",
                message: "",
            });
        }
    }, [contactState.succeeded]);

    function handleContactFieldChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        const { name, value } = event.target;

        setContactFields((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function canUseFeatureDeckHover() {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const coarsePointer = window.matchMedia("(pointer: coarse)");

        return !reducedMotion.matches && !coarsePointer.matches;
    }

    function moveFeatureDeck(direction: "left" | "right") {
        const current = activeFeatureIndexRef.current;
        const next = direction === "left"
            ? Math.max(0, current - 1)
            : Math.min(featureItems.length - 1, current + 1);

        if (next === current) {
            clearFeatureDeckTimers();
            return false;
        }

        activeFeatureIndexRef.current = next;
        setActiveFeatureIndex(next);
        setHasFeatureDeckChanged(true);
        return true;
    }

    function startFeatureDeckHover(direction: "left" | "right") {
        if (!canUseFeatureDeckHover() || featureHoverLockedRef.current) {
            return;
        }

        clearFeatureDeckTimers();

        featureHoverDelayRef.current = window.setTimeout(() => {
            const moved = moveFeatureDeck(direction);

            if (moved) {
                featureHoverLockedRef.current = true;
            }

            featureHoverDelayRef.current = null;
        }, 120);
    }

    function resetFeatureDeckHover() {
        featureHoverLockedRef.current = false;
        clearFeatureDeckTimers();
    }

    function handleFeatureDeckKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveFeatureDeck("left");
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            moveFeatureDeck("right");
        }
    }

    function getFeatureDeckPosition(index: number) {
        const position = index - activeFeatureIndex;

        if (position < -2) {
            return "hidden-left";
        }

        if (position > 2) {
            return "hidden-right";
        }

        return String(position);
    }

    function handleFeatureDeckPointerDown(event: PointerEvent<HTMLDivElement>) {
        if (!window.matchMedia("(pointer: coarse)").matches) {
            return;
        }

        featureTouchStartXRef.current = event.clientX;
    }

    function handleFeatureDeckPointerUp(event: PointerEvent<HTMLDivElement>) {
        if (featureTouchStartXRef.current === null) {
            return;
        }

        const deltaX = event.clientX - featureTouchStartXRef.current;
        featureTouchStartXRef.current = null;

        if (Math.abs(deltaX) < 44) {
            return;
        }

        moveFeatureDeck(deltaX > 0 ? "left" : "right");
    }

    return (
        <main className="template-home">
            {loading && (
                <div className="template-loader" role="status" aria-label="Sayfa yükleniyor">
                    <div aria-hidden="true" />
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
                <div className="video-hero-media" aria-hidden="true">
                    <video
                        className="video-hero-video"
                        src="/media/teamtime-hero.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        tabIndex={-1}
                    />
                    <div className="video-hero-overlay" />
                </div>

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

            <section id="features" className="template-we-do" aria-label="TeamTime özellikleri">
                <div className="template-feature-shell">
                    <div
                        className="template-feature-carousel"
                        onPointerDown={handleFeatureDeckPointerDown}
                        onPointerUp={handleFeatureDeckPointerUp}
                        onPointerCancel={() => {
                            featureTouchStartXRef.current = null;
                            resetFeatureDeckHover();
                        }}
                        onPointerLeave={resetFeatureDeckHover}
                        onKeyDown={handleFeatureDeckKeyDown}
                        tabIndex={0}
                        aria-label="Özellik kartları. Sağ ve sol ok tuşlarıyla kartlar arasında gezinin."
                    >
                        <div className="template-feature-viewport">
                            <div className="template-feature-grid">
                                {featureItems.map((feature, index) => (
                                    <article
                                        className={`template-feature-card ${feature.type === "cta" ? "template-feature-card-cta" : ""}`}
                                        data-deck-position={getFeatureDeckPosition(index)}
                                        data-feature-accent={index}
                                        key={feature.title}
                                        tabIndex={0}
                                        onPointerEnter={() => {
                                            if (index === activeFeatureIndex - 1) {
                                                startFeatureDeckHover("left");
                                            } else if (index === activeFeatureIndex + 1) {
                                                startFeatureDeckHover("right");
                                            } else {
                                                clearFeatureDeckTimers();
                                            }
                                        }}
                                        onPointerLeave={resetFeatureDeckHover}
                                    >
                                        {feature.type === "feature" ? (
                                            <>
                                                <div className="template-feature-content">
                                                    <span className="template-feature-index">{String(index + 1).padStart(2, "0")}</span>
                                                    <span className="template-feature-label">{feature.category}</span>
                                                    <figure className="template-feature-media">
                                                        <img src={feature.image} alt={feature.alt} />
                                                    </figure>
                                                    <h3>{feature.title}</h3>
                                                    <p>{feature.description}</p>
                                                    <ul className="template-feature-tags" aria-label={`${feature.title} detayları`}>
                                                        {feature.tags.map((tag) => (
                                                            <li key={tag}>{tag}</li>
                                                        ))}
                                                    </ul>
                                                    <div className="template-feature-accent" aria-hidden="true" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="template-feature-final">
                                                <span className="template-feature-label">TEAMTIME</span>
                                                <h3>{feature.title}</h3>
                                                <p>{feature.description}</p>
                                                <Link className="template-feature-button" to="/register">Ücretsiz Başla</Link>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>
                    <p className={`template-feature-hint ${hasFeatureDeckChanged ? "is-hidden" : ""}`}>
                        Yan kartların üzerine gelerek özellikleri keşfedin.
                    </p>
                    <div className="template-feature-progress" aria-live="polite">
                        {String(activeFeatureIndex + 1).padStart(2, "0")} / {String(featureItems.length).padStart(2, "0")}
                    </div>
                </div>
            </section>

            <section id="contact" className="template-contact">
                <div className="template-container">
                    <div className="template-contact-grid">
                        <div className="template-contact-copy">
                            <div className="template-contact-heading">
                                <span>İLETİŞİM</span>
                                <h2>Bizimle İletişime Geçin</h2>
                                <p>TeamTime hakkında sorularınızı, görüşlerinizi ve önerilerinizi bizimle paylaşın.</p>
                            </div>
                        </div>

                        <form className="template-contact-form" onSubmit={submitContactForm}>
                            <div className="template-contact-form-fields">
                                <div className="template-contact-row">
                                    <div className="template-field">
                                        <label htmlFor="contact-name">Ad Soyad</label>
                                        <input
                                            id="contact-name"
                                            name="name"
                                            type="text"
                                            value={contactFields.name}
                                            onChange={handleContactFieldChange}
                                            autoComplete="name"
                                            placeholder="Ayşe Demir"
                                            required
                                        />
                                    </div>

                                    <div className="template-field">
                                        <label htmlFor="contact-email">E-posta</label>
                                        <input
                                            id="contact-email"
                                            name="email"
                                            type="email"
                                            value={contactFields.email}
                                            onChange={handleContactFieldChange}
                                            autoComplete="email"
                                            placeholder="ayse.demir@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="template-field">
                                    <label htmlFor="contact-subject">Konu</label>
                                    <select
                                        id="contact-subject"
                                        name="subject"
                                        value={contactFields.subject}
                                        onChange={handleContactFieldChange}
                                        required
                                    >
                                        <option value="" disabled>Bir konu seçin</option>
                                        <option value="Soru">Soru</option>
                                        <option value="Öneri">Öneri</option>
                                        <option value="İş birliği">İş birliği</option>
                                        <option value="Teknik destek">Teknik destek</option>
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>

                                <div className="template-field">
                                    <label htmlFor="contact-message">Mesaj</label>
                                    <textarea
                                        id="contact-message"
                                        name="message"
                                        value={contactFields.message}
                                        onChange={handleContactFieldChange}
                                        placeholder="Size nasıl yardımcı olabiliriz?"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="template-contact-actions">
                                <p>Bilgileriniz gizlilik standartlarımıza uygun olarak işlenmektedir.</p>
                                <button className="template-send-button" type="submit" disabled={contactState.submitting}>
                                    <span>{contactState.submitting ? "Gönderiliyor..." : "Mesaj Gönder"}</span>
                                    <span aria-hidden="true">→</span>
                                </button>
                            </div>

                            <div className="template-contact-feedback" aria-live="polite">
                                {contactState.succeeded && (
                                    <p className="success">Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.</p>
                                )}
                                {!contactState.succeeded && contactState.errors && (
                                    <p className="error">Mesaj gönderilemedi. Lütfen tekrar deneyin veya doğrudan e-posta gönderin.</p>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            <footer className="template-footer">
                <div className="template-container">
                    <div className="template-footer-grid">
                        <div>
                            <h3>Bağlantılar</h3>
                            <ul>
                                <li><a href="#top">Ana Sayfa</a></li>
                                <li><a href="#features">Özellikler</a></li>
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
                            <h3>İLETİŞİM</h3>
                            <ul>
                                <li><a href={`mailto:${contactEmail}`}>{contactEmail}</a></li>
                                <li>TeamTime destek ve iletişim</li>
                                <li>Proje, görev ve ekip yönetimi</li>
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
