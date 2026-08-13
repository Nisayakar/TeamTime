import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Navbar from "../components/Navbar";
import ProtectedRoute from "../components/ProtectedRoute";
import { mockJsonResponse, renderWithProviders } from "../test/testUtils";
import type { Task } from "../types/task";
import MyTasks from "./MyTasks";
import ProjectDetails from "./ProjectDetails";

describe("MyTasks", () => {
    it("is protected", () => {
        localStorage.clear();

        renderWithProviders(
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/my-tasks" element={<MyTasks />} />
                </Route>
                <Route path="/login" element={<div>Giriş ekranı</div>} />
            </Routes>,
            { routerProps: { initialEntries: ["/my-tasks"] } }
        );

        expect(screen.getByText("Giriş ekranı")).toBeInTheDocument();
    });

    it("loads /tasks/my and renders assigned tasks", async () => {
        setStoredUser();
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse([
            task({ title: "Frontend Düzenlenecek", projectName: "TeamTime", assignmentStatus: "PENDING" })
        ]));
        vi.stubGlobal("fetch", fetchMock);

        renderMyTasks();

        expect(await screen.findByText("Frontend Düzenlenecek")).toBeInTheDocument();
        expect(screen.getByText("TeamTime")).toBeInTheDocument();
        expect(screen.getAllByText("Kabul Bekliyor").length).toBeGreaterThan(1);
        expect(String(fetchMock.mock.calls[0][0])).toContain("/tasks/my");
    });

    it("shows pending accept and reject controls and updates local state", async () => {
        const user = userEvent.setup();
        setStoredUser();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse([
                task({ id: 10, title: "Atanan görev", assignmentStatus: "PENDING" })
            ]))
            .mockResolvedValueOnce(mockJsonResponse(task({ id: 10, title: "Atanan görev", assignmentStatus: "ACCEPTED" })));
        vi.stubGlobal("fetch", fetchMock);

        renderMyTasks();

        await user.click(await screen.findByRole("button", { name: "Kabul Et" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/tasks/10/assignment/accept"),
            expect.objectContaining({ method: "POST" })
        ));
        await waitFor(() => expect(screen.getAllByText("Kabul Edildi").length).toBeGreaterThan(1));
        expect(screen.queryByRole("button", { name: "Reddet" })).not.toBeInTheDocument();
    });

    it("rejects pending task with a reason and shows rejected reason", async () => {
        const user = userEvent.setup();
        setStoredUser();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse([
                task({ id: 10, title: "Reddedilecek görev", assignmentStatus: "PENDING" })
            ]))
            .mockResolvedValueOnce(mockJsonResponse(task({
                id: 10,
                title: "Reddedilecek görev",
                assignmentStatus: "REJECTED",
                rejectionReason: "Bu tarihte başka görevim var."
            })));
        vi.stubGlobal("fetch", fetchMock);

        renderMyTasks();

        await user.click(await screen.findByRole("button", { name: "Reddet" }));
        await user.click(screen.getByRole("button", { name: "Görevi Reddet" }));
        expect(screen.getByText("Mazeret zorunludur")).toBeInTheDocument();

        await user.type(screen.getByLabelText("Mazeret"), "Bu tarihte başka görevim var.");
        await user.click(screen.getByRole("button", { name: "Görevi Reddet" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/tasks/10/assignment/reject"),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ reason: "Bu tarihte başka görevim var." })
            })
        ));
        await waitFor(() => expect(screen.getAllByText("Reddedildi").length).toBeGreaterThan(1));
        expect(screen.getByText("Bu tarihte başka görevim var.")).toBeInTheDocument();
    });

    it("filters by search, assignment status, task status, priority and due group", async () => {
        const user = userEvent.setup();
        setStoredUser();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse([
            task({
                id: 1,
                title: "Frontend Düzenlenecek",
                projectName: "TeamTime",
                assignmentStatus: "PENDING",
                status: "DEVAM_EDIYOR",
                priority: "HIGH",
                dueDate: tomorrow()
            }),
            task({
                id: 2,
                title: "Backend Test",
                projectName: "API",
                assignmentStatus: "ACCEPTED",
                status: "BEKLIYOR",
                priority: "LOW",
                dueDate: null
            })
        ])));

        renderMyTasks();

        expect(await screen.findByText("Frontend Düzenlenecek")).toBeInTheDocument();
        await user.type(screen.getByPlaceholderText("Görev veya proje ara"), "front");
        await user.selectOptions(screen.getByLabelText("Atama"), "PENDING");
        await user.selectOptions(screen.getByLabelText("Görev Durumu"), "DEVAM_EDIYOR");
        await user.selectOptions(screen.getByLabelText("Öncelik"), "HIGH");
        await user.selectOptions(screen.getByLabelText("Son Tarih"), "UPCOMING");

        expect(screen.getByText("Frontend Düzenlenecek")).toBeInTheDocument();
        expect(screen.queryByText("Backend Test")).not.toBeInTheDocument();
    });

    it("shows empty and filtered empty states", async () => {
        const user = userEvent.setup();
        setStoredUser();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse([])));

        const emptyRender = renderMyTasks();

        expect(await screen.findByText("Size atanmış görev bulunmuyor.")).toBeInTheDocument();
        emptyRender.unmount();

        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse([
            task({ title: "Görünen görev" })
        ])));
        renderMyTasks();
        await user.type(await screen.findByPlaceholderText("Görev veya proje ara"), "olmayan");

        expect(await screen.findByText("Seçilen kriterlere uygun görev bulunamadı.")).toBeInTheDocument();
    });

    it("navigates to project detail from a task", async () => {
        const user = userEvent.setup();
        setStoredUser();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse([
            task({ projectId: 7, projectName: "TeamTime" })
        ])));

        renderWithProviders(
            <Routes>
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/project/:id" element={<div>Proje detayına gidildi</div>} />
            </Routes>,
            { routerProps: { initialEntries: ["/my-tasks"] } }
        );

        await user.click(await screen.findByRole("button", { name: "Projeye Git" }));

        expect(screen.getByText("Proje detayına gidildi")).toBeInTheDocument();
    });

    it("keeps ProjectDetails project scope visibility for assigned tasks", async () => {
        setStoredUser();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.includes("/projects/1")) {
                return Promise.resolve(mockJsonResponse({
                    id: 1,
                    projectName: "Team Project",
                    description: null,
                    startDate: null,
                    endDate: null,
                    teamId: 7,
                    teamName: "Ürün Takımı",
                    teamProject: true
                }));
            }

            if (url.includes("/teams/7/members")) {
                return Promise.resolve(mockJsonResponse([
                    {
                        id: 1,
                        userId: 1,
                        userName: "Owner User",
                        teamId: 7,
                        teamName: "Ürün Takımı",
                        role: "OWNER",
                        joinedDate: "2026-08-13T10:00:00"
                    },
                    {
                        id: 2,
                        userId: 2,
                        userName: "Nisa Yakar",
                        teamId: 7,
                        teamName: "Ürün Takımı",
                        role: "MEMBER",
                        joinedDate: "2026-08-13T10:00:00"
                    }
                ]));
            }

            return Promise.resolve(mockJsonResponse([
                task({ title: "Başkasına atanmış görev", assignedUserId: 2, assignedUserName: "Nisa Yakar" })
            ]));
        }));

        renderWithProviders(
            <Routes>
                <Route path="/project/:id" element={<ProjectDetails />} />
            </Routes>,
            { routerProps: { initialEntries: ["/project/1"] } }
        );

        expect(await screen.findByText("Başkasına atanmış görev")).toBeInTheDocument();
    });
});

describe("MyTasks navigation", () => {
    it("shows Görevlerim in desktop and mobile authenticated navbar", async () => {
        const user = userEvent.setup();
        setStoredUser();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockJsonResponse({ unreadCount: 0 })));

        renderWithProviders(<Navbar />, { routerProps: { initialEntries: ["/dashboard"] } });

        expect(await screen.findByRole("link", { name: /Görevlerim/ })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Menüyü aç" }));

        const navLinks = screen.getAllByRole("link", { name: /Görevlerim/ });
        expect(navLinks.length).toBeGreaterThan(0);
    });
});

function renderMyTasks() {
    return renderWithProviders(
        <Routes>
            <Route path="/my-tasks" element={<MyTasks />} />
        </Routes>,
        { routerProps: { initialEntries: ["/my-tasks"] } }
    );
}

function task(overrides: Partial<Task> = {}): Task {
    return {
        id: 10,
        title: "Atanan görev",
        description: "Görev açıklaması",
        status: "BEKLIYOR",
        priority: "MEDIUM",
        dueDate: null,
        createdAt: "2026-08-13T10:00:00",
        completedAt: null,
        overdue: false,
        projectId: 1,
        projectName: "Team Project",
        assignedUserId: 1,
        assignedUserName: "Test User",
        assignmentStatus: "PENDING",
        rejectionReason: null,
        assignedAt: "2026-08-13T10:00:00",
        respondedAt: null,
        ...overrides
    };
}

function setStoredUser() {
    localStorage.setItem("token", "valid-token");
    localStorage.setItem("user", JSON.stringify({
        id: 1,
        name: "Test",
        surname: "User",
        email: "test@example.com"
    }));
}

function tomorrow() {
    const value = new Date();
    value.setDate(value.getDate() + 1);
    return [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, "0"),
        String(value.getDate()).padStart(2, "0")
    ].join("-");
}
