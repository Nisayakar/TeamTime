import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mockJsonResponse, renderWithRouter } from "../test/testUtils";
import Dashboard from "./Dashboard";

describe("Dashboard", () => {
    beforeEach(() => {
        window.matchMedia = vi.fn().mockReturnValue({
            matches: false,
            media: "",
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn()
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders statistic cards and returned upcoming tasks", async () => {
        setStoredUser();
        vi.stubGlobal("fetch", dashboardFetchMock());

        renderWithRouter(<Dashboard />);

        expect(await screen.findByText("İlerleme")).toBeInTheDocument();
        expect(screen.getByText("Aktif Proje")).toBeInTheDocument();
        expect(screen.getByText("12")).toBeInTheDocument();
        expect(screen.getByText("Gecikmiş Görevler")).toBeInTheDocument();
        expect(screen.getAllByText("3")).not.toHaveLength(0);
        expect(screen.getAllByText("Yaklaşan Görevler Listesi")).toHaveLength(1);
        expect(screen.getAllByText("5")).not.toHaveLength(0);
        expect(screen.getByText("Upcoming one")).toBeInTheDocument();
        expect(screen.getByText("Upcoming two")).toBeInTheDocument();
    });

    it("renders a high-priority in-progress task returned by the upcoming endpoint", async () => {
        setStoredUser();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        vi.stubGlobal("fetch", dashboardFetchMock({
            upcomingTasks: [
                {
                    id: 1,
                    title: "Frontend Düzenlenecek",
                    description: "Frontend",
                    status: "DEVAM_EDIYOR",
                    priority: "HIGH",
                    dueDate: tomorrowStr,
                    createdAt: "2026-08-13T10:00:00",
                    completedAt: null,
                    overdue: false,
                    projectId: 1,
                    projectName: "TeamTime"
                }
            ]
        }));

        renderWithRouter(<Dashboard />);

        expect(await screen.findByText("Frontend Düzenlenecek")).toBeInTheDocument();
        expect(screen.queryByText("Yaklaşan göreviniz bulunmuyor.")).not.toBeInTheDocument();
    });

    it("navigates from a project-linked upcoming task", async () => {
        const user = userEvent.setup();
        setStoredUser();
        vi.stubGlobal("fetch", dashboardFetchMock());

        renderWithRouter(
            <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/project/:id" element={<h1>Project Detail</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/dashboard"] } }
        );

        await user.click(await screen.findByRole("button", { name: /Upcoming one/ }));

        expect(screen.getByRole("heading", { name: "Project Detail" })).toBeInTheDocument();
    });

    it("renders empty states safely", async () => {
        setStoredUser();
        vi.stubGlobal("fetch", dashboardFetchMock({
            upcomingTasks: [],
            recentTasks: [],
            recentProjects: []
        }));

        renderWithRouter(<Dashboard />);

        expect(await screen.findByText("Yaklaşan göreviniz bulunmuyor.")).toBeInTheDocument();
        expect(screen.getByText("Henüz yeni bir proje bulunmuyor")).toBeInTheDocument();
    });

    it("shows safe inline feedback for upcoming task API errors", async () => {
        setStoredUser();
        vi.stubGlobal("fetch", dashboardFetchMock({ upcomingError: true }));

        renderWithRouter(<Dashboard />);

        expect(await screen.findByText("Yaklaşan görevler yüklenemedi.")).toBeInTheDocument();
        expect(screen.queryByText("Yaklaşan göreviniz bulunmuyor.")).not.toBeInTheDocument();
    });

    it("handles non-array response from upcoming tasks gracefully", async () => {
        setStoredUser();
        vi.stubGlobal("fetch", dashboardFetchMock({ upcomingInvalid: true }));

        renderWithRouter(<Dashboard />);

        expect(await screen.findByText("Yaklaşan göreviniz bulunmuyor.")).toBeInTheDocument();
    });

    it("calculates completion rate correctly", async () => {
        setStoredUser();
        vi.stubGlobal("fetch", dashboardFetchMock());

        renderWithRouter(<Dashboard />);

        // 4 completed out of 10 total = 40%
        expect(await screen.findByText("40%")).toBeInTheDocument();
    });
});

function setStoredUser() {
    localStorage.setItem("user", JSON.stringify({
        id: 1,
        name: "Test",
        surname: "User",
        email: "test@example.com",
        token: "fake-token"
    }));
}

function dashboardFetchMock(overrides?: {
    upcomingTasks?: any[],
    recentTasks?: any[],
    recentProjects?: any[],
    upcomingError?: boolean,
    upcomingInvalid?: boolean
}) {
    return vi.fn().mockImplementation((url: string) => {
        if (url.includes("/tasks/upcoming")) {
            if (overrides?.upcomingError) {
                return Promise.resolve(mockJsonResponse(
                    { message: "Veritabanı hatası" },
                    { status: 500 }
                ));
            }

            if (overrides?.upcomingInvalid) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ data: "invalid array structure" })
                });
            }

            return mockJsonResponse(overrides?.upcomingTasks || [
                {
                    id: 1,
                    title: "Upcoming one",
                    status: "BEKLIYOR",
                    priority: "MEDIUM",
                    dueDate: "2026-08-15",
                    projectId: 1,
                    projectName: "TeamTime"
                },
                {
                    id: 2,
                    title: "Upcoming two",
                    status: "BEKLIYOR",
                    priority: "LOW",
                    dueDate: "2026-08-16",
                    projectId: 2,
                    projectName: "Other Project"
                }
            ]);
        }

        if (url.includes("/dashboard")) {
            return mockJsonResponse({
                projectCount: 12,
                taskCount: 10,
                completedTaskCount: 4,
                inProgressTaskCount: 2,
                teamCount: 3,
                overdueTaskCount: 3,
                dueTodayTaskCount: 4,
                upcomingTaskCount: 5
            });
        }

        if (url.includes("/projects/recent")) {
            return mockJsonResponse(overrides?.recentProjects || [
                {
                    id: 1,
                    projectName: "TeamTime",
                    description: "Proje yönetimi aracı",
                    startDate: "2026-08-01",
                    endDate: null,
                    teamId: 1,
                    teamName: "Team",
                    teamProject: true
                }
            ]);
        }

        return mockJsonResponse({});
    });
}
