import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
    error?: string;
};

export function Input({
    label,
    hint,
    error,
    className,
    id,
    ...rest
}: InputProps) {
    const inputId = id;
    const hintId = hint ? `${inputId ?? "ui-input"}-hint` : undefined;
    const errorId = error ? `${inputId ?? "ui-input"}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    const classes = [
        "ui-input",
        error ? "ui-input-error" : "",
        className ?? ""
    ].filter(Boolean).join(" ");

    return (
        <div>
            {label ? <label className="ui-field-label" htmlFor={inputId}>{label}</label> : null}
            <input
                id={inputId}
                className={classes}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                {...rest}
            />
            {hint && !error ? <p className="ui-field-hint" id={hintId}>{hint}</p> : null}
            {error ? <p className="ui-field-error" id={errorId}>{error}</p> : null}
        </div>
    );
}

export default Input;
