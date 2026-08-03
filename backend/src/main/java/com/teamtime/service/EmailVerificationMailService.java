package com.teamtime.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.teamtime.exception.EmailDeliveryException;
import com.teamtime.exception.MailConfigurationException;

@Service
public class EmailVerificationMailService {

    private final JavaMailSender mailSender;
    private final String senderEmail;

    public EmailVerificationMailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String senderEmail
    ) {
        this.mailSender = mailSender;
        this.senderEmail = senderEmail;
    }

    public void sendVerificationCode(String to, String code) {
        if (senderEmail == null || senderEmail.isBlank()) {
            throw new MailConfigurationException("E-posta gönderici hesabı yapılandırılmamış");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(to);
        message.setSubject("TeamTime e-posta doğrulama kodu");
        message.setText("""
                Merhaba,

                TeamTime kayıt işleminizi tamamlamak için doğrulama kodunuz:

                %s

                Bu kod 10 dakika boyunca geçerlidir.

                Bu kayıt işlemini siz başlatmadıysanız bu e-postayı yok sayabilirsiniz.
                """.formatted(code));

        try {
            mailSender.send(message);
        } catch (MailException exception) {
            throw new EmailDeliveryException("Doğrulama e-postası gönderilemedi", exception);
        }
    }

    public void sendPasswordResetCode(String to, String code) {
        if (senderEmail == null || senderEmail.isBlank()) {
            throw new MailConfigurationException("E-posta gönderici hesabı yapılandırılmamış");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(to);
        message.setSubject("TeamTime şifre sıfırlama kodu");
        message.setText("""
                Merhaba,

                TeamTime hesabınız için şifre sıfırlama kodunuz:

                %s

                Bu kod 10 dakika boyunca geçerlidir.

                Bu işlemi siz başlatmadıysanız hesabınızın güvenliği için bu e-postayı yok sayın.
                """.formatted(code));

        try {
            mailSender.send(message);
        } catch (MailException exception) {
            throw new EmailDeliveryException("Şifre sıfırlama e-postası gönderilemedi", exception);
        }
    }
}
