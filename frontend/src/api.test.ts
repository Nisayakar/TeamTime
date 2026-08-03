import { afterEach, describe, expect, it, vi } from "vitest";
import {
    apiFetch,
    clearAuth,
    resetUnauthorizedRedirectHandlerForTests,
    setUnauthorizedRedirectHandlerForTests
} from "./api";
import { mockJsonResponse } from "./test/testUtils";

describe("apiFetch", () => {
    afterEach(() => {
        clearAuth();
        resetUnauthorizedRedirectHandlerForTests();
    });

    it("adds Authorization header when a token exists", async () => {
        localStorage.setItem("token", "abc-token");
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValue(mockJsonResponse({ ok: true }));
        vi.stubGlobal("fetch", fetchMock);

        await apiFetch("/dashboard");

        const [, requestInit] = fetchMock.mock.calls[0];
        const headers = requestInit?.headers as Headers;

        expect(headers.get("Authorization")).toBe("Bearer abc-token");
    });

    it("does not add Authorization header when token is missing", async () => {
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValue(mockJsonResponse({ ok: true }));
        vi.stubGlobal("fetch", fetchMock);

        await apiFetch("/dashboard");

        const [, requestInit] = fetchMock.mock.calls[0];
        const headers = requestInit?.headers as Headers;

        expect(headers.has("Authorization")).toBe(false);
    });

    it("clears auth and redirects on private 401 responses", async () => {
        localStorage.setItem("token", "expired-token");
        localStorage.setItem("user", JSON.stringify({ id: 1 }));
        const redirect = vi.fn();
        setUnauthorizedRedirectHandlerForTests(redirect);
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValue(mockJsonResponse({ message: "Unauthorized" }, { status: 401 }));
        vi.stubGlobal("fetch", fetchMock);

        await apiFetch("/dashboard");

        expect(localStorage.getItem("token")).toBeNull();
        expect(localStorage.getItem("user")).toBeNull();
        expect(redirect).toHaveBeenCalledTimes(1);
    });

    it("does not redirect for public auth request 401 responses", async () => {
        localStorage.setItem("token", "token");
        const redirect = vi.fn();
        setUnauthorizedRedirectHandlerForTests(redirect);
        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValue(mockJsonResponse({ message: "Invalid login" }, { status: 401 }));
        vi.stubGlobal("fetch", fetchMock);

        await apiFetch("/login", { method: "POST" });

        expect(redirect).not.toHaveBeenCalled();
    });
});
