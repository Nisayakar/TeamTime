import type { HTMLAttributes, ReactNode } from "react";

export type StatCardTone = "primary" | "success" | "warning" | "danger";
export type StatCardLayout = "default" | "top";

export type StatCardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    label: string;
    value: ReactNode;
    hint?: string;
    icon?: ReactNode;
    tone?: StatCardTone;
    layout?: StatCardLayout;
};

export function StatCard({
    label,
    value,
    hint,
    icon,
    tone = "primary",
    layout = "default",
    className,
    ...rest
}: StatCardProps) {
    const classes = [
        "ui-stat-card",
        `tone-${tone}`,
        layout === "top" ? "ui-stat-card-top-layout" : "",
        className ?? ""
    ].filter(Boolean).join(" ");
    const iconClasses = [
        "ui-stat-card-icon",
        tone === "success" ? "is-success" : tone === "warning" ? "is-warning" : tone === "danger" ? "is-danger" : ""
    ].filter(Boolean).join(" ");

    if (layout === "top") {
        return (
            <div className={classes} {...rest}>
                <div className="ui-stat-card-top">
                    <span className="ui-stat-card-label">{label}</span>
                    {icon ? <span className={iconClasses} aria-hidden="true">{icon}</span> : null}
                </div>
                <strong className="ui-stat-card-value">{value}</strong>
                {hint ? <span className="ui-stat-card-hint">{hint}</span> : null}
            </div>
        );
    }

    return (
        <div className={classes} {...rest}>
            {icon ? <span className={iconClasses} aria-hidden="true">{icon}</span> : null}
            <span className="ui-stat-card-label">{label}</span>
            <strong className="ui-stat-card-value">{value}</strong>
            {hint ? <span className="ui-stat-card-hint">{hint}</span> : null}
        </div>
    );
}

export default StatCard;
