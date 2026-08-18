import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    apiFetch,
    clearAuth,
    resetUnauthorizedRedirectHandlerForTests,
    setUnauthorizedRedirectHandlerForTests
} from "./api";
import { mockJsonResponse } from "./test/testUtils";
import { testSimulateRemoteEvent } from "./sync";

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

describe("multi-tab sync via broadcast event", () => {
    let originalLocation: Location;

    beforeEach(() => {
        originalLocation = window.location;
        // Mock window.location
        const mockLocation = { ...originalLocation, assign: vi.fn(), pathname: "" } as unknown as Location;
        Object.defineProperty(window, "location", {
            configurable: true,
            value: mockLocation,
        });
    });

    afterEach(() => {
        clearAuth();
        resetUnauthorizedRedirectHandlerForTests();
        Object.defineProperty(window, "location", {
            configurable: true,
            value: originalLocation,
        });
        vi.restoreAllMocks();
    });

    it("redirects to login when token is removed on a private route", () => {
        window.location.pathname = "/dashboard";
        const redirect = vi.fn();
        setUnauthorizedRedirectHandlerForTests(redirect);

        localStorage.removeItem("token");
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
        
        testSimulateRemoteEvent({ type: "AUTH_CHANGED" });

        // Check if user-updated event was dispatched
        expect(dispatchEventSpy.mock.calls.some(call => call[0].type === "user-updated")).toBe(true);
        expect(redirect).toHaveBeenCalledTimes(1);
    });

    it("redirects to dashboard when token is added on a public auth route", () => {
        window.location.pathname = "/login";

        localStorage.setItem("token", "new-token");
        const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
        
        testSimulateRemoteEvent({ type: "AUTH_CHANGED" });

        expect(dispatchEventSpy.mock.calls.some(call => call[0].type === "user-updated")).toBe(true);
        expect(window.location.assign).toHaveBeenCalledWith("/dashboard");
    });

    it("does not redirect when token is removed on a public auth route", () => {
        window.location.pathname = "/login";
        const redirect = vi.fn();
        setUnauthorizedRedirectHandlerForTests(redirect);

        localStorage.removeItem("token");
        testSimulateRemoteEvent({ type: "AUTH_CHANGED" });

        expect(redirect).not.toHaveBeenCalled();
        expect(window.location.assign).not.toHaveBeenCalled();
    });
});
