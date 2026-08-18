import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockJsonResponse, renderWithRouter } from "../test/testUtils";
import TaskDetailModal from "./TaskDetailModal";

describe("TaskDetailModal", () => {
    const mockTask = {
        id: 42,
        title: "Test Task",
        description: "Test Description",
        projectId: 1,
        teamProject: true
    };

    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
        localStorage.clear();
        localStorage.setItem("token", "fake-token");
        localStorage.setItem(
            "user",
            JSON.stringify({
                id: 1,
                name: "Ahmet",
                surname: "Yılmaz",
                username: "ahmetyilmaz",
                email: "ahmet@example.com"
            })
        );
    });

    it("comments load success", async () => {
        const fetchSpy = vi.mocked(fetch);
        fetchSpy.mockImplementation((input) => {
            const url = String(input);
            if (url.includes("/tasks/42/comments")) {
                return Promise.resolve(
                    mockJsonResponse([
                        {
                            id: 101,
                            taskId: 42,
                            authorId: 1,
                            authorName: "Ahmet Yılmaz",
                            authorUsername: "ahmetyilmaz",
                            content: "İlk yorum buraya",
                            createdAt: "2026-08-18T20:00:00"
                        }
                    ])
                );
            }
            return Promise.resolve(mockJsonResponse([]));
        });

        renderWithRouter(<TaskDetailModal open task={mockTask} onClose={vi.fn()} />);

        await screen.findByText("İlk yorum buraya");
        expect(screen.getByText("Ahmet Yılmaz")).toBeInTheDocument();
        expect(screen.getByText("@ahmetyilmaz")).toBeInTheDocument();
    });

    it("comment create refresh", async () => {
        const user = userEvent.setup();
        const fetchSpy = vi.mocked(fetch);

        fetchSpy.mockImplementation((input, init) => {
            const url = String(input);
            const method = init?.method || "GET";

            if (url.includes("/tasks/42/comments") && method === "GET") {
                return Promise.resolve(mockJsonResponse([]));
            }
            if (url.includes("/tasks/42/comments") && method === "POST") {
                return Promise.resolve(
                    mockJsonResponse({
                        id: 102,
                        taskId: 42,
                        authorId: 1,
                        authorName: "Ahmet Yılmaz",
                        authorUsername: "ahmetyilmaz",
                        content: "Yeni harika yorum",
                        createdAt: "2026-08-18T20:05:00"
                    })
                );
            }
            return Promise.resolve(mockJsonResponse([]));
        });

        renderWithRouter(<TaskDetailModal open task={mockTask} onClose={vi.fn()} />);

        await screen.findByText("Henüz yorum yapılmamış.");

        const input = screen.getByPlaceholderText("Bir yorum yazın...");
        await user.type(input, "Yeni harika yorum");

        const sendBtn = screen.getByRole("button", { name: "Gönder" });
        await user.click(sendBtn);

        await screen.findByText("Yeni harika yorum");
    });

    it("comment load error", async () => {
        const fetchSpy = vi.mocked(fetch);
        fetchSpy.mockImplementation((input) => {
            const url = String(input);
            if (url.includes("/tasks/42/comments")) {
                return Promise.resolve(
                    new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 })
                );
            }
            return Promise.resolve(mockJsonResponse([]));
        });

        renderWithRouter(<TaskDetailModal open task={mockTask} onClose={vi.fn()} />);

        await screen.findByText("Yorumlar yüklenemedi");
    });

    it("history load success", async () => {
        const user = userEvent.setup();
        const fetchSpy = vi.mocked(fetch);

        fetchSpy.mockImplementation((input) => {
            const url = String(input);
            if (url.includes("/tasks/42/assignment-history")) {
                return Promise.resolve(
                    mockJsonResponse([
                        {
                            id: 201,
                            taskId: 42,
                            assignedById: 1,
                            assignedByName: "Ahmet Yılmaz",
                            assignedByUsername: "ahmetyilmaz",
                            assignedToId: 2,
                            assignedToName: "Mehmet Demir",
                            assignedToUsername: "mehmetdemir",
                            eventType: "ASSIGNED",
                            reason: null,
                            createdAt: "2026-08-18T19:00:00"
                        }
                    ])
                );
            }
            return Promise.resolve(mockJsonResponse([]));
        });

        renderWithRouter(<TaskDetailModal open task={mockTask} onClose={vi.fn()} />);

        const historyTab = screen.getByRole("button", { name: /Atama Geçmişi/ });
        await user.click(historyTab);

        await screen.findByText(/@ahmetyilmaz görevi @mehmetdemir/);
    });

    it("attachment list load success", async () => {
        const user = userEvent.setup();
        const fetchSpy = vi.mocked(fetch);

        fetchSpy.mockImplementation((input) => {
            const url = String(input);
            if (url.includes("/tasks/42/attachments")) {
                return Promise.resolve(
                    mockJsonResponse([
                        {
                            id: 301,
                            fileName: "rapor.pdf",
                            fileSize: 1024 * 150, // 150 KB
                            contentType: "application/pdf"
                        }
                    ])
                );
            }
            return Promise.resolve(mockJsonResponse([]));
        });

        renderWithRouter(<TaskDetailModal open task={mockTask} onClose={vi.fn()} />);

        const filesTab = screen.getByRole("button", { name: /Dosyalar/ });
        await user.click(filesTab);

        await screen.findByText("rapor.pdf");
        expect(screen.getByText(/150 KB/)).toBeInTheDocument();
    });
});
