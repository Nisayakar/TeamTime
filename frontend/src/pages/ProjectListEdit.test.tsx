import { cleanup, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mockJsonResponse, renderWithProviders } from "../test/testUtils";
import EditProject from "./EditProject";
import Projects from "./Projects";

describe("project list and edit permissions", () => {
    it("shows team association on edit without a team selector", async () => {
        setAuthenticatedUser(1);
        vi.stubGlobal("fetch", vi.fn<typeof fetch>((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.includes("/teams/11/members")) {
                return Promise.resolve(mockJsonResponse([teamMember(1, "OWNER")]));
            }

            return Promise.resolve(mockJsonResponse(teamProject()));
        }));

        renderWithProviders(
            <Routes>
                <Route path="/edit-project/:id" element={<EditProject />} />
            </Routes>,
            { routerProps: { initialEntries: ["/edit-project/7"] } }
        );

        expect(await screen.findByText("Takım Projesi")).toBeInTheDocument();
        expect(screen.getByText("Platform Takımı")).toBeInTheDocument();
        expect(screen.getByText("Projenin takım bağlantısı oluşturulduktan sonra değiştirilemez.")).toBeInTheDocument();
        expect(screen.queryByRole("combobox", { name: "Takım" })).not.toBeInTheDocument();
    });

    it("renders personal and team labels and hides team project controls from members", async () => {
        setAuthenticatedUser(3);
        vi.stubGlobal("fetch", projectsFetchMock("MEMBER"));

        renderWithProviders(<Projects />);

        expect(await screen.findByText("Kişisel")).toBeInTheDocument();
        expect(screen.getByText("Takım: Platform Takımı")).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Görevleri Gör" })).toHaveLength(2);
        expect(screen.getAllByRole("button", { name: "Düzenle" })).toHaveLength(1);
        expect(screen.getAllByRole("button", { name: "Sil" })).toHaveLength(1);
    });

    it("shows team project edit/delete controls to owners and admins", async () => {
        setAuthenticatedUser(1);
        vi.stubGlobal("fetch", projectsFetchMock("OWNER"));

        renderWithProviders(<Projects />);
        expect(await screen.findByText("Takım: Platform Takımı")).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Düzenle" })).toHaveLength(2);
        expect(screen.getAllByRole("button", { name: "Sil" })).toHaveLength(2);

        cleanup();
        setAuthenticatedUser(2);
        vi.stubGlobal("fetch", projectsFetchMock("ADMIN"));

        renderWithProviders(<Projects />);
        expect(await screen.findByText("Takım: Platform Takımı")).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Düzenle" })).toHaveLength(2);
        expect(screen.getAllByRole("button", { name: "Sil" })).toHaveLength(2);
    });
});

function projectsFetchMock(role: "OWNER" | "ADMIN" | "MEMBER") {
    return vi.fn<typeof fetch>((input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/teams/11/members")) {
            return Promise.resolve(mockJsonResponse([teamMember(currentUserId(role), role)]));
        }

        return Promise.resolve(mockJsonResponse([
            {
                id: 1,
                projectName: "Personal Project",
                description: "Personal",
                startDate: null,
                endDate: null,
                teamId: null,
                teamName: null,
                teamProject: false
            },
            teamProject()
        ]));
    });
}

function teamProject() {
    return {
        id: 7,
        projectName: "Team Project",
        description: "Team",
        startDate: null,
        endDate: null,
        teamId: 11,
        teamName: "Platform Takımı",
        teamProject: true
    };
}

function teamMember(userId: number, role: "OWNER" | "ADMIN" | "MEMBER") {
    return {
        id: userId,
        userId,
        userName: "Test User",
        teamId: 11,
        teamName: "Platform Takımı",
        role,
        joinedDate: "2026-08-03T10:00:00"
    };
}

function currentUserId(role: "OWNER" | "ADMIN" | "MEMBER") {
    return role === "OWNER" ? 1 : role === "ADMIN" ? 2 : 3;
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
