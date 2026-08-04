import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode
} from "react";
import { ThemeContext, type ThemePreference, type ResolvedTheme, type ThemeContextValue } from "../context/theme";

const STORAGE_KEY = "theme";

const VALID_PREFERENCES: ReadonlyArray<ThemePreference> = ["light", "dark", "system"];

function readStoredPreference(): ThemePreference {
    if (typeof window === "undefined") {
        return "light";
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored && VALID_PREFERENCES.includes(stored as ThemePreference)) {
        return stored as ThemePreference;
    }

    return "light";
}

function getSystemTheme(): ResolvedTheme {
    if (typeof window === "undefined" || !window.matchMedia) {
        return "light";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
    return preference === "system" ? getSystemTheme() : preference;
}

function applyThemeToDocument(theme: ResolvedTheme) {
    if (typeof document === "undefined") {
        return;
    }

    document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredPreference());
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readStoredPreference()));

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);

        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, next);
        }

        const resolved = resolveTheme(next);
        setResolvedTheme(resolved);
        applyThemeToDocument(resolved);
    }, []);

    useEffect(() => {
        applyThemeToDocument(resolvedTheme);
    }, [resolvedTheme]);

    useEffect(() => {
        if (preference !== "system" || typeof window === "undefined" || !window.matchMedia) {
            return undefined;
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        function handleChange() {
            const resolved = getSystemTheme();
            setResolvedTheme(resolved);
            applyThemeToDocument(resolved);
        }

        mediaQuery.addEventListener("change", handleChange);

        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [preference]);

    const value = useMemo<ThemeContextValue>(() => ({
        preference,
        resolvedTheme,
        setPreference
    }), [preference, resolvedTheme, setPreference]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}
