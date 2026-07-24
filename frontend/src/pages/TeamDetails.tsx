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

type UserSearchResult = {
    id: number;
    name: string;
    surname: string;
}

function TeamDetails() {
    const { id } = useParams();

    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [role, setRole] = useState("MEMBER");
    const [message, setMessage] = useState("");

    useEffect(() => {
        getTeam();
        getMembers();
    }, [id]);

    useEffect(() => {
        const query = userSearch.trim();

        if (query === "" || selectedUser) {
            setUserResults([]);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            apiFetch(`/users/search?query=${encodeURIComponent(query)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error();
                    }

                    return response.json();
                })
                .then(data => {
                    setUserResults(Array.isArray(data) ? data.slice(0, 10) : []);
                })
                .catch(() => {
                    setUserResults([]);
                });
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [userSearch, selectedUser]);

    function showMessage(text: string) {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    }

    async function readErrorMessage(response: Response) {
        const contentType = response.headers.get("Content-Type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.errors) {
                return Object.values(data.errors).join("\n");
            }

            return data.message || "Üye eklenemedi";
        }

        return await response.text();
    }

    function getFullName(user: UserSearchResult) {
        return `${user.name} ${user.surname}`;
    }

    function handleUserSearchChange(value: string) {
        setUserSearch(value);
        setSelectedUser(null);
    }

    function selectUser(user: UserSearchResult) {
        setSelectedUser(user);
        setUserSearch(getFullName(user));
        setUserResults([]);
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

        if (!selectedUser) {
            showMessage("Lütfen bir kullanıcı seçin");
            return;
        }

        apiFetch(`/teams/${id}/members`, {
            method: "POST",
            body: JSON.stringify({
                userId: selectedUser.id,
                role
            })
        })
            .then(response => {
                if (!response.ok) {
                    return readErrorMessage(response)
                        .then(errorMessage => {
                            throw new Error(errorMessage);
                        });
                }

                return response.json();
            })
            .then(createdMember => {
                setMembers([...members, createdMember]);
                setSelectedUser(null);
                setUserSearch("");
                setUserResults([]);
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
                        <div className="autocomplete-field">
                            <label>Kullanıcı Ara</label>
                            <input
                                type="text"
                                value={userSearch}
                                onChange={event => handleUserSearchChange(event.target.value)}
                                autoComplete="off"
                                required
                            />

                            {
                                userResults.length > 0 && (
                                    <div className="autocomplete-list">
                                        {
                                            userResults.map(user => (
                                                <button
                                                    className="autocomplete-option"
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => selectUser(user)}
                                                >
                                                    {getFullName(user)}
                                                </button>
                                            ))
                                        }
                                    </div>
                                )
                            }

                            {
                                selectedUser && (
                                    <p className="selected-user">
                                        {getFullName(selectedUser)}
                                    </p>
                                )
                            }
                        </div>

                        <label>Rol</label>
                        <select
                            value={role}
                            onChange={event => setRole(event.target.value)}
                            required
                        >
                            <option value="MEMBER">Üye</option>
                            <option value="ADMIN">Yönetici</option>
                        </select>

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
