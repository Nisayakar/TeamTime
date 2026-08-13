import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { mockJsonResponse, renderWithProviders } from "../test/testUtils";
import ProjectDetails from "./ProjectDetails";

describe("ProjectDetails task assignment", () => {
    it("does not show assignee select for personal projects", async () => {
        setStoredUser(1);
        vi.stubGlobal("fetch", projectDetailsFetchMock({ teamProject: false, role: "OWNER" }));

        renderProjectDetails();

        expect(await screen.findByText("Assignment task")).toBeInTheDocument();
        expect(screen.queryByLabelText("Atanan Kişi")).not.toBeInTheDocument();
    });

    it("shows team member names without ids in OWNER assignment select", async () => {
        setStoredUser(1);
        vi.stubGlobal("fetch", projectDetailsFetchMock({ teamProject: true, role: "OWNER" }));

        renderProjectDetails();

        const assigneeSelect = await screen.findByLabelText("Atanan Kişi");
        expect(within(assigneeSelect).getByRole("option", { name: "Nisa Yakar" })).toBeInTheDocument();
        expect(within(assigneeSelect).getByRole("option", { name: "Ahmet Kaya" })).toBeInTheDocument();
        expect(screen.queryByText("userId")).not.toBeInTheDocument();
    });

    it("hides assignment control for MEMBER users", async () => {
        setStoredUser(3);
        vi.stubGlobal("fetch", projectDetailsFetchMock({ teamProject: true, role: "MEMBER" }));

        renderProjectDetails();

        expect(await screen.findByText("Assignment task")).toBeInTheDocument();
        expect(screen.queryByLabelText("Atanan Kişi")).not.toBeInTheDocument();
    });

    it("sends assignment endpoint after task update", async () => {
        const user = userEvent.setup();
        setStoredUser(1);
        const fetchMock = projectDetailsFetchMock({ teamProject: true, role: "OWNER" });
        vi.stubGlobal("fetch", fetchMock);

        renderProjectDetails();

        await user.click(await screen.findByRole("button", { name: "Düzenle" }));
        await user.selectOptions(screen.getByLabelText("Atanan Kişi"), "2");
        await user.click(screen.getByRole("button", { name: "Güncelle" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/tasks/10/assignee"),
            expect.objectContaining({
                method: "PUT",
                body: JSON.stringify({ userId: 2 })
            })
        ));
    });

    it("shows pending assignment actions only to the assigned member and accepts assignment", async () => {
        const user = userEvent.setup();
        setStoredUser(2);
        const fetchMock = projectDetailsFetchMock({
            teamProject: true,
            role: "MEMBER",
            tasks: [task({ assignedUserId: 2, assignedUserName: "Nisa Yakar", assignmentStatus: "PENDING" })]
        });
        vi.stubGlobal("fetch", fetchMock);

        renderProjectDetails();

        expect(await screen.findByText("Atama Bekliyor")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Kabul Et" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/tasks/10/assignment/accept"),
            expect.objectContaining({ method: "POST" })
        ));
    });

    it("does not show accept or reject actions to another member", async () => {
        setStoredUser(3);
        vi.stubGlobal("fetch", projectDetailsFetchMock({
            teamProject: true,
            role: "MEMBER",
            tasks: [task({ assignedUserId: 2, assignedUserName: "Nisa Yakar", assignmentStatus: "PENDING" })]
        }));

        renderProjectDetails();

        expect(await screen.findByText("Atama Bekliyor")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Kabul Et" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Reddet" })).not.toBeInTheDocument();
    });

    it("requires reject reason and sends reject request", async () => {
        const user = userEvent.setup();
        setStoredUser(2);
        const fetchMock = projectDetailsFetchMock({
            teamProject: true,
            role: "MEMBER",
            tasks: [task({ assignedUserId: 2, assignedUserName: "Nisa Yakar", assignmentStatus: "PENDING" })]
        });
        vi.stubGlobal("fetch", fetchMock);

        renderProjectDetails();

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
    });

    it("shows accepted state without response controls", async () => {
        setStoredUser(2);
        vi.stubGlobal("fetch", projectDetailsFetchMock({
            teamProject: true,
            role: "MEMBER",
            tasks: [task({ assignedUserId: 2, assignedUserName: "Nisa Yakar", assignmentStatus: "ACCEPTED" })]
        }));

        renderProjectDetails();

        expect(await screen.findByText("Kabul Edildi")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Kabul Et" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Reddet" })).not.toBeInTheDocument();
    });

    it("shows rejected reason to OWNER", async () => {
        setStoredUser(1);
        vi.stubGlobal("fetch", projectDetailsFetchMock({
            teamProject: true,
            role: "OWNER",
            tasks: [task({
                assignedUserId: 2,
                assignedUserName: "Nisa Yakar",
                assignmentStatus: "REJECTED",
                rejectionReason: "Takvimim dolu."
            })]
        }));

        renderProjectDetails();

        expect(await screen.findByText("Reddedildi")).toBeInTheDocument();
        expect(screen.getByText("Mazeret: Takvimim dolu.")).toBeInTheDocument();
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

function projectDetailsFetchMock(options: {
    teamProject: boolean;
    role: "OWNER" | "ADMIN" | "MEMBER";
    tasks?: ReturnType<typeof task>[];
}) {
    return vi.fn<typeof fetch>((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.includes("/projects/1")) {
            return Promise.resolve(mockJsonResponse({
                id: 1,
                projectName: "Team Project",
                description: null,
                startDate: null,
                endDate: null,
                teamId: options.teamProject ? 7 : null,
                teamName: options.teamProject ? "Ürün Takımı" : null,
                teamProject: options.teamProject
            }));
        }

        if (url.includes("/teams/7/members")) {
            return Promise.resolve(mockJsonResponse([
                member(1, "Owner User", options.role === "OWNER" ? "OWNER" : "ADMIN"),
                member(2, "Nisa Yakar", options.role === "MEMBER" ? "OWNER" : "MEMBER"),
                member(3, "Ahmet Kaya", options.role)
            ]));
        }

        if (url.includes("/tasks/10/assignee") && init?.method === "PUT") {
            return Promise.resolve(mockJsonResponse(task({
                assignedUserId: 2,
                assignedUserName: "Nisa Yakar",
                assignmentStatus: "PENDING"
            })));
        }

        if (url.includes("/tasks/10/assignment/accept") && init?.method === "POST") {
            return Promise.resolve(mockJsonResponse(task({
                assignedUserId: 2,
                assignedUserName: "Nisa Yakar",
                assignmentStatus: "ACCEPTED"
            })));
        }

        if (url.includes("/tasks/10/assignment/reject") && init?.method === "POST") {
            return Promise.resolve(mockJsonResponse(task({
                assignedUserId: 2,
                assignedUserName: "Nisa Yakar",
                assignmentStatus: "REJECTED",
                rejectionReason: "Bu tarihte başka görevim var."
            })));
        }

        if (url.includes("/tasks/10") && init?.method === "PUT") {
            return Promise.resolve(mockJsonResponse(task({})));
        }

        return Promise.resolve(mockJsonResponse(options.tasks ?? [task({})]));
    });
}

function member(userId: number, userName: string, role: "OWNER" | "ADMIN" | "MEMBER") {
    return {
        id: userId,
        userId,
        userName,
        teamId: 7,
        teamName: "Ürün Takımı",
        role,
        joinedDate: "2026-08-13T10:00:00"
    };
}

function task(overrides: Partial<{
    assignedUserId: number | null;
    assignedUserName: string | null;
    assignmentStatus: "UNASSIGNED" | "PENDING" | "ACCEPTED" | "REJECTED";
    rejectionReason: string | null;
}> = {}) {
    return {
        id: 10,
        title: "Assignment task",
        description: "Task details",
        status: "BEKLIYOR",
        priority: "MEDIUM",
        dueDate: null,
        createdAt: "2026-08-13T10:00:00",
        completedAt: null,
        overdue: false,
        projectId: 1,
        projectName: "Team Project",
        assignedUserId: null,
        assignedUserName: null,
        assignmentStatus: "UNASSIGNED",
        rejectionReason: null,
        assignedAt: null,
        respondedAt: null,
        ...overrides
    };
}

function setStoredUser(id: number) {
    localStorage.setItem("token", "valid-token");
    localStorage.setItem("user", JSON.stringify({
        id,
        name: "Test",
        surname: "User",
        email: "test@example.com"
    }));
}
