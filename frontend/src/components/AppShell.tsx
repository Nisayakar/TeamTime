import type { ReactNode } from "react";

export type AppShellProps = {
    children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="app-shell">
            <a className="app-shell-skip-link" href="#app-shell-main">
                İçeriğe geç
            </a>
            <div id="app-shell-main" className="app-shell-main" tabIndex={-1}>
                {children}
            </div>
        </div>
    );
}

export default AppShell;
