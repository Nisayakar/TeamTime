package com.teamtime.service;

import com.teamtime.entity.Notification;
import org.springframework.web.util.HtmlUtils;

public class NotificationEmailTemplateBuilder {

    public static class TemplateData {
        public String title;
        public String subject;
        public String accentColor;
    }

    public static TemplateData getTemplateData(Notification notification) {
        TemplateData data = new TemplateData();
        String type = notification.getType() != null ? notification.getType().name() : "";

        switch (type) {
            case "TEAM_INVITATION":
                data.subject = "Yeni takım daveti";
                data.title = "Bir takıma davet edildiniz";
                data.accentColor = "#2563EB"; // blue
                break;
            case "TEAM_INVITATION_ACCEPTED":
                data.subject = "Takım daveti kabul edildi";
                data.title = "Davetiniz kabul edildi";
                data.accentColor = "#16A34A"; // green
                break;
            case "TEAM_INVITATION_REJECTED":
                data.subject = "Takım daveti reddedildi";
                data.title = "Davetiniz reddedildi";
                data.accentColor = "#DC2626"; // red
                break;
            case "TASK_ASSIGNED":
                data.subject = "Yeni görev atandı";
                data.title = "Size yeni bir görev atandı";
                data.accentColor = "#2563EB"; // blue
                break;
            case "TASK_ASSIGNMENT_ACCEPTED":
                data.subject = "Görev ataması kabul edildi";
                data.title = "Görev ataması kabul edildi";
                data.accentColor = "#16A34A"; // green
                break;
            case "TASK_ASSIGNMENT_REJECTED":
                data.subject = "Görev ataması reddedildi";
                data.title = "Görev ataması reddedildi";
                data.accentColor = "#DC2626"; // red
                break;
            case "TEAM_MEMBER_ADDED":
                data.subject = "Takıma yeni üye eklendi";
                data.title = "Takıma yeni bir üye katıldı";
                data.accentColor = "#2563EB"; // blue
                break;
            case "TEAM_MEMBER_REMOVED":
                data.subject = "Takımdan bir üye çıkarıldı";
                data.title = "Takımdan bir üye ayrıldı";
                data.accentColor = "#D97706"; // amber
                break;
            case "TEAM_PROJECT_CREATED":
                data.subject = "Yeni takım projesi";
                data.title = "Yeni bir proje oluşturuldu";
                data.accentColor = "#2563EB"; // blue
                break;
            case "TEAM_TASK_CREATED":
                data.subject = "Yeni takım görevi";
                data.title = "Takımda yeni bir görev oluşturuldu";
                data.accentColor = "#2563EB"; // blue
                break;
            default:
                data.subject = notification.getTitle();
                data.title = notification.getTitle();
                data.accentColor = "#4B5563"; // gray
                break;
        }
        return data;
    }

    public static String buildHtml(Notification notification, TemplateData data, String frontendUrl) {
        String safeName = HtmlUtils.htmlEscape(notification.getRecipient().getName() != null ? notification.getRecipient().getName() : "Kullanıcı");
        String safeMessage = HtmlUtils.htmlEscape(notification.getMessage() != null ? notification.getMessage() : "");
        String safeTitle = HtmlUtils.htmlEscape(data.title);

        String ctaHtml = "";
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            String targetPath = computeTargetPath(notification);
            if (targetPath != null) {
                String link = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) + targetPath : frontendUrl + targetPath;
                ctaHtml = "<div style=\"text-align: center; margin: 32px 0;\">" +
                          "<a href=\"" + link + "\" style=\"background-color: " + data.accentColor + "; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;\">TeamTime'da Görüntüle</a>" +
                          "</div>";
            } else {
                ctaHtml = "<p style=\"color: #4B5563; font-size: 14px; margin-top: 24px; border-top: 1px solid #E5E7EB; padding-top: 16px;\">TeamTime hesabınıza giriş yaparak bildirimi görüntüleyebilirsiniz.</p>";
            }
        } else {
            ctaHtml = "<p style=\"color: #4B5563; font-size: 14px; margin-top: 24px; border-top: 1px solid #E5E7EB; padding-top: 16px;\">TeamTime hesabınıza giriş yaparak bildirimi görüntüleyebilirsiniz.</p>";
        }

        return "<!DOCTYPE html>" +
               "<html>" +
               "<head><meta charset=\"UTF-8\"></head>" +
               "<body style=\"margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\">" +
               "<table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"background-color: #F3F4F6; padding: 40px 20px;\">" +
               "<tr><td align=\"center\">" +
               "<table width=\"100%\" max-width=\"600\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\">" +
               "<tr><td style=\"background-color: #1E3A8A; padding: 24px; text-align: center;\">" +
               "<h1 style=\"color: #FFFFFF; margin: 0; font-size: 24px; font-weight: bold;\">TeamTime</h1>" +
               "</td></tr>" +
               "<tr><td style=\"padding: 32px 24px;\">" +
               "<h2 style=\"color: " + data.accentColor + "; margin: 0 0 16px 0; font-size: 20px;\">" + safeTitle + "</h2>" +
               "<p style=\"color: #374151; font-size: 16px; margin: 0 0 16px 0;\">Merhaba " + safeName + ",</p>" +
               "<p style=\"color: #374151; font-size: 16px; margin: 0 0 24px 0; line-height: 1.5;\">" + safeMessage + "</p>" +
               ctaHtml +
               "</td></tr>" +
               "<tr><td style=\"background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;\">" +
               "<p style=\"color: #6B7280; font-size: 12px; margin: 0;\">Bu e-posta TeamTime hesabınızdaki bir işlem nedeniyle gönderildi.</p>" +
               "<p style=\"color: #6B7280; font-size: 12px; margin: 8px 0 0 0; font-weight: bold;\">TeamTime</p>" +
               "</td></tr>" +
               "</table>" +
               "</td></tr>" +
               "</table>" +
               "</body>" +
               "</html>";
    }

    public static String buildPlainText(Notification notification, TemplateData data, String frontendUrl) {
        String safeName = notification.getRecipient().getName() != null ? notification.getRecipient().getName() : "Kullanıcı";
        String message = notification.getMessage() != null ? notification.getMessage() : "";

        StringBuilder sb = new StringBuilder();
        sb.append("Merhaba ").append(safeName).append(",\n\n");
        sb.append(data.title).append("\n\n");
        sb.append(message).append("\n\n");

        if (frontendUrl != null && !frontendUrl.isBlank()) {
            String targetPath = computeTargetPath(notification);
            if (targetPath != null) {
                String link = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) + targetPath : frontendUrl + targetPath;
                sb.append("TeamTime'da görüntülemek için tıklayın: ").append(link).append("\n\n");
            } else {
                sb.append("TeamTime hesabınıza giriş yaparak bildirimi görüntüleyebilirsiniz.\n\n");
            }
        } else {
            sb.append("TeamTime hesabınıza giriş yaparak bildirimi görüntüleyebilirsiniz.\n\n");
        }
        
        sb.append("Bu e-posta TeamTime hesabınızdaki bir işlem nedeniyle gönderildi.\n");
        sb.append("TeamTime");

        return sb.toString();
    }

    private static String computeTargetPath(Notification notification) {
        if (notification.getRelatedEntityId() == null) {
            return null;
        }

        switch (notification.getType().name()) {
            case "TEAM_INVITATION":
                return "/teams/invitations";
            case "TEAM_INVITATION_ACCEPTED":
            case "TEAM_INVITATION_REJECTED":
            case "TEAM_MEMBER_ADDED":
                return "/teams/" + notification.getRelatedEntityId();
            case "TEAM_MEMBER_REMOVED":
                return "/teams";
            case "TEAM_PROJECT_CREATED":
            case "TEAM_TASK_CREATED":
            case "TASK_ASSIGNED":
            case "TASK_ASSIGNMENT_ACCEPTED":
            case "TASK_ASSIGNMENT_REJECTED":
                return null; 
        }
        return null;
    }
}

