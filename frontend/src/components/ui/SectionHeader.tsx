import type { ReactNode } from "react";

export type SectionHeaderProps = {
    title: ReactNode;
    subtitle?: ReactNode;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
    return (
        <div className="ui-section-header">
            <h2 className="ui-section-header-title">{title}</h2>
            {subtitle ? <p className="ui-section-header-subtitle">{subtitle}</p> : null}
        </div>
    );
}

export default SectionHeader;
