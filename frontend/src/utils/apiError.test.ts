import { describe, expect, it } from "vitest";
import { parseApiError } from "./apiError";

describe("parseApiError", () => {
    it("prefers fieldErrors messages", async () => {
        const response = new Response(JSON.stringify({
            message: "Validation failed",
            fieldErrors: {
                email: "E-posta geçersiz",
                password: "Şifre kısa"
            }
        }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });

        await expect(parseApiError(response)).resolves.toBe("E-posta geçersiz\nŞifre kısa");
    });

    it("uses backend message fallback", async () => {
        const response = new Response(JSON.stringify({ message: "Bu işlem için yetkiniz yok" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });

        await expect(parseApiError(response)).resolves.toBe("Bu işlem için yetkiniz yok");
    });

    it("uses plain text fallback", async () => {
        const response = new Response("Proje silindi", {
            status: 409,
            headers: { "Content-Type": "text/plain" }
        });

        await expect(parseApiError(response)).resolves.toBe("Proje silindi");
    });

    it("does not display object text for malformed JSON", async () => {
        const response = new Response("{", {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });

        const message = await parseApiError(response);

        expect(message).toBe("Sunucuda beklenmeyen bir hata oluştu.");
        expect(message).not.toBe("[object Object]");
    });

    it("uses the provided Turkish default fallback", async () => {
        const response = new Response("", { status: 418 });

        await expect(parseApiError(response, "İstek tamamlanamadı.")).resolves.toBe("İstek tamamlanamadı.");
    });
});
