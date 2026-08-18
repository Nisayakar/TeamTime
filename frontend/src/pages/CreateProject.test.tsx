import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreateProject from "./CreateProject";
import { mockJsonResponse, mockTextResponse, renderWithProviders } from "../test/testUtils";

describe("CreateProject", () => {
    it("defaults to personal project and submits teamId null without showing team select", async () => {
        const user = userEvent.setup();
        localStorage.setItem("user", JSON.stringify({ id: 5 }));
        localStorage.setItem("token", "token");

        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse([]))
            .mockResolvedValueOnce(mockTextResponse("Proje oluşturuldu"));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<CreateProject />);

        expect(await screen.findByRole("radio", { name: /Kişisel Proje/ })).toHaveAttribute("aria-checked", "true");
        expect(screen.queryByRole("combobox", { name: "Takım" })).not.toBeInTheDocument();

        const textboxes = screen.getAllByRole("textbox");
        await user.type(textboxes[0], "Kişisel Plan");
        await user.type(textboxes[1], "Kendi çalışma alanım");
        await user.click(screen.getByRole("button", { name: "Proje Oluştur" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const body = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)) as Record<string, unknown>;

        expect(body.teamId).toBeNull();
        expect(body.teamName).toBeUndefined();
    });

    it("submits teamId without legacy teamName for team projects", async () => {
        const user = userEvent.setup();
        localStorage.setItem("user", JSON.stringify({ id: 5 }));
        localStorage.setItem("token", "token");

        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse([
                { id: 11, name: "Platform Takımı", description: "Ürün ekibi" }
            ]))
            .mockResolvedValueOnce(mockJsonResponse([
                {
                    id: 1,
                    userId: 5,
                    userName: "Ayşe Demir",
                    teamId: 11,
                    teamName: "Platform Takımı",
                    role: "OWNER",
                    joinedDate: "2026-08-03T10:00:00"
                }
            ]))
            .mockResolvedValueOnce(mockTextResponse("Proje oluşturuldu"));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<CreateProject />);

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        const textboxes = screen.getAllByRole("textbox");
        await user.type(textboxes[0], "Takım Lansmanı");
        await user.type(textboxes[1], "Yeni sürüm hazırlığı");
        await user.click(screen.getByRole("radio", { name: /Takım Projesi/ }));
        await user.selectOptions(screen.getByRole("combobox", { name: "Takım" }), "11");
        await waitFor(() => expect(screen.getByText("Rolünüz: Sahip")).toBeInTheDocument());
        await user.click(screen.getByRole("button", { name: "Proje Oluştur" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

        const [, requestInit] = fetchMock.mock.calls[2];
        const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;

        expect(body.teamId).toBe(11);
        expect(body.teamName).toBeUndefined();
    });

    it("filters member teams and shows an empty state when no manageable team exists", async () => {
        const user = userEvent.setup();
        localStorage.setItem("user", JSON.stringify({ id: 5 }));
        localStorage.setItem("token", "token");

        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse([
                { id: 11, name: "Üye Takımı", description: "Sadece üyelik" }
            ]))
            .mockResolvedValueOnce(mockJsonResponse([
                {
                    id: 1,
                    userId: 5,
                    userName: "Ayşe Demir",
                    teamId: 11,
                    teamName: "Üye Takımı",
                    role: "MEMBER",
                    joinedDate: "2026-08-03T10:00:00"
                }
            ]));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<CreateProject />);

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        await user.click(screen.getByRole("radio", { name: /Takım Projesi/ }));

        expect(screen.queryByText("Üye Takımı")).not.toBeInTheDocument();
        expect(screen.getByText("Takım projesi oluşturabileceğiniz bir takım bulunmuyor.")).toBeInTheDocument();
    });

    it("requires a selected team for team projects", async () => {
        const user = userEvent.setup();
        localStorage.setItem("user", JSON.stringify({ id: 5 }));
        localStorage.setItem("token", "token");

        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse([
                { id: 11, name: "Platform Takımı", description: "Ürün ekibi" }
            ]))
            .mockResolvedValueOnce(mockJsonResponse([
                {
                    id: 1,
                    userId: 5,
                    userName: "Ayşe Demir",
                    teamId: 11,
                    teamName: "Platform Takımı",
                    role: "ADMIN",
                    joinedDate: "2026-08-03T10:00:00"
                }
            ]));
        vi.stubGlobal("fetch", fetchMock);

        renderWithProviders(<CreateProject />);

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        await user.click(screen.getByRole("radio", { name: /Takım Projesi/ }));
        await user.click(screen.getByRole("button", { name: "Proje Oluştur" }));

        expect(await screen.findByText("Lütfen bir takım seçin.")).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
