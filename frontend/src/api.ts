const API_BASE_URL = "http://localhost:8085/api";
const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "user";

type LoginUser = {
    id: number;
    name: string;
    surname: string;
    email: string;
    token: string;
}

export function saveAuth(loginUser: LoginUser) {
    localStorage.setItem(TOKEN_STORAGE_KEY, loginUser.token);
    localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify({
            id: loginUser.id,
            name: loginUser.name,
            surname: loginUser.surname,
            email: loginUser.email
        })
    );
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
}) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function isAuthenticated() {
    return getToken() !== null;
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
}

export function apiFetch(path: string, options: RequestInit = {}) {
    const token = getToken();
    const headers = new Headers(options.headers);

    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });
}
