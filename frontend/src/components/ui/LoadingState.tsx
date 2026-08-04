import type { ReactNode } from "react";

export type LoadingStateProps = {
    message?: string;
    children?: ReactNode;
};

export function LoadingState({ message = "Yükleniyor...", children }: LoadingStateProps) {
    return (
        <div className="ui-loading-state" role="status" aria-live="polite">
            <span className="ui-loading-spinner" aria-hidden="true" />
            <span>{children ?? message}</span>
        </div>
    );
}

export default LoadingState;
