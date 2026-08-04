import type { ReactNode } from "react";

export type EmptyStateProps = {
    icon?: ReactNode;
    title: string;
    message?: string;
    action?: ReactNode;
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
    return (
        <div className="ui-empty-state">
            {icon ? <span className="ui-empty-state-icon" aria-hidden="true">{icon}</span> : null}
            <p className="ui-empty-state-title">{title}</p>
            {message ? <p className="ui-empty-state-message">{message}</p> : null}
            {action ? <div>{action}</div> : null}
        </div>
    );
}

export default EmptyState;
