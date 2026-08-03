import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "../components/ProtectedRoute";
import { mockJsonResponse, renderWithProviders, renderWithRouter } from "../test/testUtils";
import Forbidden from "./Forbidden";
import NotFound from "./NotFound";
import ProjectDetails from "./ProjectDetails";

describe("status pages", () => {
    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders NotFound for unknown routes", () => {
        renderWithRouter(
            <Routes>
                <Route path="*" element={<NotFound />} />
            </Routes>,
            { routerProps: { initialEntries: ["/does-not-exist"] } }
        );

        expect(screen.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeInTheDocument();
    });

    it("sends authenticated NotFound users to dashboard", async () => {
        localStorage.setItem("token", "valid-token");

        renderWithRouter(
            <Routes>
                <Route path="/not-found" element={<NotFound />} />
                <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/not-found"] } }
        );

        await userEvent.click(screen.getByRole("link", { name: "Dashboard'a Dön" }));

        expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    });

    it("sends unauthenticated NotFound users to home", async () => {
        renderWithRouter(
            <Routes>
                <Route path="/not-found" element={<NotFound />} />
                <Route path="/" element={<h1>Ana Sayfa</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/not-found"] } }
        );

        await userEvent.click(screen.getByRole("link", { name: "Ana Sayfaya Dön" }));

        expect(screen.getByRole("heading", { name: "Ana Sayfa" })).toBeInTheDocument();
    });

    it("renders Forbidden for authenticated users", () => {
        localStorage.setItem("token", "valid-token");

        renderWithRouter(
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/forbidden" element={<Forbidden />} />
                </Route>
                <Route path="/login" element={<h1>Giriş</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/forbidden"] } }
        );

        expect(screen.getByRole("heading", { name: "Bu alana erişim yetkiniz yok" })).toBeInTheDocument();
    });

    it("navigates ProjectDetails initial-load 403 to Forbidden", async () => {
        localStorage.setItem("token", "valid-token");
        vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.includes("/projects/42")) {
                return Promise.resolve(mockJsonResponse({ message: "Forbidden" }, { status: 403 }));
            }

            return Promise.resolve(mockJsonResponse([]));
        }));

        renderWithProviders(
            <Routes>
                <Route path="/project/:id" element={<ProjectDetails />} />
                <Route path="/forbidden" element={<Forbidden />} />
            </Routes>,
            { routerProps: { initialEntries: ["/project/42"] } }
        );

        expect(await screen.findByRole("heading", { name: "Bu alana erişim yetkiniz yok" })).toBeInTheDocument();
    });

    it("navigates ProjectDetails initial-load 404 to NotFound", async () => {
        localStorage.setItem("token", "valid-token");
        vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
            const url = String(input);

            if (url.includes("/projects/42")) {
                return Promise.resolve(mockJsonResponse({ message: "Not found" }, { status: 404 }));
            }

            return Promise.resolve(mockJsonResponse([]));
        }));

        renderWithProviders(
            <Routes>
                <Route path="/project/:id" element={<ProjectDetails />} />
                <Route path="/not-found" element={<NotFound />} />
            </Routes>,
            { routerProps: { initialEntries: ["/project/42"] } }
        );

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeInTheDocument();
        });
    });
});
