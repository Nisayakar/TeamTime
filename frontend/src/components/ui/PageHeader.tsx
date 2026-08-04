import type { ReactNode } from "react";

export type PageHeaderProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <header className="ui-page-header">
            <div>
                <h1 className="ui-page-header-title">{title}</h1>
                {subtitle ? <p className="ui-page-header-subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="ui-page-header-actions">{actions}</div> : null}
        </header>
    );
}

export default PageHeader;
