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
            <main id="app-shell-main" className="app-shell-main">
                <div className="app-shell-container">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default AppShell;
