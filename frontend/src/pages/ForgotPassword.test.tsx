import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockJsonResponse, mockTextResponse, renderWithProviders } from "../test/testUtils";
import ForgotPassword from "./ForgotPassword";

describe("ForgotPassword page", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("submits the email step and shows the code step", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(mockTextResponse("ok"));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<ForgotPassword />);

        await user.type(screen.getByLabelText("E-mail adresi"), "ayse@example.com");
        await user.click(screen.getByRole("button", { name: "Sıfırlama Kodu Gönder" }));

        expect(await screen.findByLabelText("Doğrulama kodu")).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/auth/password/request-code"),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ email: "ayse@example.com" })
            })
        );
    });

    it("validates that the code has six digits", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockTextResponse("ok")));

        renderWithProviders(<ForgotPassword />);

        await user.type(screen.getByLabelText("E-mail adresi"), "ayse@example.com");
        await user.click(screen.getByRole("button", { name: "Sıfırlama Kodu Gönder" }));
        await user.type(await screen.findByLabelText("Doğrulama kodu"), "123");
        await user.click(screen.getByRole("button", { name: "Kodu Doğrula" }));

        expect((await screen.findAllByText("Lütfen 6 haneli doğrulama kodunu girin.")).length).toBeGreaterThan(0);
    });

    it("sanitizes pasted code digits without storing formatting characters", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockTextResponse("ok")));

        renderWithProviders(<ForgotPassword />);

        await user.type(screen.getByLabelText("E-mail adresi"), "ayse@example.com");
        await user.click(screen.getByRole("button", { name: "Sıfırlama Kodu Gönder" }));
        const codeInput = await screen.findByLabelText("Doğrulama kodu");

        await user.type(codeInput, "59 13 56");

        expect(screen.getByDisplayValue("591356")).toBeInTheDocument();
    });

    it("shows resend countdown after requesting a code", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockTextResponse("ok")));

        renderWithProviders(<ForgotPassword />);

        await user.type(screen.getByLabelText("E-mail adresi"), "ayse@example.com");
        await user.click(screen.getByRole("button", { name: "Sıfırlama Kodu Gönder" }));

        expect(await screen.findByRole("button", { name: "Yeni kod gönder: 00:60" })).toBeDisabled();
    });

    it("validates matching passwords before reset", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(mockTextResponse("ok")));

        renderWithProviders(<ForgotPassword />);

        await user.type(screen.getByLabelText("E-mail adresi"), "ayse@example.com");
        await user.click(screen.getByRole("button", { name: "Sıfırlama Kodu Gönder" }));
        await user.type(await screen.findByLabelText("Doğrulama kodu"), "123456");
        await user.click(screen.getByRole("button", { name: "Kodu Doğrula" }));
        await user.type(await screen.findByLabelText("Yeni şifre"), "newsecret");
        await user.type(screen.getByLabelText("Yeni şifre tekrar"), "different");
        await user.click(screen.getByRole("button", { name: "Şifreyi Güncelle" }));

        expect((await screen.findAllByText("Şifreler uyuşmuyor")).length).toBeGreaterThan(0);
    });

    it("redirects to login after successful reset and does not write password or code to storage", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockTextResponse("request ok"))
            .mockResolvedValueOnce(mockTextResponse("verify ok"))
            .mockResolvedValueOnce(mockTextResponse("reset ok")));

        renderWithProviders(
            <Routes>
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/login" element={<h1>Giriş Yap</h1>} />
            </Routes>,
            { routerProps: { initialEntries: ["/forgot-password"] } }
        );

        await user.type(screen.getByLabelText("E-mail adresi"), "ayse@example.com");
        await user.click(screen.getByRole("button", { name: "Sıfırlama Kodu Gönder" }));
        await user.type(await screen.findByLabelText("Doğrulama kodu"), "004271");
        await user.click(screen.getByRole("button", { name: "Kodu Doğrula" }));
        await user.type(await screen.findByLabelText("Yeni şifre"), "newsecret");
        await user.type(screen.getByLabelText("Yeni şifre tekrar"), "newsecret");
        await user.click(screen.getByRole("button", { name: "Şifreyi Güncelle" }));

        await waitFor(() => expect(screen.getByRole("heading", { name: "Giriş Yap" })).toBeInTheDocument(), { timeout: 2500 });
        expect(localStorage.getItem("token")).toBeNull();
        expect(localStorage.getItem("user")).toBeNull();
        expect(localStorage.length).toBe(0);
    });

    it("shows backend errors safely", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn<typeof fetch>()
            .mockResolvedValue(mockJsonResponse({ message: "Doğrulama kodu geçersiz" }, { status: 400 })));

        renderWithProviders(<ForgotPassword />);

        await user.type(screen.getByLabelText("E-mail adresi"), "ayse@example.com");
        await user.click(screen.getByRole("button", { name: "Sıfırlama Kodu Gönder" }));

        expect((await screen.findAllByText("Doğrulama kodu hatalı.")).length).toBeGreaterThan(0);
    });
});
