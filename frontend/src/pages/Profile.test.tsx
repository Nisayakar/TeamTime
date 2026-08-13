import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { mockJsonResponse, mockTextResponse, renderWithProviders } from "../test/testUtils";
import Profile from "./Profile";

describe("Profile", () => {
    it("loads profile data and updates localStorage after a successful profile update", async () => {
        const user = userEvent.setup();
        localStorage.setItem("token", "token");
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile("Ayşe", "Demir", "ayse@example.com")))
            .mockResolvedValueOnce(mockJsonResponse(profile("Ayşe Nur", "Demir", "ayse@example.com")));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        expect(await screen.findByDisplayValue("Ayşe")).toBeInTheDocument();
        expect(screen.getByLabelText("E-mail")).toHaveValue("ayse@example.com");
        expect(screen.getByLabelText("E-mail")).toHaveAttribute("readonly");
        await user.clear(screen.getByLabelText("Ad"));
        await user.type(screen.getByLabelText("Ad"), "Ayşe Nur");
        await user.click(screen.getByRole("button", { name: "Profil Bilgilerini Güncelle" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const [, requestInit] = fetchMock.mock.calls[1];
        expect(JSON.parse(String(requestInit?.body))).toEqual({
            name: "Ayşe Nur",
            surname: "Demir"
        });
        expect(localStorage.getItem("user")).toBe(JSON.stringify(profile("Ayşe Nur", "Demir", "ayse@example.com")));
        expect(await screen.findByText("Profil bilgileriniz güncellendi.")).toBeInTheDocument();
        expect(document.querySelector(".toast-container")).toBeEmptyDOMElement();
    });

    it("shows profile update errors safely", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockJsonResponse({ message: "Profil güncellenemedi" }, { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "Profil Bilgilerini Güncelle" }));

        expect(await screen.findByText("Profil güncellenemedi")).toBeInTheDocument();
        expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
    });

    it("opens the email change flow and requests a verification code", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockTextResponse("Doğrulama kodu yeni e-posta adresinize gönderildi"));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "E-posta Adresini Değiştir" }));
        expect(screen.getByLabelText("Yeni E-posta Adresi")).toBeInTheDocument();

        await user.type(screen.getByLabelText("Yeni E-posta Adresi"), "new@example.com");
        await user.click(screen.getByRole("button", { name: "Doğrulama Kodu Gönder" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(fetchMock.mock.calls[1][0]).toContain("/profile/email/request-code");
        expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ email: "new@example.com" });
        expect(await screen.findByText("new@example.com adresine gönderilen 6 haneli kodu girin.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Yeni kod gönder: 00:60" })).toBeDisabled();
    });

    it("validates new email and verification code inline", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "E-posta Adresini Değiştir" }));
        await user.type(screen.getByLabelText("Yeni E-posta Adresi"), "bad-email");
        await user.click(screen.getByRole("button", { name: "Doğrulama Kodu Gönder" }));

        expect(await screen.findByText("Email formatı doğru olmalı.")).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("updates profile email and localStorage after verification succeeds", async () => {
        const user = userEvent.setup();
        localStorage.setItem("user", JSON.stringify(profile()));
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockTextResponse("Doğrulama kodu yeni e-posta adresinize gönderildi"))
            .mockResolvedValueOnce(mockJsonResponse(profile("Ayşe", "Demir", "new@example.com")));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "E-posta Adresini Değiştir" }));
        await user.type(screen.getByLabelText("Yeni E-posta Adresi"), "new@example.com");
        await user.click(screen.getByRole("button", { name: "Doğrulama Kodu Gönder" }));
        await screen.findByLabelText("Doğrulama kodu");
        await user.type(screen.getByLabelText("Doğrulama kodu"), "004271");
        await user.click(screen.getByRole("button", { name: "Doğrula ve E-postayı Değiştir" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
        expect(fetchMock.mock.calls[2][0]).toContain("/profile/email/verify");
        expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
            email: "new@example.com",
            code: "004271"
        });
        expect(screen.getByLabelText("E-mail")).toHaveValue("new@example.com");
        expect(localStorage.getItem("user")).toBe(JSON.stringify(profile("Ayşe", "Demir", "new@example.com")));
        expect(await screen.findByText("E-posta adresiniz güncellendi.")).toBeInTheDocument();
    });

    it("keeps email change errors inline and supports cancel", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockJsonResponse({ message: "Bu email adresi ile kayıtlı bir kullanıcı zaten var" }, { status: 409 }));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "E-posta Adresini Değiştir" }));
        await user.type(screen.getByLabelText("Yeni E-posta Adresi"), "used@example.com");
        await user.click(screen.getByRole("button", { name: "Doğrulama Kodu Gönder" }));

        expect(await screen.findByText("Bu email adresi ile kayıtlı bir kullanıcı zaten var")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "İptal" }));
        expect(screen.queryByLabelText("Yeni E-posta Adresi")).not.toBeInTheDocument();
    });

    it("shows verification code errors inline", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockTextResponse("Doğrulama kodu yeni e-posta adresinize gönderildi"))
            .mockResolvedValueOnce(mockJsonResponse({ message: "Doğrulama kodu geçersiz" }, { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "E-posta Adresini Değiştir" }));
        await user.type(screen.getByLabelText("Yeni E-posta Adresi"), "new@example.com");
        await user.click(screen.getByRole("button", { name: "Doğrulama Kodu Gönder" }));
        await screen.findByLabelText("Doğrulama kodu");
        await user.type(screen.getByLabelText("Doğrulama kodu"), "111111");
        await user.click(screen.getByRole("button", { name: "Doğrula ve E-postayı Değiştir" }));

        expect(await screen.findByText("Doğrulama kodu geçersiz")).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("sends old and new password, handles wrong old password, and does not store raw passwords", async () => {
        const user = userEvent.setup();
        localStorage.setItem("user", JSON.stringify(profile()));
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockJsonResponse({ message: "Eski şifre hatalı" }, { status: 400 }))
            .mockResolvedValueOnce(mockTextResponse("Şifre başarıyla güncellendi"));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.type(screen.getByLabelText("Eski Şifre"), "wrong-old");
        await user.type(screen.getByLabelText("Yeni Şifre"), "new-secret");
        await user.click(screen.getByRole("button", { name: "Şifreyi Güncelle" }));

        expect(await screen.findByText("Eski şifre hatalı")).toBeInTheDocument();
        expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
            oldPassword: "wrong-old",
            newPassword: "new-secret"
        });

        await user.clear(screen.getByLabelText("Eski Şifre"));
        await user.clear(screen.getByLabelText("Yeni Şifre"));
        await user.type(screen.getByLabelText("Eski Şifre"), "old-secret");
        await user.type(screen.getByLabelText("Yeni Şifre"), "new-secret");
        await user.click(screen.getByRole("button", { name: "Şifreyi Güncelle" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
        expect(await screen.findByText("Şifre başarıyla güncellendi")).toBeInTheDocument();
        expect(localStorage.getItem("user")).not.toContain("old-secret");
        expect(localStorage.getItem("user")).not.toContain("new-secret");
        expect(localStorage.getItem("token") ?? "").not.toContain("new-secret");
    });

    it("disables submit while profile update is saving", async () => {
        const user = userEvent.setup();
        let resolveUpdate: (response: Response) => void = () => undefined;
        const updatePromise = new Promise<Response>(resolve => {
            resolveUpdate = resolve;
        });
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockReturnValueOnce(updatePromise);
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "Profil Bilgilerini Güncelle" }));

        expect(screen.getByRole("button", { name: "Güncelleniyor..." })).toBeDisabled();

        resolveUpdate(mockJsonResponse(profile()));
        expect(await screen.findByRole("button", { name: "Profil Bilgilerini Güncelle" })).toBeEnabled();
    });

    it("opens the account deletion modal without calling native confirm or delete immediately", async () => {
        const user = userEvent.setup();
        localStorage.setItem("token", "token");
        localStorage.setItem("user", JSON.stringify(profile()));
        const confirmSpy = vi.spyOn(window, "confirm");
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        expect(await screen.findByRole("heading", { name: "Profil Bilgileri" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Açık tema" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Hesabı Sil" }));

        expect(screen.getByRole("dialog", { name: "Hesabınızı silmek istediğinizden emin misiniz?" })).toBeInTheDocument();
        expect(screen.getByText("Bu işlem geri alınamaz. Hesabınız ve hesabınıza bağlı veriler kalıcı olarak silinecektir.")).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("closes the account deletion modal on cancel without sending a delete request", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "Hesabı Sil" }));
        await user.click(screen.getByRole("button", { name: "İptal" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("sends the existing delete request after modal confirmation and clears auth on success", async () => {
        const user = userEvent.setup();
        localStorage.setItem("token", "token");
        localStorage.setItem("user", JSON.stringify(profile()));
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockTextResponse("Hesap başarıyla silindi"));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "Hesabı Sil" }));
        await user.click(screen.getByRole("button", { name: "Hesabımı Kalıcı Olarak Sil" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(fetchMock.mock.calls[1][0]).toContain("/profile");
        expect(fetchMock.mock.calls[1][1]?.method).toBe("DELETE");
        expect(localStorage.getItem("token")).toBeNull();
        expect(localStorage.getItem("user")).toBeNull();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("blocks duplicate account deletion confirmation while loading", async () => {
        const user = userEvent.setup();
        let resolveDelete: (response: Response) => void = () => undefined;
        const deletePromise = new Promise<Response>(resolve => {
            resolveDelete = resolve;
        });
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockReturnValueOnce(deletePromise);
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "Hesabı Sil" }));
        await user.click(screen.getByRole("button", { name: "Hesabımı Kalıcı Olarak Sil" }));

        expect(screen.getByRole("button", { name: "Hesabımı Kalıcı Olarak Sil..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "İptal" })).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Hesabımı Kalıcı Olarak Sil..." }));
        fireEvent.keyDown(document, { key: "Escape" });
        fireEvent.mouseDown(screen.getByRole("dialog", { name: "Hesabınızı silmek istediğinizden emin misiniz?" }).parentElement as HTMLElement);

        expect(screen.getByRole("dialog", { name: "Hesabınızı silmek istediğinizden emin misiniz?" })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);

        resolveDelete(mockTextResponse("Hesap başarıyla silindi"));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("keeps the deletion modal open after an error and shows the parsed modal message", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockJsonResponse({ message: "Hesap silinemedi" }, { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "Hesabı Sil" }));
        await user.click(screen.getByRole("button", { name: "Hesabımı Kalıcı Olarak Sil" }));

        expect(await screen.findByText("Hesap silinemedi")).toBeInTheDocument();
        expect(screen.getByRole("dialog", { name: "Hesabınızı silmek istediğinizden emin misiniz?" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Hesabımı Kalıcı Olarak Sil" })).toBeEnabled();
        expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
    });
});

function profile(name = "Ayşe", surname = "Demir", email = "ayse@example.com") {
    return {
        id: 1,
        name,
        surname,
        email
    };
}
