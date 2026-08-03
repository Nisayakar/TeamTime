import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import PublicOnlyRoute from "./PublicOnlyRoute";
import { renderWithRouter } from "../test/testUtils";

function LoginProbe() {
    const location = useLocation();
    const state = location.state as { from?: { pathname?: string; search?: string } } | null;

    return (
        <div>
            <h1>Login</h1>
            <span>{state?.from?.pathname}</span>
            <span>{state?.from?.search}</span>
        </div>
    );
}

describe("route guards", () => {
    it("redirects unauthenticated private routes to login and preserves requested location", () => {
        renderWithRouter(
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/project/:id" element={<h1>Private Project</h1>} />
                </Route>
                <Route path="/login" element={<LoginProbe />} />
            </Routes>,
            { routerProps: { initialEntries: ["/project/42?tab=tasks"] } }
        );

        expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
        expect(screen.getByText("/project/42")).toBeInTheDocument();
        expect(screen.getByText("?tab=tasks")).toBeInTheDocument();
    });

    it("renders private content when a token exists", () => {
        localStorage.setItem("token", "valid-token");

        renderWithRouter(
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<h1>Private Dashboard</h1>} />
                </Route>
                <Route path="/login" element={<h1>Login</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/dashboard"] } }
        );

        expect(screen.getByRole("heading", { name: "Private Dashboard" })).toBeInTheDocument();
    });

    it("redirects authenticated users away from public-only auth routes", () => {
        localStorage.setItem("token", "valid-token");

        renderWithRouter(
            <Routes>
                <Route element={<PublicOnlyRoute />}>
                    <Route path="/login" element={<h1>Login</h1>} />
                </Route>
                <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/login"] } }
        );

        expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    });

    it("renders public-only content when no token exists", () => {
        renderWithRouter(
            <Routes>
                <Route element={<PublicOnlyRoute />}>
                    <Route path="/register" element={<h1>Register</h1>} />
                </Route>
                <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/register"] } }
        );

        expect(screen.getByRole("heading", { name: "Register" })).toBeInTheDocument();
    });
});
