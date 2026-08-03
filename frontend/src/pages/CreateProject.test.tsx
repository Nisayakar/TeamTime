import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreateProject from "./CreateProject";
import { mockJsonResponse, mockTextResponse, renderWithProviders } from "../test/testUtils";

describe("CreateProject", () => {
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
        await user.selectOptions(screen.getByRole("combobox"), "team");
        await waitFor(() => expect(screen.getByText("Platform Takımı - Sahip")).toBeInTheDocument());
        await user.click(screen.getByRole("button", { name: "Proje Oluştur" }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

        const [, requestInit] = fetchMock.mock.calls[2];
        const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;

        expect(body.teamId).toBe(11);
        expect(body.teamName).toBeUndefined();
    });
});
