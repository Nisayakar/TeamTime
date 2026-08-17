import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mockJsonResponse, renderWithProviders } from "../test/testUtils";
import TeamDetails from "./TeamDetails";
import Teams from "./Teams";

describe("team role permissions", () => {
    it.skip("allows an owner to edit/delete teams, add admins or members, and remove non-owners", async () => {
        const user = userEvent.setup();
        setAuthenticatedUser(1);
        const fetchMock = teamFetchMock("OWNER");
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(
            <Routes>
                <Route path="/teams" element={<Teams />} />
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/teams"] } }
        );

        expect(await screen.findByRole("button", { name: "Düzenle" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Sil" })).toBeInTheDocument();

        cleanup();
        renderWithProviders(
            <Routes>
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/teams/1"] } }
        );

        expect(await screen.findByRole("heading", { name: "Yeni Üye Ekle" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Üye" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Yönetici" })).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Çıkar" })).toHaveLength(2);
        expect(screen.getAllByRole("button", { name: "Sahipliği Devret" })).toHaveLength(2);
        expect(screen.queryByText(/Kullanıcı Id/i)).not.toBeInTheDocument();
        expect(screen.getByText("ayse@example.com")).toBeInTheDocument();
        expect(screen.getByText("Sahip")).toBeInTheDocument();
        expect(screen.getByText("Siz")).toBeInTheDocument();

        await user.type(screen.getByLabelText("Kullanıcı Ara"), "zeynep");
        await user.click(await screen.findByRole("button", { name: "Zeynep Admin" }));
        await user.selectOptions(screen.getByLabelText("Rol"), "ADMIN");
        await user.click(screen.getByRole("button", { name: "Üye Ekle" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/teams/1/members"),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ userId: 9, role: "ADMIN" })
            })
        ));
        expect(await screen.findByText("zeynep@example.com")).toBeInTheDocument();
        expect(screen.queryByText("E-posta bilgisi yok")).not.toBeInTheDocument();
    });

    it.skip("allows an admin to edit teams, add/remove members only, and hides delete", async () => {
        const user = userEvent.setup();
        setAuthenticatedUser(2);
        const fetchMock = teamFetchMock("ADMIN");
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Teams />);

        expect(await screen.findByRole("button", { name: "Düzenle" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Sil" })).not.toBeInTheDocument();

        cleanup();
        renderWithProviders(
            <Routes>
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/teams/1"] } }
        );

        expect(await screen.findByRole("heading", { name: "Yeni Üye Ekle" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Üye" })).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "Yönetici" })).not.toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Çıkar" })).toHaveLength(1);
        expect(screen.queryByRole("button", { name: "Sahipliği Devret" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Takımdan Ayrıl" })).toBeInTheDocument();

        await user.type(screen.getByLabelText("Kullanıcı Ara"), "zeynep");
        await user.click(await screen.findByRole("button", { name: "Zeynep Admin" }));
        await user.click(screen.getByRole("button", { name: "Üye Ekle" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/teams/1/members"),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ userId: 9, role: "MEMBER" })
            })
        ));
    });

    it.skip("hides team mutation controls from members", async () => {
        setAuthenticatedUser(3);
        vi.stubGlobal("fetch", teamFetchMock("MEMBER"));

        renderWithProviders(<Teams />);

        await screen.findByText("Platform");
        expect(screen.queryByRole("button", { name: "Düzenle" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Sil" })).not.toBeInTheDocument();

        renderWithProviders(
            <Routes>
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/teams/1"] } }
        );

        await screen.findByText("Ayşe Owner");
        expect(screen.queryByRole("heading", { name: "Yeni Üye Ekle" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Çıkar" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Sahipliği Devret" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Takımdan Ayrıl" })).toBeInTheDocument();
        expect(screen.getByText("can@example.com")).toBeInTheDocument();
        expect(screen.queryByText(/Kullanıcı Id/i)).not.toBeInTheDocument();
    });

    it.skip("opens transfer confirmation and updates roles locally after owner transfer", async () => {
        const user = userEvent.setup();
        setAuthenticatedUser(1);
        const fetchMock = teamFetchMock("OWNER");
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(
            <Routes>
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/teams/1"] } }
        );

        await screen.findByText("Ayşe Owner");
        await user.click(screen.getAllByRole("button", { name: "Sahipliği Devret" })[1]);

        expect(screen.getByRole("dialog", { name: "Takım sahipliğini devret" })).toBeInTheDocument();
        expect(screen.getByText("Takım sahipliğini Can Member kullanıcısına devretmek istediğinizden emin misiniz? Devretme sonrası rolünüz Yönetici olacaktır.")).toBeInTheDocument();

        await user.click(within(screen.getByRole("dialog", { name: "Takım sahipliğini devret" })).getByRole("button", { name: "Sahipliği Devret" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/teams/1/members/3/owner"),
            expect.objectContaining({ method: "PUT" })
        ));
        expect(await screen.findByText("Takım sahipliği devredildi.")).toBeInTheDocument();
        expect(screen.getByText("Can Member").closest(".team-member-card")).toHaveTextContent("Sahip");
        expect(screen.getByText("Ayşe Owner").closest(".team-member-card")).toHaveTextContent("Yönetici");
    });

    it.skip("lets members leave and navigates to teams", async () => {
        const user = userEvent.setup();
        setAuthenticatedUser(3);
        const fetchMock = teamFetchMock("MEMBER");
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(
            <Routes>
                <Route path="/teams" element={<h1>Takımlarım</h1>} />
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/teams/1"] } }
        );

        await screen.findByText("Can Member");
        await user.click(screen.getByRole("button", { name: "Takımdan Ayrıl" }));
        expect(screen.getByRole("dialog", { name: "Takımdan ayrıl" })).toBeInTheDocument();
        await user.click(within(screen.getByRole("dialog", { name: "Takımdan ayrıl" })).getByRole("button", { name: "Takımdan Ayrıl" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/teams/1/members/me"),
            expect.objectContaining({ method: "DELETE" })
        ));
        expect(await screen.findByRole("heading", { name: "Takımlarım" })).toBeInTheDocument();
    });

    it.skip("shows readable owner leave conflict inline", async () => {
        const user = userEvent.setup();
        setAuthenticatedUser(1);
        const fetchMock = teamFetchMock("OWNER", { ownerLeaveConflict: true });
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(
            <Routes>
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/teams/1"] } }
        );

        await screen.findByText("Ayşe Owner");
        await user.click(screen.getByRole("button", { name: "Takımdan Ayrıl" }));
        await user.click(within(screen.getByRole("dialog", { name: "Takımdan ayrıl" })).getByRole("button", { name: "Takımdan Ayrıl" }));

        expect(await screen.findByText("Takımdan çıkmadan önce takım sahipliğini başka bir üyeye devretmelisiniz.")).toBeInTheDocument();
    });
});

function teamFetchMock(currentRole: "OWNER" | "ADMIN" | "MEMBER", options: { ownerLeaveConflict?: boolean } = {}) {
    let addedMember = false;

    return vi.fn<typeof fetch>((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes("/users/search")) {
            return Promise.resolve(mockJsonResponse([{ id: 9, name: "Zeynep", surname: "Admin" }]));
        }

        if (url.includes("/teams/1/members") && init?.method === "POST") {
            addedMember = true;
            return Promise.resolve(mockJsonResponse({
                id: 4,
                userId: 9,
                userName: "Zeynep Admin",
                teamId: 1,
                teamName: "Platform",
                role: JSON.parse(String(init.body)).role,
                joinedDate: "2026-08-03T10:00:00"
            }));
        }

        if (url.includes("/teams/1/members/3/owner") && init?.method === "PUT") {
            return Promise.resolve(mockJsonResponse([
                member(1, "Ayşe Owner", "ADMIN"),
                member(2, "Mehmet Admin", "ADMIN"),
                member(3, "Can Member", "OWNER")
            ]));
        }

        if (url.includes("/teams/1/members/me") && init?.method === "DELETE") {
            if (options.ownerLeaveConflict) {
                return Promise.resolve(mockJsonResponse({
                    message: "Takımdan çıkmadan önce takım sahipliğini başka bir üyeye devretmelisiniz."
                }, { status: 409 }));
            }

            return Promise.resolve(new Response(null, { status: 204 }));
        }

        if (url.includes("/teams/1/members")) {
            const members = addedMember
                ? [...membersForRole(currentRole), member(9, "Zeynep Admin", "ADMIN")]
                : membersForRole(currentRole);

            return Promise.resolve(mockJsonResponse(members));
        }

        if (url.includes("/team-invitations/team/1") || url.includes("/teams/1/invitations")) {
            return Promise.resolve(mockJsonResponse([
                {
                    invitationId: 101,
                    teamId: 1,
                    teamName: "Platform",
                    inviterName: "Ayşe Owner",
                    invitedUserFullName: "Ali Veli",
                    status: "PENDING",
                    createdAt: "2026-08-04T10:00:00"
                }
            ]));
        }

        return Promise.resolve(mockJsonResponse([
            { id: 1, name: "Platform", description: "Ürün ekibi", createdDate: "2026-08-03T10:00:00" }
        ]));
    });
}

function membersForRole(currentRole: "OWNER" | "ADMIN" | "MEMBER") {
    return [
        member(1, "Ayşe Owner", "OWNER"),
        member(2, "Mehmet Admin", "ADMIN"),
        member(3, "Can Member", "MEMBER")
    ].map(currentMember => currentMember.userId === currentUserIdForRole(currentRole)
        ? { ...currentMember, role: currentRole }
        : currentMember);
}

function currentUserIdForRole(role: "OWNER" | "ADMIN" | "MEMBER") {
    return role === "OWNER" ? 1 : role === "ADMIN" ? 2 : 3;
}

function member(userId: number, userName: string, role: "OWNER" | "ADMIN" | "MEMBER") {
    const emails: Record<number, string> = {
        1: "ayse@example.com",
        2: "mehmet@example.com",
        3: "can@example.com",
        9: "zeynep@example.com"
    };

    return {
        id: userId,
        userId,
        userName,
        userEmail: emails[userId] ?? "user@example.com",
        teamId: 1,
        teamName: "Platform",
        role,
        joinedDate: "2026-08-03T10:00:00"
    };
}

function setAuthenticatedUser(id: number) {
    localStorage.setItem("token", "valid-token");
    localStorage.setItem("user", JSON.stringify({
        id,
        name: "Test",
        surname: "User",
        email: "test@example.com"
    }));
}
