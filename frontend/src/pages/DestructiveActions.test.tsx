import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mockJsonResponse, mockTextResponse, renderWithProviders } from "../test/testUtils";
import ProjectDetails from "./ProjectDetails";
import Projects from "./Projects";
import TeamDetails from "./TeamDetails";
import Teams from "./Teams";

describe("destructive action confirmations", () => {
    it("project delete opens confirmation and successful deletion closes it", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>((input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);

            if (url.includes("/projects") && init?.method === "DELETE") {
                return Promise.resolve(mockTextResponse("Proje başarıyla silindi."));
            }

            return Promise.resolve(mockJsonResponse([
                {
                    id: 1,
                    projectName: "Mobil Uygulama",
                    description: "Test proje",
                    startDate: null,
                    endDate: null,
                    teamId: null,
                    teamName: null,
                    teamProject: false
                }
            ]));
        });
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Projects />);

        await user.click(await screen.findByRole("button", { name: "Sil" }));

        expect(screen.getByRole("dialog", { name: "Projeyi sil" })).toHaveTextContent("Mobil Uygulama");

        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sil" }));

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(await screen.findByText("Proje başarıyla silindi.")).toBeInTheDocument();
    });

    it("task delete opens confirmation and failed deletion keeps the modal open", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>((input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);

            if (url.includes("/projects/1")) {
                return Promise.resolve(mockJsonResponse({
                    id: 1,
                    projectName: "Web Projesi",
                    description: null,
                    startDate: null,
                    endDate: null,
                    teamId: null,
                    teamName: null,
                    teamProject: false
                }));
            }

            if (url.includes("/tasks/10") && init?.method === "DELETE") {
                return Promise.resolve(mockJsonResponse({ message: "Görev silinemedi" }, { status: 500 }));
            }

            return Promise.resolve(mockJsonResponse([
                {
                    id: 10,
                    title: "Analiz",
                    description: "Detay",
                    status: "BEKLIYOR",
                    priority: "MEDIUM",
                    dueDate: null,
                    createdAt: "2026-08-03T10:00:00",
                    completedAt: null,
                    overdue: false,
                    projectId: 1,
                    projectName: "Web Projesi",
                    assignedUserId: null,
                    assignedUserName: null,
                    assignmentStatus: "UNASSIGNED",
                    rejectionReason: null,
                    assignedAt: null,
                    respondedAt: null
                }
            ]));
        }));

        renderWithProviders(
            <Routes>
                <Route path="/project/:id" element={<ProjectDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/project/1"] } }
        );

        await user.click(await screen.findByRole("button", { name: "Sil" }));

        expect(screen.getByRole("dialog", { name: "Görevi sil" })).toHaveTextContent("Analiz");

        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sil" }));

        expect(await screen.findByRole("dialog", { name: "Görevi sil" })).toBeInTheDocument();
        expect(await screen.findByText("Görev silinemedi")).toBeInTheDocument();
    });

    it("team delete opens confirmation", async () => {
        const user = userEvent.setup();
        setAuthenticatedUser();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.includes("/teams/1/members")) {
                return Promise.resolve(mockJsonResponse([
                    {
                        id: 1,
                        userId: 1,
                        userName: "Ayşe Demir",
                        teamId: 1,
                        teamName: "Frontend",
                        role: "OWNER",
                        joinedDate: "2026-08-03T10:00:00"
                    }
                ]));
            }

            return Promise.resolve(mockJsonResponse([
                {
                    id: 1,
                    name: "Frontend",
                    description: "Ürün ekibi",
                    createdDate: "2026-08-03T10:00:00"
                }
            ]));
        }));

        renderWithProviders(<Teams />);

        await user.click(await screen.findByRole("button", { name: "Sil" }));

        expect(screen.getByRole("dialog", { name: "Takımı sil" })).toHaveTextContent("Frontend");
        expect(screen.getByRole("dialog")).toHaveTextContent("bağlı projelere sahipse silinemeyebilir");
    });

    it("member removal opens confirmation", async () => {
        const user = userEvent.setup();
        setAuthenticatedUser();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.includes("/teams/1/members")) {
                return Promise.resolve(mockJsonResponse([
                    {
                        id: 1,
                        userId: 1,
                        userName: "Ayşe Demir",
                        teamId: 1,
                        teamName: "Frontend",
                        role: "OWNER",
                        joinedDate: "2026-08-03T10:00:00"
                    },
                    {
                        id: 2,
                        userId: 2,
                        userName: "Mehmet Kaya",
                        teamId: 1,
                        teamName: "Frontend",
                        role: "MEMBER",
                        joinedDate: "2026-08-03T10:00:00"
                    }
                ]));
            }

            if (url.includes("/team-invitations/team/") || url.includes("/teams/1/invitations")) {
                return Promise.resolve(mockJsonResponse([]));
            }

            return Promise.resolve(mockJsonResponse([
                {
                    id: 1,
                    name: "Frontend",
                    description: "Ürün ekibi",
                    createdDate: "2026-08-03T10:00:00"
                }
            ]));
        }));

        renderWithProviders(
            <Routes>
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/teams/1"] } }
        );

        await user.click(await screen.findByRole("button", { name: "Çıkar" }));

        expect(screen.getByRole("dialog", { name: "Üyeyi çıkar" })).toHaveTextContent("Mehmet Kaya");
        expect(screen.getByRole("dialog")).toHaveTextContent("Üye");
    });
});

function setAuthenticatedUser() {
    localStorage.setItem("token", "valid-token");
    localStorage.setItem("user", JSON.stringify({
        id: 1,
        name: "Ayşe",
        surname: "Demir",
        email: "ayse@example.com"
    }));
}
