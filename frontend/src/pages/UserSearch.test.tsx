import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Routes, Route } from "react-router-dom";
import Teams from "./Teams";
import TeamDetails from "./TeamDetails";
import ProjectDetails from "./ProjectDetails";
import { renderWithProviders, mockJsonResponse } from "../test/testUtils";

describe("User Search and Selection UI", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.setItem("user", JSON.stringify({ id: 1 }));
    });

    it("Create Team - user picker displays username and email and sends id", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>().mockImplementation((url, init) => {
            const urlStr = url.toString();
            console.log("CreateTeam fetch:", urlStr, init?.method);
            if (urlStr.includes("/profile")) {
                return Promise.resolve(mockJsonResponse({ id: 1, name: "Test User" }));
            }
            if (urlStr.includes("/teams")) {
                if (init?.method === "POST") {
                    return Promise.resolve(mockJsonResponse({ id: 10, name: "New Team", description: "Desc", createdDate: "2024-01-01" }));
                }
                return Promise.resolve(mockJsonResponse([]));
            }
            if (urlStr.includes("/users/search")) {
                return Promise.resolve(mockJsonResponse([
                    { id: 2, name: "Nisa", surname: "Yakar", username: "nisayakar", email: "nisa.yakar@gmail.com" }
                ]));
            }
            return Promise.resolve(mockJsonResponse({}));
        });
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Teams />);
        await screen.findByText("Henüz takım yok");

        const inputs = screen.getAllByRole("textbox");
        await userEvent.type(inputs[0], "My Team");
        await userEvent.type(inputs[1], "My Desc");
        await userEvent.type(screen.getByPlaceholderText("Kullanıcı adı veya e-posta ile ara..."), "nisa");

        // Autocomplete option should display name, @username, and email
        const option = await screen.findByRole("button", { name: /Nisa Yakar.*@nisayakar.*nisa\.yakar@gmail\.com/ });
        expect(option).toBeInTheDocument();
        
        await userEvent.click(option);

        // Selected chip should show username
        expect(screen.getByText(/Nisa Yakar.*@nisayakar/)).toBeInTheDocument();

        // Submit team
        await userEvent.click(screen.getByRole("button", { name: "Takımı Oluştur" }));

        await waitFor(() => {
            const postCall = fetchMock.mock.calls.find(call => call[0].toString().endsWith("/teams") && call[1]?.method === "POST");
            expect(postCall).toBeDefined();
            const body = JSON.parse(postCall![1]!.body as string);
            expect(body.memberIds).toContain(2);
            expect(body.memberIds).not.toContain("nisayakar");
        });
    });

    it("TeamDetails - user picker displays username and email and sends id", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>().mockImplementation((url, init) => {
            const urlStr = url.toString();
            console.log("TeamDetails fetch:", urlStr);
            if (urlStr.includes("/profile")) {
                return Promise.resolve(mockJsonResponse({ id: 1, name: "Test User" }));
            }
            if (urlStr.includes("/teams/1/members")) {
                return Promise.resolve(mockJsonResponse([
                    { id: 1, userId: 1, userName: "Test User", role: "OWNER" }
                ]));
            }
            if (urlStr.includes("/teams/1/invitations")) {
                return Promise.resolve(mockJsonResponse([]));
            }
            if (urlStr.endsWith("/teams")) {
                return Promise.resolve(mockJsonResponse([{ id: 1, name: "Team 1" }]));
            }
            if (urlStr.includes("/users/search")) {
                return Promise.resolve(mockJsonResponse([
                    { id: 2, name: "Ahmet", surname: "Yilmaz", username: "ahmet", email: "ahmet@gmail.com" }
                ]));
            }
            if (urlStr.includes("/team-invitations/team/1") && init?.method === "POST") {
                return Promise.resolve(mockJsonResponse({}));
            }
            return Promise.resolve(mockJsonResponse([]));
        });
        vi.stubGlobal("fetch", fetchMock);

        // We need to render TeamDetails within a route that provides id=1
        renderWithProviders(
            <Routes>
                <Route path="/teams/:id" element={<TeamDetails />} />
            </Routes>, 
            { routerProps: { initialEntries: ["/teams/1"] } }
        );

        await screen.findByText("Takım Üyeleri");

        // Type in search
        await userEvent.type(screen.getByPlaceholderText("Kullanıcı adı veya e-posta ile ara..."), "ahmet");

        // Option
        const option = await screen.findByRole("button", { name: /Ahmet Yilmaz.*@ahmet.*ahmet@gmail\.com/ });
        expect(option).toBeInTheDocument();
        
        await userEvent.click(option);

        // Selected display
        expect(screen.getByText("Ahmet Yilmaz (@ahmet)")).toBeInTheDocument();
        expect(screen.getByText(/ahmet@gmail\.com/)).toBeInTheDocument();

        // Send invitation
        await userEvent.click(screen.getByRole("button", { name: "Davet Gönder" }));

        await waitFor(() => {
            const postCall = fetchMock.mock.calls.find(call => call[0].toString().endsWith("/team-invitations/team/1") && call[1]?.method === "POST");
            expect(postCall).toBeDefined();
            const body = JSON.parse(postCall![1]!.body as string);
            expect(body.invitedUserId).toBe(2);
        });
    });

    it("ProjectDetails - assignee picker shows username and email", async () => {
        const fetchMock = vi.fn<typeof fetch>().mockImplementation((url) => {
            const urlStr = url.toString();
            if (urlStr.includes("/profile")) {
                return Promise.resolve(mockJsonResponse({ id: 1, name: "Test User" }));
            }
            if (urlStr.includes("/projects/1")) {
                return Promise.resolve(mockJsonResponse({ id: 1, teamProject: true, teamId: 10 }));
            }
            if (urlStr.includes("/tasks/project/1")) {
                return Promise.resolve(mockJsonResponse([]));
            }
            if (urlStr.includes("/teams/10/members")) {
                return Promise.resolve(mockJsonResponse([
                    { id: 1, userId: 1, userName: "Test User", role: "OWNER" },
                    { id: 2, userId: 2, userName: "Ali Veli", username: "aliveli", userEmail: "ali@veli.com", role: "MEMBER" }
                ]));
            }
            return Promise.resolve(mockJsonResponse({}));
        });
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(
            <Routes>
                <Route path="/projects/:id" element={<ProjectDetails />} />
            </Routes>, 
            { routerProps: { initialEntries: ["/projects/1"] } }
        );

        await screen.findByText("Proje Detayları");

        // Input should be present
        const input = await screen.findByLabelText("Atanan Kişi");
        expect(input).toBeInTheDocument();

        // Search for Ali Veli
        await userEvent.type(input, "ali");
        
        // Autocomplete option should show username and email
        const aliOption = await screen.findByRole("button", { name: /Ali Veli.*@aliveli.*ali@veli\.com/ });
        expect(aliOption).toBeInTheDocument();
        
        // Select it
        await userEvent.click(aliOption);
        expect(input).toHaveValue("Ali Veli (@aliveli)");
    });
});
