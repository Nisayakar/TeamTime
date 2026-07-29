package com.teamtime.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.teamtime.exception.MailConfigurationException;

@Service
public class VerificationCodeHashService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String secret;

    public VerificationCodeHashService(@Value("${verification.code.secret:}") String secret) {
        this.secret = secret;
    }

    public String hash(String normalizedEmail, String code) {
        ensureSecretConfigured();

        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(keySpec);
            byte[] digest = mac.doFinal((normalizedEmail + ":" + code).getBytes(StandardCharsets.UTF_8));

            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("Doğrulama kodu hazırlanamadı", exception);
        }
    }

    public boolean matches(String normalizedEmail, String code, String expectedHash) {
        String actualHash = hash(normalizedEmail, code);

        return MessageDigest.isEqual(
                actualHash.getBytes(StandardCharsets.UTF_8),
                expectedHash.getBytes(StandardCharsets.UTF_8));
    }

    private void ensureSecretConfigured() {
        if (secret == null || secret.isBlank()) {
            throw new MailConfigurationException("Doğrulama kodu gizli anahtarı yapılandırılmamış");
        }
    }
}
