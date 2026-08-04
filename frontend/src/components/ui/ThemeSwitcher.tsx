import { useTheme, type ThemePreference } from "../../hooks/useTheme";

const ORDER: ThemePreference[] = ["light", "dark", "system"];

const LABELS: Record<ThemePreference, string> = {
    light: "Açık tema",
    dark: "Koyu tema",
    system: "Sistem teması"
};

const ICONS: Record<ThemePreference, string> = {
    light: "\u2600",
    dark: "\u263D",
    system: "\u2318"
};

export function ThemeSwitcher() {
    const { preference, setPreference } = useTheme();

    return (
        <div className="ui-theme-switcher" role="radiogroup" aria-label="Tema seçimi">
            {ORDER.map(option => {
                const isActive = preference === option;

                return (
                    <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        aria-label={LABELS[option]}
                        title={LABELS[option]}
                        className={`ui-theme-switcher-option${isActive ? " is-active" : ""}`}
                        onClick={() => setPreference(option)}
                    >
                        <span aria-hidden="true">{ICONS[option]}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default ThemeSwitcher;
