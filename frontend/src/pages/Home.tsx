import {Link} from "react-router-dom";

function Home(){
    return(
        <div>
            <section>
                <h1>TEAMTIME</h1>
                <p>
                    Proje süreçlerini tek platformda yönetin.
                </p>

          <Link to="/create-project">
          <button>
                Proje Oluştur
            </button>
            </Link>
            
            <Link to="/login">
            <button>
                Giriş Yap
            </button>
            </Link>
           </section>
        
             <section>
            <h2>Nasıl Çalışır?</h2>
            <br></br>
            <p>📁 Proje oluştur</p>
            <p>👥 Takımını davet et</p>
            <p>📋 Görevleri dağıt</p>
            <p>📈 İlerlemeyi takip et</p>
            </section>

            <section>
                <h2>Neden TeamTime?</h2>
                <p>Basit</p>
                <p>Hızlı</p>
                <p>Takım Odaklı</p>
                <p>Ücretsiz</p>
            </section>

        </div>
    )
}

export default Home;