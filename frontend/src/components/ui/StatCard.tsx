import type { HTMLAttributes, ReactNode } from "react";

export type StatCardTone = "primary" | "success" | "warning" | "danger";

export type StatCardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    label: string;
    value: ReactNode;
    hint?: string;
    icon?: ReactNode;
    tone?: StatCardTone;
};

export function StatCard({
    label,
    value,
    hint,
    icon,
    tone = "primary",
    className,
    ...rest
}: StatCardProps) {
    const classes = ["ui-stat-card", className ?? ""].filter(Boolean).join(" ");
    const iconClasses = [
        "ui-stat-card-icon",
        tone === "success" ? "is-success" : tone === "warning" ? "is-warning" : tone === "danger" ? "is-danger" : ""
    ].filter(Boolean).join(" ");

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
