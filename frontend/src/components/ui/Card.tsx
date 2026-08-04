import type { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
    interactive?: boolean;
    padding?: "sm" | "md" | "lg";
    children: ReactNode;
};

export function Card({
    interactive = false,
    padding = "md",
    className,
    children,
    ...rest
}: CardProps) {
    const classes = [
        "ui-card",
        interactive ? "ui-card-interactive" : "",
        padding === "sm" ? "ui-card-padding-sm" : padding === "lg" ? "ui-card-padding-lg" : "",
        className ?? ""
    ].filter(Boolean).join(" ");

    return (
        <div className={classes} {...rest}>
            {children}
        </div>
    );
}

export default Card;
