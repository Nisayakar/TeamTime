import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockJsonResponse, renderWithProviders } from "../test/testUtils";
import ProjectDetails from "./ProjectDetails";

describe("ProjectDetails task filters", () => {
    beforeEach(() => {
        vi.setSystemTime(new Date("2026-08-03T12:00:00"));
    });

    it("filters tasks by title, description, status, priority, overdue, today, and reset", async () => {
        const user = userEvent.setup();
        mockProjectDetailsFetch();

        renderProjectDetails();
        await screen.findByText("Alpha deploy");

        await user.type(screen.getByLabelText("Görev ara"), "design");
        expect(screen.getByText("Beta review")).toBeInTheDocument();
        expect(screen.queryByText("Alpha deploy")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Filtreleri Temizle" }));
        await user.selectOptions(screen.getByLabelText("Durum"), "TAMAMLANDI");
        expect(screen.getByText("Done task")).toBeInTheDocument();
        expect(screen.queryByText("Beta review")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Filtreleri Temizle" }));
        await user.selectOptions(screen.getByLabelText("Öncelik"), "URGENT");
        expect(screen.getByText("Alpha deploy")).toBeInTheDocument();
        expect(screen.queryByText("Beta review")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Filtreleri Temizle" }));
        await user.selectOptions(screen.getByLabelText("Son tarih"), "OVERDUE");
        expect(screen.getByText("Alpha deploy")).toBeInTheDocument();
        expect(screen.queryByText("Today task")).not.toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText("Son tarih"), "TODAY");
        expect(screen.getByText("Today task")).toBeInTheDocument();
        expect(screen.queryByText("Alpha deploy")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Filtreleri Temizle" }));
        expect(screen.getByText("Alpha deploy")).toBeInTheDocument();
        expect(screen.getByText("Beta review")).toBeInTheDocument();
    });

    it("filters due-date categories without overlapping upcoming with today or far future", async () => {
        const user = userEvent.setup();
        mockProjectDetailsFetch();

        renderProjectDetails();
        await screen.findByText("Alpha deploy");

        await user.selectOptions(screen.getByLabelText("Son tarih"), "UPCOMING");
        expect(screen.getByText("Tomorrow task")).toBeInTheDocument();
        expect(screen.getByText("Boundary task")).toBeInTheDocument();
        expect(screen.queryByText("Far future task")).not.toBeInTheDocument();
        expect(screen.queryByText("Today task")).not.toBeInTheDocument();
        expect(screen.queryByText("Completed upcoming")).not.toBeInTheDocument();
        expect(screen.queryByText("No date task")).not.toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText("Son tarih"), "TODAY");
        expect(screen.getByText("Today task")).toBeInTheDocument();
        expect(screen.queryByText("Tomorrow task")).not.toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText("Son tarih"), "OVERDUE");
        expect(screen.getByText("Alpha deploy")).toBeInTheDocument();
        expect(screen.queryByText("Today task")).not.toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText("Son tarih"), "NO_DATE");
        expect(screen.getByText("Done task")).toBeInTheDocument();
        expect(screen.getByText("No date task")).toBeInTheDocument();
        expect(screen.queryByText("Tomorrow task")).not.toBeInTheDocument();
    });

    it("sorts by due date and priority", async () => {
        const user = userEvent.setup();
        mockProjectDetailsFetch();

        renderProjectDetails();
        await screen.findByText("Alpha deploy");

        await user.selectOptions(screen.getByLabelText("Sıralama"), "DUE_DATE_ASC");
        expectBefore("Alpha deploy", "Today task");
        expectBefore("Today task", "Beta review");

        await user.selectOptions(screen.getByLabelText("Sıralama"), "PRIORITY_DESC");
        expectBefore("Alpha deploy", "Beta review");
        expectBefore("Beta review", "Done task");
    });

    it("shows filtered empty state", async () => {
        const user = userEvent.setup();
        mockProjectDetailsFetch();

        renderProjectDetails();
        await screen.findByText("Alpha deploy");

        await user.type(screen.getByLabelText("Görev ara"), "missing task");

        expect(screen.getByText("Seçilen kriterlere uygun görev bulunamadı.")).toBeInTheDocument();
    });
});

function renderProjectDetails() {
    renderWithProviders(
        <Routes>
            <Route path="/project/:id" element={<ProjectDetails />} />
        </Routes>,
        { routerProps: { initialEntries: ["/project/1"] } }
    );
}

function mockProjectDetailsFetch() {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>((input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/projects/1")) {
            return Promise.resolve(mockJsonResponse({
                id: 1,
                projectName: "Web Project",
                description: null,
                startDate: null,
                endDate: null,
                teamId: null,
                teamName: null,
                teamProject: false
            }));
        }

        return Promise.resolve(mockJsonResponse(tasks()));
    }));
}

function tasks() {
    return [
        task(1, "Alpha deploy", "Release notes", "BEKLIYOR", "URGENT", "2026-08-01", true, "2026-08-03T10:00:00"),
        task(2, "Beta review", "Design QA", "DEVAM_EDIYOR", "HIGH", "2026-08-05", false, "2026-08-03T09:00:00"),
        task(3, "Today task", "Due now", "BEKLIYOR", "LOW", "2026-08-03", false, "2026-08-03T08:00:00"),
        task(4, "Done task", "Completed", "TAMAMLANDI", "MEDIUM", null, false, "2026-08-03T07:00:00"),
        task(5, "Tomorrow task", "Soon", "BEKLIYOR", "MEDIUM", "2026-08-04", false, "2026-08-03T06:00:00"),
        task(6, "Boundary task", "Seven days", "DEVAM_EDIYOR", "LOW", "2026-08-10", false, "2026-08-03T05:00:00"),
        task(7, "Far future task", "Eight days", "BEKLIYOR", "LOW", "2026-08-11", false, "2026-08-03T04:00:00"),
        task(8, "Completed upcoming", "Done soon", "TAMAMLANDI", "URGENT", "2026-08-04", false, "2026-08-03T03:00:00"),
        task(9, "No date task", "No deadline", "BEKLIYOR", "LOW", null, false, "2026-08-03T02:00:00")
    ];
}

function task(
    id: number,
    title: string,
    description: string,
    status: string,
    priority: string,
    dueDate: string | null,
    overdue: boolean,
    createdAt: string
) {
    return {
        id,
        title,
        description,
        status,
        priority,
        dueDate,
        createdAt,
        completedAt: null,
        overdue,
        projectId: 1,
        projectName: "Web Project"
    };
}

function expectBefore(firstText: string, secondText: string) {
    const first = screen.getByText(firstText);
    const second = screen.getByText(secondText);

    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}
