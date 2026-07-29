import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiFetch } from "../api";

type RegisterStep = "details" | "verification";
type MessageType = "error" | "success" | "info";

const RESEND_SECONDS = 60;

function Register() {

    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [code, setCode] = useState("");
    const [submittedEmail, setSubmittedEmail] = useState("");
    const [step, setStep] = useState<RegisterStep>("details");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<MessageType>("info");
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS);

    const codeInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (step !== "verification") {
            return;
        }

        codeInputRef.current?.focus();
        setResendCountdown(RESEND_SECONDS);
    }, [step, submittedEmail]);

    useEffect(() => {
        if (step !== "verification" || resendCountdown <= 0) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setResendCountdown((currentValue) => Math.max(0, currentValue - 1));
        }, 1000);

        return () => window.clearTimeout(timerId);
    }, [step, resendCountdown]);

    async function handleRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSendingCode) {
            return;
        }

        const validationMessage = validateDetails();

        if (validationMessage) {
            showMessage(validationMessage, "error");
            return;
        }

        setIsSendingCode(true);
        showMessage("", "info");

        try {
            const normalizedEmail = email.trim();
            const response = await apiFetch("/auth/register/request-code", {
                method: "POST",
                body: JSON.stringify({
                    firstName: name.trim(),
                    lastName: surname.trim(),
                    email: normalizedEmail,
                    password: password
                })
            });

            if (response.ok) {
                setSubmittedEmail(normalizedEmail);
                setCode("");
                setStep("verification");
                showMessage("Doğrulama kodu e-posta adresinize gönderildi.", "success");
                return;
            }

            showMessage(await readErrorMessage(response), "error");
        } catch {
            showMessage("Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.", "error");
        } finally {
            setIsSendingCode(false);
        }
    }

    async function handleVerify(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isVerifying) {
            return;
        }

        if (!/^[0-9]{6}$/.test(code)) {
            showMessage("Lütfen 6 haneli doğrulama kodunu girin.", "error");
            return;
        }

        setIsVerifying(true);
        showMessage("", "info");

        try {
            const response = await apiFetch("/auth/register/verify", {
                method: "POST",
                body: JSON.stringify({
                    email: submittedEmail,
                    code
                })
            });

            if (response.ok) {
                setPassword("");
                setConfirmPassword("");
                setCode("");
                showMessage("E-posta adresiniz doğrulandı. Hesabınız başarıyla oluşturuldu.", "success");
                window.setTimeout(() => navigate("/login"), 1200);
                return;
            }

            showMessage(await readErrorMessage(response), "error");
        } catch {
            showMessage("Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.", "error");
        } finally {
            setIsVerifying(false);
        }
    }

    async function handleResendCode() {
        if (isResending || resendCountdown > 0) {
            return;
        }

        setIsResending(true);
        showMessage("", "info");

        try {
            const response = await apiFetch("/auth/register/resend-code", {
                method: "POST",
                body: JSON.stringify({
                    email: submittedEmail
                })
            });

            if (response.ok) {
                setCode("");
                setResendCountdown(RESEND_SECONDS);
                codeInputRef.current?.focus();
                showMessage("Yeni doğrulama kodu gönderildi.", "success");
                return;
            }

            showMessage(await readErrorMessage(response), "error");
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

    function handleEditDetails() {
        setStep("details");
        setCode("");
        showMessage("Bilgileri değiştirip yeni kod gönderirseniz önceki doğrulama kodu geçersiz olur.", "info");
    }

    function validateDetails() {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (name.trim() === "") {
            return "Ad boş bırakılamaz";
        }

        if (surname.trim() === "") {
            return "Soyad boş bırakılamaz";
        }

        if (email.trim() === "") {
            return "Email boş bırakılamaz";
        }

        if (!emailPattern.test(email.trim())) {
            return "Email formatı doğru olmalı";
        }

        if (password.trim() === "") {
            return "Şifre boş bırakılamaz";
        }

        if (password.length < 6) {
            return "Şifre en az 6 karakter olmalı";
        }

        if (password !== confirmPassword) {
            return "Şifreler uyuşmuyor";
        }

        return "";
    }

    async function readErrorMessage(response: Response) {
        const contentType = response.headers.get("Content-Type") || "";
        let backendMessage = "";

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.errors) {
                backendMessage = Object.values(data.errors).join("\n");
            } else {
                backendMessage = data.message || "";
            }
        } else {
            backendMessage = await response.text();
        }

        return mapErrorMessage(backendMessage, response.status);
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

        if (messageText.includes("zaten var") || status === 409) {
            return "Bu e-posta adresiyle daha önce kayıt oluşturulmuş.";
        }

        if (messageText.includes("gönderilemedi") || status === 502) {
            return "Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.";
        }

        if (messageText.includes("geçersiz") || messageText.includes("hatalı")) {
            return "Doğrulama kodu hatalı.";
        }

        return backendMessage || "Kayıt işlemi tamamlanamadı.";
    }

    function showMessage(nextMessage: string, nextMessageType: MessageType) {
        setMessage(nextMessage);
        setMessageType(nextMessageType);
    }

    function formatCountdown(seconds: number) {
        return `00:${String(seconds).padStart(2, "0")}`;
    }

    return (
        <div className="auth-page">
            <section className="auth-panel auth-visual">
                <span className="eyebrow">Yeni çalışma alanı</span>
                <h1>TeamTime ile ekip ritmini düzenle.</h1>
                <p>Projeleri, görevleri ve takım üyelerini profesyonel bir panelde takip et.</p>

                <div className="auth-preview auth-preview-grid">
                    <span className="badge badge-blue">Projeler</span>
                    <span className="badge badge-purple">Takımlar</span>
                    <span className="badge badge-green">Görevler</span>
                </div>
            </section>

            <section className="auth-panel auth-form-panel">
                <div className="form-card register-card">
                    <div className="register-stepper" aria-label="Kayıt adımları">
                        <span className={step === "details" ? "register-step is-active" : "register-step is-complete"}>
                            1 Bilgiler
                        </span>
                        <span className={step === "verification" ? "register-step is-active" : "register-step"}>
                            2 Doğrulama
                        </span>
                    </div>

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
                        step === "details" ?
                            <form onSubmit={handleRegister}>
                                <span className="eyebrow">Kayıt</span>
                                <h2>Hesap oluştur</h2>
                                <p className="muted">TeamTime çalışma alanına katılmak için bilgilerini gir.</p>

                                <div className="form-grid two-columns">
                                    <div className="field">
                                        <input
                                            id="register-name"
                                            type="text"
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            placeholder=" "
                                            required
                                            autoComplete="given-name"
                                        />
                                        <label htmlFor="register-name">Ad</label>
                                    </div>

                                    <div className="field">
                                        <input
                                            id="register-surname"
                                            type="text"
                                            value={surname}
                                            onChange={(event) => setSurname(event.target.value)}
                                            placeholder=" "
                                            required
                                            autoComplete="family-name"
                                        />
                                        <label htmlFor="register-surname">Soyad</label>
                                    </div>
                                </div>

                                <div className="field">
                                    <input
                                        id="register-email"
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder=" "
                                        required
                                        autoComplete="email"
                                    />
                                    <label htmlFor="register-email">E-mail</label>
                                </div>

                                <div className="field">
                                    <input
                                        id="register-password"
                                        type="password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder=" "
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                    <label htmlFor="register-password">Şifre</label>
                                </div>

                                <div className="field">
                                    <input
                                        id="register-confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        placeholder=" "
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                    <label htmlFor="register-confirm-password">Şifre Tekrar</label>
                                </div>

                                <button className="button button-primary button-full" type="submit" disabled={isSendingCode}>
                                    {isSendingCode ? "Kod gönderiliyor..." : "Doğrulama Kodu Gönder"}
                                </button>

                                <p className="auth-switch">Zaten hesabın var mı?</p>

                                <Link className="button button-secondary button-full" to="/login">
                                    Giriş Yap
                                </Link>
                            </form>
                            :
                            <form className="verification-panel" onSubmit={handleVerify} noValidate>
                                <span className="eyebrow">E-posta Doğrulama</span>
                                <h2>Doğrulama kodunu gir</h2>
                                <p className="muted">E-posta adresinize gönderilen 6 haneli kodu girin.</p>
                                <p className="verification-email">{submittedEmail} adresine kod gönderdik.</p>

                                <div className="verification-code-field">
                                    <label htmlFor="verification-code">Doğrulama kodu</label>
                                    <input
                                        ref={codeInputRef}
                                        id="verification-code"
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

                                <button className="button button-primary button-full" type="submit" disabled={isVerifying}>
                                    {isVerifying ? "Doğrulanıyor..." : "Doğrula ve Kaydı Tamamla"}
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

                                <button className="button button-ghost button-full" type="button" onClick={handleEditDetails}>
                                    Bilgileri Düzenle
                                </button>
                            </form>
                    }
                </div>
            </section>
        </div>
    );
}

export default Register;
