import type { TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    hint?: string;
    error?: string;
};

export function Textarea({
    label,
    hint,
    error,
    className,
    id,
    ...rest
}: TextareaProps) {
    const textareaId = id;
    const hintId = hint ? `${textareaId ?? "ui-textarea"}-hint` : undefined;
    const errorId = error ? `${textareaId ?? "ui-textarea"}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    const classes = [
        "ui-textarea",
        error ? "ui-textarea-error" : "",
        className ?? ""
    ].filter(Boolean).join(" ");

    return (
        <div>
            {label ? <label className="ui-field-label" htmlFor={textareaId}>{label}</label> : null}
            <textarea
                id={textareaId}
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

export default Textarea;
