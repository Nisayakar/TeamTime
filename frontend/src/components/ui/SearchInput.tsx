import type { InputHTMLAttributes } from "react";

export type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    onClear?: () => void;
};

export function SearchInput({
    className,
    value,
    onClear,
    placeholder,
    ...rest
}: SearchInputProps) {
    const classes = ["ui-search-input", className ?? ""].filter(Boolean).join(" ");
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
        <div className={classes}>
            <span className="ui-search-input-icon" aria-hidden="true">&#x1F50D;</span>
            <input
                type="search"
                className="ui-search-input-field"
                placeholder={placeholder}
                value={value}
                {...rest}
            />
            {hasValue && onClear ? (
                <button
                    type="button"
                    className="ui-search-input-clear"
                    aria-label="Aramayı temizle"
                    onClick={onClear}
                >
                    &times;
                </button>
            ) : null}
        </div>
    );
}

export default SearchInput;
