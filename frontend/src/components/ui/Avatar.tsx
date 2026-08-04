export type AvatarSize = "sm" | "md" | "lg" | "xl";

export type AvatarProps = {
    initials: string;
    size?: AvatarSize;
    className?: string;
    title?: string;
};

export function Avatar({ initials, size = "md", className, title }: AvatarProps) {
    const classes = [
        "ui-avatar",
        `ui-avatar-${size}`,
        className ?? ""
    ].filter(Boolean).join(" ");

    return (
        <span className={classes} title={title} aria-hidden="true">
            {initials}
        </span>
    );
}

export default Avatar;
