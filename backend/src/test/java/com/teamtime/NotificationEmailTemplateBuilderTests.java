package com.teamtime;

import com.teamtime.entity.Notification;
import com.teamtime.entity.NotificationType;
import com.teamtime.entity.User;
import com.teamtime.service.NotificationEmailTemplateBuilder;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class NotificationEmailTemplateBuilderTests {

    @Test
    void testHtmlEscapeAndContent() {
        User recipient = new User();
        recipient.setName("Test <User>");
        
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(NotificationType.TEAM_INVITATION);
        notification.setTitle("Davet");
        notification.setMessage("Mesaj <script>alert(1)</script>");
        notification.setRelatedEntityId(1L);

        NotificationEmailTemplateBuilder.TemplateData data = NotificationEmailTemplateBuilder.getTemplateData(notification);
        String html = NotificationEmailTemplateBuilder.buildHtml(notification, data, "http://localhost:5173");

        assertThat(html).contains("TeamTime"); // Header
        assertThat(html).contains("Merhaba Test &lt;User&gt;"); // Escaped name
        assertThat(html).contains("Mesaj &lt;script&gt;alert(1)&lt;/script&gt;"); // Escaped message
        assertThat(html).contains("href=\"http://localhost:5173/teams/invitations\""); // CTA link
        assertThat(html).contains("#2563EB"); // Blue accent
    }

    @Test
    void testAcceptedSuccessAccent() {
        User recipient = new User();
        recipient.setName("A");
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(NotificationType.TEAM_INVITATION_ACCEPTED);
        notification.setRelatedEntityId(5L);

        NotificationEmailTemplateBuilder.TemplateData data = NotificationEmailTemplateBuilder.getTemplateData(notification);
        String html = NotificationEmailTemplateBuilder.buildHtml(notification, data, "http://app.com/");

        assertThat(html).contains("#16A34A"); // Green
        assertThat(html).contains("href=\"http://app.com/teams/5\"");
    }

    @Test
    void testRejectedDangerAccent() {
        User recipient = new User();
        recipient.setName("A");
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(NotificationType.TASK_ASSIGNMENT_REJECTED);

        NotificationEmailTemplateBuilder.TemplateData data = NotificationEmailTemplateBuilder.getTemplateData(notification);
        String html = NotificationEmailTemplateBuilder.buildHtml(notification, data, "http://app.com");

        assertThat(html).contains("#DC2626"); // Red
    }

    @Test
    void testNullTargetPathSafe() {
        User recipient = new User();
        recipient.setName("A");
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setType(NotificationType.TASK_ASSIGNED); // returns null for targetPath

        NotificationEmailTemplateBuilder.TemplateData data = NotificationEmailTemplateBuilder.getTemplateData(notification);
        String html = NotificationEmailTemplateBuilder.buildHtml(notification, data, "http://app.com");

        assertThat(html).contains("TeamTime hesabınıza giriş yaparak");
        assertThat(html).doesNotContain("<a href=");
    }
}

