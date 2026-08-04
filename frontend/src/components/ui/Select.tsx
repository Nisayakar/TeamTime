import type { SelectHTMLAttributes } from "react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    hint?: string;
    error?: string;
};

export function Select({
    label,
    hint,
    error,
    className,
    id,
    children,
    ...rest
}: SelectProps) {
    const selectId = id;
    const hintId = hint ? `${selectId ?? "ui-select"}-hint` : undefined;
    const errorId = error ? `${selectId ?? "ui-select"}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    const classes = [
        "ui-select",
        error ? "ui-select-error" : "",
        className ?? ""
    ].filter(Boolean).join(" ");

    return (
        <div>
            {label ? <label className="ui-field-label" htmlFor={selectId}>{label}</label> : null}
            <select
                id={selectId}
                className={classes}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...rest}
            >
                {children}
            </select>
            {hint && !error ? <p className="ui-field-hint" id={hintId}>{hint}</p> : null}
            {error ? <p className="ui-field-error" id={errorId}>{error}</p> : null}
        </div>
    );
}

export default Select;
