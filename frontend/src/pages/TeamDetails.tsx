import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api";

type Team = {
    id: number;
    name: string;
    description: string;
    createdDate?: string;
}

type TeamMember = {
    id: number;
    userId: number;
    userName: string;
    teamId: number;
    teamName: string;
    role: string;
    joinedDate: string;
}

function TeamDetails() {
    const { id } = useParams();

    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState("MEMBER");
    const [message, setMessage] = useState("");

    useEffect(() => {
        getTeam();
        getMembers();
    }, [id]);

    function showMessage(text: string) {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    }

    function getTeam() {
        apiFetch("/teams")
            .then(response => response.json())
            .then(data => {
                const teams = Array.isArray(data) ? data : [];
                const selectedTeam = teams.find((currentTeam: Team) => currentTeam.id === Number(id));

                setTeam(selectedTeam ?? null);
            })
            .catch(() => {
                setTeam(null);
            });
    }

    function getMembers() {
        apiFetch(`/teams/${id}/members`)
            .then(response => {
                if (!response.ok) {
                    throw new Error();
                }

                return response.json();
            })
            .then(data => {
                setMembers(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                setMembers([]);
            });
    }

    function addMember(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (userId.trim() === "") {
            showMessage("Kullanıcı id boş olamaz");
            return;
        }

        apiFetch(`/teams/${id}/members`, {
            method: "POST",
            body: JSON.stringify({
                userId: Number(userId),
                role
            })
        })
            .then(response => {
                if (!response.ok) {
                    return response.text()
                        .then(errorMessage => {
                            throw new Error(errorMessage);
                        });
                }

                return response.json();
            })
            .then(createdMember => {
                setMembers([...members, createdMember]);
                setUserId("");
                setRole("MEMBER");
                showMessage("Üye takıma eklendi");
            })
            .catch(error => {
                showMessage(error.message || "Üye eklenemedi");
            });
    }

    return (
        <main className="page-shell">
            {
                message &&
                <div className="message-box">
                    {message}
                </div>
            }

            <section className="hero-card team-profile">
                <div className="profile-avatar">TM</div>

                <div>
                    <span className="eyebrow">Takım profili</span>
                    <h1>{team ? team.name : "Takım Detayları"}</h1>
                    <p>{team ? team.description : "Takım bilgisi bulunamadı"}</p>
                    <span className="badge badge-purple">{members.length} üye</span>
                </div>
            </section>

            <section className="content-grid two-columns">
                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Üyelik</span>
                        <h2>Yeni Üye Ekle</h2>
                    </div>

                    <form className="stacked-form" onSubmit={addMember}>
                        <label>Kullanıcı Id</label>
                        <input
                            type="number"
                            value={userId}
                            onChange={event => setUserId(event.target.value)}
                            required
                        />

                        <label>Rol</label>
                        <input
                            type="text"
                            value={role}
                            onChange={event => setRole(event.target.value)}
                            required
                        />

                        <button className="button button-primary button-full" type="submit">Üye Ekle</button>
                    </form>
                </div>

                <div className="panel">
                    <div className="section-heading">
                        <span className="eyebrow">Takım</span>
                        <h2>Takım Üyeleri</h2>
                    </div>

                    {
                        members.length === 0 ? (
                            <p className="empty-state">Bu takımda henüz üye yok</p>
                        ) : (
                            members.map(member => (
                                <div className="member-card" key={member.id}>
                                    <div className="user-avatar">{member.userName?.slice(0, 2).toUpperCase() || "US"}</div>

                                    <div>
                                        <h3>{member.userName}</h3>
                                        <p>Kullanıcı Id: {member.userId}</p>
                                    </div>

                                    <span className="badge badge-blue">{member.role}</span>
                                </div>
                            ))
                        )
                    }
                </div>
            </section>
        </main>
    );
}

export default TeamDetails;
