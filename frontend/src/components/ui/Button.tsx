import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
};

export function Button({
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = "button",
    ...rest
}: ButtonProps) {
    const classes = [
        "ui-button",
        `ui-button-${variant}`,
        size === "sm" ? "ui-button-sm" : size === "lg" ? "ui-button-lg" : "",
        fullWidth ? "ui-button-full" : "",
        className ?? ""
    ].filter(Boolean).join(" ");

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
            {children}
            {rightIcon ? <span aria-hidden="true">{rightIcon}</span> : null}
        </button>
    );
}

export default Button;
