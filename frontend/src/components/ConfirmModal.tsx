import { useEffect, useId, useRef } from "react";

export type ConfirmModalProps = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning";
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
};

function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "Onayla",
    cancelLabel = "İptal",
    variant = "danger",
    loading = false,
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    const titleId = useId();
    const messageId = useId();
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        previousFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        const timerId = window.setTimeout(() => {
            getFocusableElements()[0]?.focus();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
            previousFocusRef.current?.focus();
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                if (!loading) {
                    onCancel();
                }
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const focusableElements = getFocusableElements();

            if (focusableElements.length === 0) {
                event.preventDefault();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [loading, onCancel, open]);

    if (!open) {
        return null;
    }

    function getFocusableElements() {
        if (!modalRef.current) {
            return [];
        }

        return Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(
                "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
            )
        );
    }

    function handleBackdropClick() {
        if (!loading) {
            onCancel();
        }
    }

    function handleConfirmClick() {
        if (!loading) {
            void onConfirm();
        }
    }

    return (
        <div className="confirm-modal-backdrop" onMouseDown={handleBackdropClick}>
            <div
                ref={modalRef}
                className={`confirm-modal confirm-modal-${variant}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={messageId}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="confirm-modal-marker" aria-hidden="true" />
                <div className="confirm-modal-copy">
                    <h2 id={titleId}>{title}</h2>
                    <p id={messageId}>{message}</p>
                </div>
                <div className="confirm-modal-actions">
                    <button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>
                        {cancelLabel}
                    </button>
                    <button className="button button-danger" type="button" onClick={handleConfirmClick} disabled={loading}>
                        {loading ? `${confirmLabel}...` : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;
