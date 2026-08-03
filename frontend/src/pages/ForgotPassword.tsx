import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiFetch } from "../api";
import { useToast } from "../context/toast";
import { parseApiError } from "../utils/apiError";

type ForgotPasswordStep = "email" | "code" | "password";
type MessageType = "error" | "success" | "info";

const RESEND_SECONDS = 60;
const NEUTRAL_REQUEST_MESSAGE = "Eğer bu e-posta adresiyle kayıtlı bir hesap varsa şifre sıfırlama kodu gönderildi.";

function ForgotPassword() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const codeInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<ForgotPasswordStep>("email");
    const [email, setEmail] = useState("");
    const [submittedEmail, setSubmittedEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<MessageType>("info");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS);

    useEffect(() => {
        if (step !== "code") {
            return;
        }

        codeInputRef.current?.focus();
        setResendCountdown(RESEND_SECONDS);
    }, [step, submittedEmail]);

    useEffect(() => {
        if (step !== "code" || resendCountdown <= 0) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setResendCountdown((currentValue) => Math.max(0, currentValue - 1));
        }, 1000);

        return () => window.clearTimeout(timerId);
    }, [step, resendCountdown]);

    async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const validationMessage = validateEmail();

        if (validationMessage) {
            showMessage(validationMessage, "error");
            return;
        }

        setIsSubmitting(true);
        showMessage("", "info");

        try {
            const normalizedEmail = email.trim();
            const response = await apiFetch("/auth/password/request-code", {
                method: "POST",
                body: JSON.stringify({ email: normalizedEmail })
            });

            if (!response.ok) {
                showMessage(await readErrorMessage(response), "error");
                return;
            }

            setSubmittedEmail(normalizedEmail);
            setCode("");
            setStep("code");
            showMessage(NEUTRAL_REQUEST_MESSAGE, "success");
        } catch {
            showMessage("Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.", "error");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        if (!/^[0-9]{6}$/.test(code)) {
            showMessage("Lütfen 6 haneli doğrulama kodunu girin.", "error");
            return;
        }

        setIsSubmitting(true);
        showMessage("", "info");

        try {
            const response = await apiFetch("/auth/password/verify-code", {
                method: "POST",
                body: JSON.stringify({
                    email: submittedEmail,
                    code
                })
            });

            if (!response.ok) {
                showMessage(await readErrorMessage(response), "error");
                return;
            }

            setStep("password");
            showMessage("Kod doğrulandı. Yeni şifrenizi belirleyin.", "success");
        } catch {
            showMessage("Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.", "error");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const validationMessage = validatePassword();

        if (validationMessage) {
            showMessage(validationMessage, "error");
            return;
        }

        setIsSubmitting(true);
        showMessage("", "info");

        try {
            const response = await apiFetch("/auth/password/reset", {
                method: "POST",
                body: JSON.stringify({
                    email: submittedEmail,
                    newPassword,
                    confirmPassword
                })
            });

            if (!response.ok) {
                showMessage(await readErrorMessage(response), "error");
                return;
            }

            setCode("");
            setNewPassword("");
            setConfirmPassword("");
            showMessage("Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.", "success");
            window.setTimeout(() => navigate("/login"), 1200);
        } catch {
            showMessage("Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.", "error");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleResendCode() {
        if (isResending || resendCountdown > 0) {
            return;
        }

        setIsResending(true);
        showMessage("", "info");

        try {
            const response = await apiFetch("/auth/password/resend-code", {
                method: "POST",
                body: JSON.stringify({ email: submittedEmail })
            });

            if (!response.ok) {
                showMessage(await readErrorMessage(response), "error");
                return;
            }

            setCode("");
            setResendCountdown(RESEND_SECONDS);
            codeInputRef.current?.focus();
            showMessage(NEUTRAL_REQUEST_MESSAGE, "success");
        } catch {
            showMessage("Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.", "error");
        } finally {
            setIsResending(false);
        }
    }

    function handleCodeChange(value: string) {
        const sanitized = value
            .replace(/[^0-9]/g, "")
            .slice(0, 6);

        setCode(sanitized);
    }

    function validateEmail() {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email.trim() === "") {
            return "Email boş bırakılamaz";
        }

        if (!emailPattern.test(email.trim())) {
            return "Email formatı doğru olmalı";
        }

        return "";
    }

    function validatePassword() {
        if (newPassword.trim() === "") {
            return "Yeni şifre boş bırakılamaz";
        }

        if (newPassword.length < 6) {
            return "Yeni şifre en az 6 karakter olmalı";
        }

        if (newPassword !== confirmPassword) {
            return "Şifreler uyuşmuyor";
        }

        return "";
    }

    async function readErrorMessage(response: Response) {
        const messageText = await parseApiError(response, "Şifre sıfırlama işlemi tamamlanamadı");

        return mapErrorMessage(messageText, response.status);
    }

    function mapErrorMessage(backendMessage: string, status: number) {
        const messageText = backendMessage.toLocaleLowerCase("tr-TR");

        if (messageText.includes("süresi doldu")) {
            return "Doğrulama kodunun süresi doldu. Yeni kod isteyin.";
        }

        if (messageText.includes("çok fazla") || status === 429 && messageText.includes("hatalı")) {
            return "Çok fazla hatalı deneme yapıldı. Yeni kod isteyin.";
        }

        if (messageText.includes("bekleyin") || status === 429) {
            return "Yeni kod istemeden önce bir süre beklemelisiniz.";
        }

        if (messageText.includes("gönderilemedi") || status === 502) {
            return "Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin.";
        }

        if (messageText.includes("geçersiz") || messageText.includes("hatalı")) {
            return "Doğrulama kodu hatalı.";
        }

        if (messageText.includes("uyuşmuyor")) {
            return "Şifreler uyuşmuyor.";
        }

        return backendMessage || "Şifre sıfırlama işlemi tamamlanamadı.";
    }

    function showMessage(nextMessage: string, nextMessageType: MessageType) {
        setMessage(nextMessage);
        setMessageType(nextMessageType);

        if (nextMessage) {
            showToast({
                type: nextMessageType,
                message: nextMessage
            });
        }
    }

    function formatCountdown(seconds: number) {
        return `00:${String(seconds).padStart(2, "0")}`;
    }

    return (
        <div className="auth-page login-designed-page login-reference-page forgot-password-page">
            <video
                className="login-star-page-video"
                src="/media/yıldız.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
                tabIndex={-1}
            />
            <div className="login-star-page-overlay" aria-hidden="true" />

            <section className="auth-panel auth-visual login-design-visual">
                <span className="eyebrow">TeamTime Güvenlik</span>
                <h1>Hesabına güvenli şekilde yeniden eriş.</h1>
                <p>E-posta kodu ile kimliğini doğrula ve yeni şifreni belirle.</p>
            </section>

            <section className="auth-panel auth-form-panel login-design-form-panel">
                <div className="form-card login-design-card forgot-password-card">
                    <span className="eyebrow">Şifre Sıfırlama</span>
                    <h2 id="forgot-password-title">Şifreni sıfırla</h2>
                    <p className="muted">Kayıtlı e-posta adresine 6 haneli doğrulama kodu göndereceğiz.</p>

                    {
                        message &&
                        <div className={`message-box message-${messageType}`} role={messageType === "error" ? "alert" : "status"}>
                            {message}
                        </div>
                    }

                    <div className="register-live-message" aria-live="polite">
                        {message}
                    </div>

                    {
                        step === "email" && (
                            <form className="forgot-password-form" onSubmit={handleRequestCode}>
                                <div className="field">
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="E-posta Adresi"
                                        autoComplete="email"
                                        required
                                    />
                                    <label htmlFor="forgot-email">E-mail adresi</label>
                                </div>

                                <button className="button button-primary button-full login-design-submit" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Kod gönderiliyor..." : "Sıfırlama Kodu Gönder"}
                                </button>

                                <Link className="button button-secondary button-full" to="/login">
                                    Girişe Dön
                                </Link>
                            </form>
                        )
                    }

                    {
                        step === "code" && (
                            <form className="forgot-password-form verification-panel" onSubmit={handleVerifyCode} noValidate>
                                <p className="verification-email">{submittedEmail} adresine kod gönderdik.</p>

                                <div className="verification-code-field">
                                    <label htmlFor="forgot-code">Doğrulama kodu</label>
                                    <input
                                        ref={codeInputRef}
                                        id="forgot-code"
                                        className="verification-code-input"
                                        type="text"
                                        value={code}
                                        onChange={(event) => handleCodeChange(event.target.value)}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        minLength={6}
                                        pattern="[0-9]{6}"
                                        placeholder="000000"
                                        required
                                    />
                                </div>

                                <button className="button button-primary button-full login-design-submit" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Doğrulanıyor..." : "Kodu Doğrula"}
                                </button>

                                <div className="resend-panel">
                                    <p>
                                        {
                                            resendCountdown > 0
                                                ? `Yeni kod gönderebilmek için ${resendCountdown} saniye bekleyin.`
                                                : "Yeni kod isteyebilirsiniz."
                                        }
                                    </p>
                                    <button
                                        className="button button-secondary button-full"
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={isResending || resendCountdown > 0}
                                    >
                                        {
                                            resendCountdown > 0
                                                ? `Yeni kod gönder: ${formatCountdown(resendCountdown)}`
                                                : isResending
                                                    ? "Kod gönderiliyor..."
                                                    : "Kodu Yeniden Gönder"
                                        }
                                    </button>
                                </div>
                            </form>
                        )
                    }

                    {
                        step === "password" && (
                            <form className="forgot-password-form" onSubmit={handleResetPassword}>
                                <div className="field">
                                    <input
                                        id="forgot-new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        placeholder="Yeni şifre"
                                        minLength={6}
                                        autoComplete="new-password"
                                        required
                                    />
                                    <label htmlFor="forgot-new-password">Yeni şifre</label>
                                </div>

                                <div className="field">
                                    <input
                                        id="forgot-confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        placeholder="Yeni şifre tekrar"
                                        minLength={6}
                                        autoComplete="new-password"
                                        required
                                    />
                                    <label htmlFor="forgot-confirm-password">Yeni şifre tekrar</label>
                                </div>

                                <button className="button button-primary button-full login-design-submit" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Şifre güncelleniyor..." : "Şifreyi Güncelle"}
                                </button>
                            </form>
                        )
                    }
                </div>
            </section>
        </div>
    );
}

export default ForgotPassword;
