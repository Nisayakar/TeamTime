import { useState } from "react";

function Profile(){
    const [user]=useState({name:"Nisa",surname:"Yakar",email:"nisa@gmail.com"});
    const [oldPassword, setOldPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
    return(
        <div>
            <h1>👤 Profilim</h1>
            <p>Ad Soyad: {user.name} {user.surname}</p>
            <p>E-mail: {user.email}</p>

            <br></br>
            <p>Şifre Değiştir</p>
            <label>Eski Şifre:</label>
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}></input>
            <br></br>
            <label>Yeni Şifre: </label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}></input>
            <br></br>
            <button>Şifreyi Güncelle</button>
            <br></br>
            <button>Çıkış Yap</button>
        </div>
    )
}

export default Profile;
