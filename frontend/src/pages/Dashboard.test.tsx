import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mockJsonResponse, renderWithRouter } from "../test/testUtils";
import Dashboard from "./Dashboard";

describe("Dashboard", () => {
    it("renders statistic cards and returned upcoming tasks", async () => {
        setStoredUser();
        vi.stubGlobal("fetch", dashboardFetchMock());

        renderWithRouter(<Dashboard />);

        expect(await screen.findByText("Toplam Proje")).toBeInTheDocument();
        expect(screen.getByText("12")).toBeInTheDocument();
        expect(screen.getByText("Gecikmiş Görevler")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("Bugün Bitenler")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(screen.getAllByText("Yaklaşan Görevler")).toHaveLength(2);
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("Upcoming one")).toBeInTheDocument();
        expect(screen.getByText("Upcoming two")).toBeInTheDocument();
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
        expect(screen.getByText("Henüz görev yok")).toBeInTheDocument();
        expect(screen.getByText("Henüz proje yok")).toBeInTheDocument();
    });

    it("shows safe inline feedback for upcoming task API errors", async () => {
        setStoredUser();
        vi.stubGlobal("fetch", dashboardFetchMock({ upcomingError: true }));

        renderWithRouter(<Dashboard />);

        expect(await screen.findByText("Yaklaşan görevler yüklenemedi.")).toBeInTheDocument();
        expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
    });
});

function dashboardFetchMock(options: {
    upcomingTasks?: unknown[];
    recentTasks?: unknown[];
    recentProjects?: unknown[];
    upcomingError?: boolean;
} = {}) {
    return vi.fn<typeof fetch>((input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/dashboard")) {
            return Promise.resolve(mockJsonResponse({
                projectCount: 12,
                taskCount: 20,
                completedTaskCount: 8,
                inProgressTaskCount: 6,
                teamCount: 2,
                overdueTaskCount: 3,
                dueTodayTaskCount: 4,
                upcomingTaskCount: 5
            }));
        }

        if (url.includes("/tasks/recent")) {
            return Promise.resolve(mockJsonResponse(options.recentTasks ?? [
                task(3, "Recent task", null)
            ]));
        }

        if (url.includes("/tasks/upcoming")) {
            if (options.upcomingError) {
                return Promise.reject(new Error("Yaklaşan görevler yüklenemedi."));
            }

            return Promise.resolve(mockJsonResponse(options.upcomingTasks ?? [
                task(1, "Upcoming one", 42),
                task(2, "Upcoming two", null)
            ]));
        }

        return Promise.resolve(mockJsonResponse(options.recentProjects ?? [
            { id: 1, projectName: "Recent Project", description: "Project description" }
        ]));
    });
}

function task(id: number, title: string, projectId: number | null) {
    return {
        id,
        title,
        description: "Description",
        status: "BEKLIYOR",
        priority: "MEDIUM",
        dueDate: "2026-08-04",
        createdAt: "2026-08-03T10:00:00",
        completedAt: null,
        overdue: false,
        projectId,
        projectName: projectId ? "Linked Project" : null
    };
}

function setStoredUser() {
    localStorage.setItem("token", "valid-token");
    localStorage.setItem("user", JSON.stringify({
        id: 1,
        name: "Ayşe",
        surname: "Demir",
        email: "ayse@example.com"
    }));
}
