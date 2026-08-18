package com.teamtime.service;

import com.teamtime.entity.Notification;
import com.teamtime.event.NotificationEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Set;

@Service
public class NotificationEmailService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationEmailService.class);

    private final JavaMailSender mailSender;
    private final String senderEmail;
    
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "TEAM_INVITATION",
            "TEAM_INVITATION_ACCEPTED",
            "TEAM_INVITATION_REJECTED",
            "TASK_ASSIGNED",
            "TASK_ASSIGNMENT_ACCEPTED",
            "TASK_ASSIGNMENT_REJECTED",
            "TEAM_MEMBER_ADDED",
            "TEAM_MEMBER_REMOVED",
            "TEAM_PROJECT_CREATED",
            "TEAM_TASK_CREATED"
    );

    public NotificationEmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String senderEmail
    ) {
        this.mailSender = mailSender;
        this.senderEmail = senderEmail;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleNotificationEvent(NotificationEvent event) {
        Notification notification = event.getNotification();
        sendEmail(notification);
    }
    
    public void sendEmail(Notification notification) {
        if (notification.getType() == null || !ALLOWED_TYPES.contains(notification.getType().name())) {
            return;
        }

        if (notification.getRecipient() == null || notification.getRecipient().getEmail() == null || notification.getRecipient().getEmail().isBlank()) {
            return;
        }

        if (senderEmail == null || senderEmail.isBlank()) {
            logger.warn("Mail sender is not configured. Skipping email for notification: {}", notification.getId());
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(notification.getRecipient().getEmail());
        message.setSubject("TeamTime - " + notification.getTitle());
        
        String text = "Merhaba " + notification.getRecipient().getName() + ",\n\n" +
                      notification.getMessage() + "\n\n" +
                      "TeamTime hesabınıza giriş yaparak bildirimi görüntüleyebilirsiniz.\n\n" +
                      "TeamTime";
                      
        message.setText(text);

        try {
            mailSender.send(message);
        } catch (MailException e) {
            logger.error("Failed to send notification email to {}. Error: {}", notification.getRecipient().getEmail(), e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error sending email: {}", e.getMessage());
        }
    }
}
