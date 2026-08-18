import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "../components/ToastProvider";
import TeamDetails from "./TeamDetails";
import { apiFetch, getStoredUser } from "../api";

vi.mock("../api");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...(actual as any), useParams: () => ({ id: "1" }) };
});
const mockApiFetch = apiFetch as Mock;
const mockGetStoredUser = getStoredUser as Mock;

describe("TeamDetails Invitation Revoke", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetStoredUser.mockReturnValue({ id: 1 });
        
        mockApiFetch.mockImplementation(async (url) => {
            if (url === "/teams") {
                return { ok: true, json: async () => [{ id: 1, name: "Test Team", description: "Desc" }] };
            }
            if (url === "/teams/1/members") {
                return { ok: true, json: async () => [{ id: 10, userId: 1, userName: "Admin User", role: "ADMIN" }] };
            }
            if (url === "/team-invitations/team/1") {
                return { ok: true, json: async () => [{
                    invitationId: 99, teamId: 1, teamName: "Test Team", invitedByFullName: "Admin User",
                    invitedUserFullName: "Pending User", status: "PENDING", createdAt: "2026-01-01"
                }] };
            }
            return { ok: true, json: async () => ({}) };
        });
    });

    it("renders pending invitations and shows revoke button for ADMIN", async () => {
        render(<BrowserRouter><ToastProvider><TeamDetails /></ToastProvider></BrowserRouter>);
        
        expect(await screen.findByText("Bekleyen Davetler")).toBeInTheDocument();
        expect(await screen.findByText("Pending User")).toBeInTheDocument();
        
        const revokeBtns = screen.getAllByRole("button", { name: "Geri Çek" });
        expect(revokeBtns.length).toBeGreaterThan(0);
    });

    it("opens confirm modal, cancels without api call", async () => {
        render(<BrowserRouter><ToastProvider><TeamDetails /></ToastProvider></BrowserRouter>);
        const revokeBtns = await screen.findAllByRole("button", { name: "Geri Çek" });
        await userEvent.click(revokeBtns[0]);
        
        expect(screen.getByText(/gönderilen takım davetini geri çekmek/i)).toBeInTheDocument();
        
        const cancelBtn = screen.getByRole("button", { name: "İptal" });
        await userEvent.click(cancelBtn);
        
        expect(mockApiFetch).not.toHaveBeenCalledWith(expect.stringContaining("/team-invitations/99"), expect.anything());
    });

    it("calls delete api and removes row on success", async () => {
        mockApiFetch.mockImplementation(async (url, options) => {
            if (url === "/team-invitations/99" && options?.method === "DELETE") {
                return { ok: true };
            }
            if (url === "/teams") return { ok: true, json: async () => [{ id: 1, name: "Test Team", description: "Desc" }] };
            if (url === "/teams/1/members") return { ok: true, json: async () => [{ id: 10, userId: 1, userName: "Admin User", role: "ADMIN" }] };
            if (url === "/team-invitations/team/1") return { ok: true, json: async () => [{
                    invitationId: 99, teamId: 1, teamName: "Test Team", invitedByFullName: "Admin User",
                    invitedUserFullName: "Pending User", status: "PENDING", createdAt: "2026-01-01"
                }] };
            return { ok: true, json: async () => ({}) };
        });

        render(<BrowserRouter><ToastProvider><TeamDetails /></ToastProvider></BrowserRouter>);
        const revokeBtns = await screen.findAllByRole("button", { name: "Geri Çek" });
        await userEvent.click(revokeBtns[0]);
        
        const confirmBtn = screen.getByRole("button", { name: "Daveti Geri Çek" });
        await userEvent.click(confirmBtn);
        
        await waitFor(() => {
            expect(mockApiFetch).toHaveBeenCalledWith("/team-invitations/99", { method: "DELETE" });
        });
        
        await waitFor(() => {
            expect(screen.queryByText("Pending User")).not.toBeInTheDocument();
        });
    });
});

