import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant;
    children: ReactNode;
};

export function Badge({ variant = "neutral", className, children, ...rest }: BadgeProps) {
    const classes = [
        "ui-badge",
        variant === "neutral" ? "" : `ui-badge-${variant}`,
        className ?? ""
    ].filter(Boolean).join(" ");

    return (
        <span className={classes} {...rest}>
            {children}
        </span>
    );
}

export default Badge;
