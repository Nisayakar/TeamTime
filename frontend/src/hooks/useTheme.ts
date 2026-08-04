import { useContext } from "react";
import { ThemeContext, type ThemeContextValue, type ThemePreference } from "../context/theme";

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
}

export type { ThemePreference };
