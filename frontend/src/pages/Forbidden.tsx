import { Link, useNavigate } from "react-router-dom";

function Forbidden() {
    const navigate = useNavigate();

    return (
        <main className="page-shell status-page-shell">
            <section className="panel status-card" aria-labelledby="forbidden-title">
                <span className="eyebrow">403</span>
                <h1 id="forbidden-title">Bu alana erişim yetkiniz yok</h1>
                <p>Bu sayfayı görüntülemek için gerekli izinlere sahip değilsiniz.</p>
                <div className="status-actions">
                    <Link className="button button-primary" to="/dashboard">
                        Dashboard'a Dön
                    </Link>
                    <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
                        Geri Dön
                    </button>
                </div>
            </section>
        </main>
    );
}

export default Forbidden;
