import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar";
import type { NotificationItem, NotificationPage } from "../types/notification";
import { mockJsonResponse, renderWithRouter } from "../test/testUtils";

describe("Navbar notifications", () => {
    it("loads the initial notification page and shows the load-more button when more pages exist", async () => {
        const user = userEvent.setup();
        localStorage.setItem("token", "token");
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse({ unreadCount: 1 }))
            .mockResolvedValueOnce(mockJsonResponse(notificationPage([notification(1, "First")], {
                last: false,
                totalElements: 2,
                totalPages: 2
            })));
        vi.stubGlobal("fetch", fetchMock);

        renderWithRouter(<Navbar />);
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        await user.click(screen.getByRole("button", { name: /okunmamış bildirim|Bildirimler/ }));

        expect(await screen.findByText("First")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Daha Fazla Göster" })).toBeInTheDocument();
        expect(String(fetchMock.mock.calls[1][0])).toContain("/notifications?page=0&size=20");
    });

    it("appends more notifications without duplicates and hides the button on the last page", async () => {
        const user = userEvent.setup();
        localStorage.setItem("token", "token");
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse({ unreadCount: 0 }))
            .mockResolvedValueOnce(mockJsonResponse(notificationPage([notification(1, "First")], {
                last: false,
                totalElements: 3,
                totalPages: 2
            })))
            .mockResolvedValueOnce(mockJsonResponse(notificationPage([
                notification(1, "First Duplicate"),
                notification(2, "Second")
            ], {
                page: 1,
                last: true,
                totalElements: 3,
                totalPages: 2
            })));
        vi.stubGlobal("fetch", fetchMock);

        renderWithRouter(<Navbar />);
        await user.click(screen.getByRole("button", { name: "Bildirimler" }));
        await screen.findByText("First");

        await user.click(screen.getByRole("button", { name: "Daha Fazla Göster" }));

        expect(await screen.findByText("Second")).toBeInTheDocument();
        expect(screen.queryByText("First Duplicate")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Daha Fazla Göster" })).not.toBeInTheDocument();
        expect(String(fetchMock.mock.calls[2][0])).toContain("/notifications?page=1&size=20");
    });

    it("disables the load-more button while loading the next page", async () => {
        const user = userEvent.setup();
        localStorage.setItem("token", "token");
        let resolveMorePage: (response: Response) => void = () => undefined;
        const morePagePromise = new Promise<Response>(resolve => {
            resolveMorePage = resolve;
        });
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse({ unreadCount: 0 }))
            .mockResolvedValueOnce(mockJsonResponse(notificationPage([notification(1, "First")], {
                last: false,
                totalElements: 2,
                totalPages: 2
            })))
            .mockReturnValueOnce(morePagePromise);
        vi.stubGlobal("fetch", fetchMock);

        renderWithRouter(<Navbar />);
        await user.click(screen.getByRole("button", { name: "Bildirimler" }));
        await screen.findByText("First");

        await user.click(screen.getByRole("button", { name: "Daha Fazla Göster" }));

        expect(screen.getByRole("button", { name: "Yükleniyor..." })).toBeDisabled();

        resolveMorePage(mockJsonResponse(notificationPage([notification(2, "Second")], {
            page: 1,
            last: true,
            totalElements: 2,
            totalPages: 2
        })));
        expect(await screen.findByText("Second")).toBeInTheDocument();
    });

    it("does not refetch notifications when reopening already loaded dropdown data", async () => {
        const user = userEvent.setup();
        localStorage.setItem("token", "token");
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse({ unreadCount: 0 }))
            .mockResolvedValueOnce(mockJsonResponse(notificationPage([notification(1, "First")])));
        vi.stubGlobal("fetch", fetchMock);

        renderWithRouter(<Navbar />);
        await user.click(screen.getByRole("button", { name: "Bildirimler" }));
        await screen.findByText("First");
        await user.click(screen.getByRole("button", { name: "Bildirimler" }));
        await user.click(screen.getByRole("button", { name: "Bildirimler" }));

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(screen.getByText("First")).toBeInTheDocument();
    });

    it("keeps read and read-all actions working with paginated state", async () => {
        const user = userEvent.setup();
        localStorage.setItem("token", "token");
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(mockJsonResponse({ unreadCount: 2 }))
            .mockResolvedValueOnce(mockJsonResponse(notificationPage([
                notification(1, "First", false),
                notification(2, "Second", false)
            ])))
            .mockResolvedValueOnce(mockJsonResponse(notification(1, "First", true)))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.stubGlobal("fetch", fetchMock);

        renderWithRouter(<Navbar />);
        await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
        await user.click(screen.getByRole("button", { name: /2 okunmamış bildirim/ }));
        await user.click(await screen.findByRole("button", { name: /First/ }));

        await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
        await user.click(screen.getByRole("button", { name: "Tümünü okundu işaretle" }));

        await waitFor(() => expect(screen.queryByText("1")).not.toBeInTheDocument());
        expect(fetchMock.mock.calls.some(call => String(call[0]).includes("/notifications/1/read"))).toBe(true);
        expect(fetchMock.mock.calls.some(call => String(call[0]).includes("/notifications/read-all"))).toBe(true);
    });
});

function notificationPage(
    content: NotificationItem[],
    overrides: Partial<NotificationPage> = {}
): NotificationPage {
    return {
        content,
        page: overrides.page ?? 0,
        size: overrides.size ?? 20,
        totalElements: overrides.totalElements ?? content.length,
        totalPages: overrides.totalPages ?? 1,
        last: overrides.last ?? true
    };
}

function notification(id: number, title: string, read = false): NotificationItem {
    return {
        id,
        title,
        message: `${title} message`,
        type: "TEAM_MEMBER_ADDED",
        read,
        createdAt: "2026-08-03T10:00:00",
        relatedEntityId: null,
        relatedEntityType: null
    };
}
