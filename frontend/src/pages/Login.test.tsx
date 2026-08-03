import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Login from "./Login";
import { mockJsonResponse, renderWithProviders } from "../test/testUtils";

describe("Login page", () => {
    it("accepts email and password input", async () => {
        const user = userEvent.setup();
        renderWithProviders(<Login />);

        await user.type(screen.getByPlaceholderText("E-posta Adresi"), "ayse@example.com");
        await user.type(screen.getByPlaceholderText("Şifre"), "secret123");

        expect(screen.getByDisplayValue("ayse@example.com")).toBeInTheDocument();
        expect(screen.getByDisplayValue("secret123")).toBeInTheDocument();
    });

    it("submits login, stores auth, and redirects to dashboard by default", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValue(mockJsonResponse({
                id: 7,
                name: "Ayşe",
                surname: "Demir",
                email: "ayse@example.com",
                token: "jwt-token"
            }));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<h1>Dashboard</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/login"] } }
        );

        await user.type(screen.getByPlaceholderText("E-posta Adresi"), "ayse@example.com");
        await user.type(screen.getByPlaceholderText("Şifre"), "secret123");
        await user.click(screen.getByRole("button", { name: "Giriş Yap" }));

        await waitFor(() => expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument());
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem("token")).toBe("jwt-token");
        expect(localStorage.getItem("user")).toContain("ayse@example.com");
    });

    it("redirects to the originally requested route after successful login", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>()
            .mockResolvedValue(mockJsonResponse({
                id: 7,
                name: "Ayşe",
                surname: "Demir",
                email: "ayse@example.com",
                token: "jwt-token"
            })));

        renderWithProviders(
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/project/42" element={<h1>Project 42</h1>} />
            </Routes>,
            {
                routerProps: {
                    initialEntries: [{
                        pathname: "/login",
                        state: { from: { pathname: "/project/42", search: "" } }
                    }]
                }
            }
        );

        await user.type(screen.getByPlaceholderText("E-posta Adresi"), "ayse@example.com");
        await user.type(screen.getByPlaceholderText("Şifre"), "secret123");
        await user.click(screen.getByRole("button", { name: "Giriş Yap" }));

        await waitFor(() => expect(screen.getByRole("heading", { name: "Project 42" })).toBeInTheDocument());
    });

    it("shows a safe error message for failed login", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>()
            .mockResolvedValue(mockJsonResponse({ message: "E-posta veya şifre hatalı" }, { status: 401 })));

        renderWithProviders(<Login />);

        await user.type(screen.getByPlaceholderText("E-posta Adresi"), "ayse@example.com");
        await user.type(screen.getByPlaceholderText("Şifre"), "wrong-password");
        await user.click(screen.getByRole("button", { name: "Giriş Yap" }));

        expect(await screen.findAllByText("E-posta veya şifre hatalı")).toHaveLength(2);
    });
});
