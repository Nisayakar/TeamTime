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
            .mockResolvedValueOnce(mockJsonResponse(profile("Ayşe Nur", "Demir", "aysenur@example.com")));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        expect(await screen.findByDisplayValue("Ayşe")).toBeInTheDocument();
        await user.clear(screen.getByLabelText("Ad"));
        await user.type(screen.getByLabelText("Ad"), "Ayşe Nur");
        await user.clear(screen.getByLabelText("E-mail"));
        await user.type(screen.getByLabelText("E-mail"), "aysenur@example.com");
        await user.click(screen.getByRole("button", { name: "Profil Bilgilerini Güncelle" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const [, requestInit] = fetchMock.mock.calls[1];
        expect(JSON.parse(String(requestInit?.body))).toEqual({
            name: "Ayşe Nur",
            surname: "Demir",
            email: "aysenur@example.com"
        });
        expect(localStorage.getItem("user")).toBe(JSON.stringify(profile("Ayşe Nur", "Demir", "aysenur@example.com")));
    });

    it("shows duplicate email errors safely", async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse(profile()))
            .mockResolvedValueOnce(mockJsonResponse({ message: "Bu email adresi ile kayıtlı bir kullanıcı zaten var" }, { status: 409 }));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<Profile />);

        await screen.findByDisplayValue("Ayşe");
        await user.click(screen.getByRole("button", { name: "Profil Bilgilerini Güncelle" }));

        expect(await screen.findByText("Bu email adresi ile kayıtlı bir kullanıcı zaten var")).toBeInTheDocument();
        expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
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

        expect(await screen.findByRole("heading", { name: "Hesap Ayarları" })).toBeInTheDocument();
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

    it("keeps the deletion modal open after an error and shows the parsed toast message", async () => {
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
