type ApiErrorBody = {
    message?: unknown;
    fieldErrors?: unknown;
    errors?: unknown;
};

const STATUS_FALLBACKS: Record<number, string> = {
    400: "Gönderilen bilgiler kontrol edilmeli.",
    403: "Bu işlem için yetkiniz yok.",
    404: "İstenen kayıt bulunamadı.",
    409: "Bu işlem mevcut kayıtlarla çakışıyor.",
    429: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.",
    500: "Sunucuda beklenmeyen bir hata oluştu.",
    502: "Sunucu şu anda isteği tamamlayamadı."
};

export async function parseApiError(response: Response, fallbackMessage = "İşlem tamamlanamadı.") {
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
        const data: unknown = await response.json().catch(() => null);
        const parsedMessage = parseApiErrorBody(data);

        if (parsedMessage) {
            return parsedMessage;
        }
    } else {
        const text = await response.text().catch(() => "");

        if (text.trim()) {
            return text.trim();
        }
    }

    return STATUS_FALLBACKS[response.status] || fallbackMessage;
}

export function getErrorMessage(error: unknown, fallbackMessage = "İşlem tamamlanamadı.") {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string" && error.trim()) {
        return error.trim();
    }

    return fallbackMessage;
}

function parseApiErrorBody(data: unknown) {
    if (!isApiErrorBody(data)) {
        return "";
    }

    const fieldErrorMessage = parseFieldErrors(data.fieldErrors ?? data.errors);

    if (fieldErrorMessage) {
        return fieldErrorMessage;
    }

    if (typeof data.message === "string" && data.message.trim()) {
        return data.message.trim();
    }

    return "";
}

function parseFieldErrors(fieldErrors: unknown) {
    if (!fieldErrors || typeof fieldErrors !== "object") {
        return "";
    }

    return Object.values(fieldErrors)
        .filter((value): value is string => typeof value === "string" && value.trim() !== "")
        .join("\n");
}

function isApiErrorBody(data: unknown): data is ApiErrorBody {
    return data !== null && typeof data === "object";
}
