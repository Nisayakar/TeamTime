import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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
        fetch("http://localhost:8085/api/teams")
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
        fetch(`http://localhost:8085/api/teams/${id}/members`)
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

        fetch(`http://localhost:8085/api/teams/${id}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
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
        <div>
            {
                message &&
                <div className="message-box">
                    {message}
                </div>
            }

            <h1>Takım Detayları</h1>

            {
                team ? (
                    <div className="card">
                        <h3>{team.name}</h3>
                        <p>{team.description}</p>
                    </div>
                ) : (
                    <p>Takım bilgisi bulunamadı</p>
                )
            }

            <h2>Yeni Üye Ekle</h2>

            <form onSubmit={addMember}>
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

                <button type="submit">Üye Ekle</button>
            </form>

            <h2>Takım Üyeleri</h2>

            {
                members.length === 0 ? (
                    <p>Bu takımda henüz üye yok</p>
                ) : (
                    members.map(member => (
                        <div className="card" key={member.id}>
                            <h3>{member.userName}</h3>
                            <p>Kullanıcı Id: {member.userId}</p>
                            <p>Rol: {member.role}</p>
                        </div>
                    ))
                )
            }
        </div>
    );
}

export default TeamDetails;
