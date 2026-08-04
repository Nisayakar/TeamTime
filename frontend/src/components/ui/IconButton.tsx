import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    children: ReactNode;
};

export function IconButton({ label, children, className, type = "button", ...rest }: IconButtonProps) {
    const classes = ["ui-icon-button", className ?? ""].filter(Boolean).join(" ");

    return (
        <button type={type} className={classes} aria-label={label} {...rest}>
            {children}
        </button>
    );
}

export default IconButton;
