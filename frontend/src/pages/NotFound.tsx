import { Link } from "react-router-dom";
import { isAuthenticated } from "../api";

function NotFound() {
    const targetPath = isAuthenticated() ? "/dashboard" : "/";
    const actionLabel = isAuthenticated() ? "Dashboard'a Dön" : "Ana Sayfaya Dön";

    return (
        <main className="page-shell status-page-shell">
            <section className="panel status-card" aria-labelledby="not-found-title">
                <span className="eyebrow">404</span>
                <h1 id="not-found-title">Sayfa bulunamadı</h1>
                <p>Aradığınız sayfa taşınmış, silinmiş veya hiç oluşturulmamış olabilir.</p>
                <div className="status-actions">
                    <Link className="button button-primary" to={targetPath}>
                        {actionLabel}
                    </Link>
                </div>
            </section>
        </main>
    );
}

export default NotFound;
