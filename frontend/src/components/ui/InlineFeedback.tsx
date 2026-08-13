export type InlineFeedbackType = "success" | "error" | "warning" | "info";

type InlineFeedbackProps = {
    type: InlineFeedbackType;
    message: string;
    className?: string;
};

const FEEDBACK_LABELS: Record<InlineFeedbackType, string> = {
    success: "Başarılı",
    error: "Hata",
    warning: "Uyarı",
    info: "Bilgi"
};

function InlineFeedback({ type, message, className = "" }: InlineFeedbackProps) {
    if (!message) {
        return null;
    }

    const classNames = ["inline-feedback", `inline-feedback-${type}`, className]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            className={classNames}
            role={type === "error" || type === "warning" ? "alert" : "status"}
            aria-live={type === "error" || type === "warning" ? "assertive" : "polite"}
        >
            <span className="inline-feedback-marker" aria-hidden="true" />
            <span className="inline-feedback-label">{FEEDBACK_LABELS[type]}</span>
            <span>{message}</span>
        </div>
    );
}

export default InlineFeedback;
