import { broadcastSyncEvent, subscribeToSync } from "./sync";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();
const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "user";
let unauthorizedRedirectHandler = () => {
    window.location.assign("/login");
};

if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL tanımlı değil. Lütfen frontend/.env dosyasını kontrol edin.");
}

export function getMediaUrl(path?: string | null) {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    
    const baseUrl = API_BASE_URL.replace(/\/$/, "");
    if (path.startsWith("/api/") && baseUrl.endsWith("/api")) {
        return `${baseUrl.slice(0, -4)}${path}`;
    }
    
    const separator = path.startsWith("/") ? "" : "/";
    return `${baseUrl}${separator}${path}`;
}

type LoginUser = {
    id: number;
    name: string;
    surname: string;
    email: string;
    token: string;
    profileImageUrl?: string | null;
}

export function saveAuth(loginUser: LoginUser) {
    localStorage.setItem(TOKEN_STORAGE_KEY, loginUser.token);
    localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify({
            id: loginUser.id,
            name: loginUser.name,
            surname: loginUser.surname,
            email: loginUser.email,
            profileImageUrl: loginUser.profileImageUrl
        })
    );
    window.dispatchEvent(new Event("user-updated"));
    broadcastSyncEvent("AUTH_CHANGED");
    broadcastSyncEvent("USER_UPDATED");
}

export function getToken() {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (token) {
        return token;
    }

    const data = localStorage.getItem(USER_STORAGE_KEY);

    if (!data) {
        return null;
    }

    const user = JSON.parse(data);

    if (!user.token) {
        return null;
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, user.token);
    return user.token;
}

export function getStoredUser() {
    const data = localStorage.getItem(USER_STORAGE_KEY);

    if (!data) {
        return null;
    }

    return JSON.parse(data);
}

export function updateStoredUser(user: {
    id: number;
    name: string;
    surname: string;
    email: string;
    profileImageUrl?: string | null;
}) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("user-updated"));
    broadcastSyncEvent("USER_UPDATED");
}

export function isAuthenticated() {
    return getToken() !== null;
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    window.dispatchEvent(new Event("user-updated"));
    broadcastSyncEvent("AUTH_CHANGED");
}

function isPublicAuthRequest(path: string) {
    return path === "/login"
        || path === "/register"
        || path.startsWith("/auth/register/")
        || path.startsWith("/auth/password/");
}

function redirectToLoginAfterUnauthorized() {
    if (window.location.pathname === "/login") {
        return;
    }

    unauthorizedRedirectHandler();
}

export function setUnauthorizedRedirectHandlerForTests(handler: () => void) {
    unauthorizedRedirectHandler = handler;
}

export function resetUnauthorizedRedirectHandlerForTests() {
    unauthorizedRedirectHandler = () => {
        window.location.assign("/login");
    };
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = getToken();
    const headers = new Headers(options.headers);

    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    if (response.status === 401 && !isPublicAuthRequest(path)) {
        clearAuth();
        redirectToLoginAfterUnauthorized();
    }

    return response;
}

subscribeToSync((event) => {
    if (event.type === "AUTH_CHANGED" || event.type === "USER_UPDATED") {
        window.dispatchEvent(new Event("user-updated"));
        
        const hasToken = getToken() !== null;
        const path = window.location.pathname;
        
        if (!hasToken && !isPublicAuthRequest(path) && path !== "/") {
            redirectToLoginAfterUnauthorized();
        } else if (hasToken && isPublicAuthRequest(path)) {
            window.location.assign("/dashboard");
        }
    }
});
