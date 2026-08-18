package com.teamtime.service;

import com.teamtime.dto.NotificationPageResponse;
import com.teamtime.dto.NotificationResponse;
import com.teamtime.entity.Notification;
import com.teamtime.entity.NotificationType;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.User;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import com.teamtime.event.NotificationEvent;

@Service
public class NotificationService {

    private static final String TEAM_ENTITY = "TEAM";
    private static final String PROJECT_ENTITY = "PROJECT";
    private static final String TASK_ENTITY = "TASK";
    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final com.teamtime.repository.TaskRepository taskRepository;
    private final ApplicationEventPublisher eventPublisher;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            TeamMemberRepository teamMemberRepository,
            com.teamtime.repository.TaskRepository taskRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.taskRepository = taskRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Notification createNotification(
            User recipient,
            String title,
            String message,
            NotificationType type,
            Long relatedEntityId,
            String relatedEntityType
    ) {
        Notification notification = new Notification();
        notification.setRecipient(recipient);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setRelatedEntityId(relatedEntityId);
        notification.setRelatedEntityType(relatedEntityType);

        Notification saved = notificationRepository.save(notification);
        eventPublisher.publishEvent(new NotificationEvent(this, saved));
        return saved;
    }

    @Transactional
    public void notifyTeamMemberAdded(User recipient, Team team, String role) {
        createNotification(
                recipient,
                "Takıma Eklendiniz",
                "%s takımına %s rolüyle eklendiniz.".formatted(team.getName(), roleLabel(role)),
                NotificationType.TEAM_MEMBER_ADDED,
                team.getId(),
                TEAM_ENTITY);
    }

    @Transactional
    public void notifyTeamMemberRemoved(User recipient, Team team) {
        createNotification(
                recipient,
                "Takımdan Çıkarıldınız",
                "%s takımından çıkarıldınız.".formatted(team.getName()),
                NotificationType.TEAM_MEMBER_REMOVED,
                team.getId(),
                TEAM_ENTITY);
    }

    @Transactional
    public void notifyTeamProjectCreated(Team team, Long projectId, String projectName, Long creatorUserId) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(team.getId());

        members.stream()
                .filter(member -> !member.getUser().getId().equals(creatorUserId))
                .forEach(member -> createNotification(
                        member.getUser(),
                        "Yeni takım projesi oluşturuldu",
                        "%s takımında %s projesi oluşturuldu.".formatted(team.getName(), projectName),
                        NotificationType.TEAM_PROJECT_CREATED,
                        projectId,
                        PROJECT_ENTITY));
    }

    @Transactional
    public void notifyTeamTaskCreated(Team team, Long taskId, String taskTitle, Long creatorUserId) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(team.getId());

        members.stream()
                .filter(member -> !member.getUser().getId().equals(creatorUserId))
                .forEach(member -> createNotification(
                        member.getUser(),
                        "Yeni takım görevi oluşturuldu",
                        "%s takımında %s görevi oluşturuldu.".formatted(team.getName(), taskTitle),
                        NotificationType.TEAM_TASK_CREATED,
                        taskId,
                        TASK_ENTITY));
    }

    @Transactional
    public void notifyTaskAssigned(User recipient, Team team, Long taskId, String taskTitle) {
        createNotification(
                recipient,
                "Yeni Görev: %s".formatted(taskTitle),
                "%s takımında size bir görev atandı.".formatted(team.getName()),
                NotificationType.TASK_ASSIGNED,
                taskId,
                TASK_ENTITY);
    }

    @Transactional
    public void notifyTaskAssignmentAccepted(Team team, Long taskId, String taskTitle, String responderName, Long respondingUserId) {
        notifyTaskManagers(
                team,
                taskId,
                "Görev kabul edildi",
                "%s, %s görevini kabul etti.".formatted(responderName, taskTitle),
                NotificationType.TASK_ASSIGNMENT_ACCEPTED,
                respondingUserId);
    }

    @Transactional
    public void notifyTaskAssignmentRejected(Team team, Long taskId, String taskTitle, String responderName, String reason, Long respondingUserId) {
        String baseMessage = "%s, %s görevini reddetti.".formatted(responderName, taskTitle);
        String finalMessage = baseMessage;
        if (reason != null && !reason.isBlank()) {
            String truncatedReason = reason.length() > 100 ? reason.substring(0, 97) + "..." : reason;
            finalMessage += " Mazeret: " + truncatedReason;
        }

        notifyTaskManagers(
                team,
                taskId,
                "Görev reddedildi",
                finalMessage,
                NotificationType.TASK_ASSIGNMENT_REJECTED,
                respondingUserId);
    }

    public NotificationPageResponse getCurrentUserNotifications(Long currentUserId, int page, int size) {
        requireUser(currentUserId);
        validatePageRequest(page, size);

        Page<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                currentUserId,
                PageRequest.of(page, size));

        List<Notification> notificationList = notifications.getContent();
        
        List<Long> taskIds = notificationList.stream()
                .filter(n -> "TASK".equals(n.getRelatedEntityType()) && n.getRelatedEntityId() != null)
                .map(Notification::getRelatedEntityId)
                .distinct()
                .toList();

        java.util.Map<Long, Long> taskProjectIdMap = new java.util.HashMap<>();
        if (!taskIds.isEmpty()) {
            List<Object[]> mappings = taskRepository.findProjectIdsByTaskIds(taskIds);
            for (Object[] mapping : mappings) {
                taskProjectIdMap.put((Long) mapping[0], (Long) mapping[1]);
            }
        }

        List<NotificationResponse> content = notificationList.stream()
                .map(n -> convertToResponse(n, taskProjectIdMap))
                .toList();

        return new NotificationPageResponse(
                content,
                notifications.getNumber(),
                notifications.getSize(),
                notifications.getTotalElements(),
                notifications.getTotalPages(),
                notifications.isLast());
    }

    public long getUnreadCount(Long currentUserId) {
        requireUser(currentUserId);

        return notificationRepository.countByRecipientIdAndReadFalse(currentUserId);
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, Long currentUserId) {
        requireUser(currentUserId);

        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Bildirim bulunamadı"));

        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);

        java.util.Map<Long, Long> taskProjectIdMap = new java.util.HashMap<>();
        if ("TASK".equals(saved.getRelatedEntityType()) && saved.getRelatedEntityId() != null) {
            List<Object[]> mappings = taskRepository.findProjectIdsByTaskIds(List.of(saved.getRelatedEntityId()));
            if (!mappings.isEmpty()) {
                taskProjectIdMap.put((Long) mappings.get(0)[0], (Long) mappings.get(0)[1]);
            }
        }

        return convertToResponse(saved, taskProjectIdMap);
    }

    @Transactional
    public void markAllAsRead(Long currentUserId) {
        requireUser(currentUserId);
        notificationRepository.markAllAsReadForRecipient(currentUserId);
    }

    @Transactional
    public void clearAllNotifications(Long currentUserId) {
        requireUser(currentUserId);
        notificationRepository.deleteByRecipientId(currentUserId);
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
    }

    private void validatePageRequest(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Page must be zero or greater.");
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Size must be between 1 and 50.");
        }
    }

    private String roleLabel(String role) {
        if (role == null) {
            return "Üye";
        }

        return switch (role.trim().toUpperCase()) {
            case "OWNER" -> "Sahip";
            case "ADMIN" -> "Yönetici";
            case "MEMBER" -> "Üye";
            default -> role;
        };
    }

    private void notifyTaskManagers(
            Team team,
            Long taskId,
            String title,
            String message,
            NotificationType type,
            Long respondingUserId
    ) {
        teamMemberRepository.findByTeamId(team.getId())
                .stream()
                .filter(member -> !member.getUser().getId().equals(respondingUserId))
                .filter(member -> {
                    String role = member.getRole() == null ? "" : member.getRole().trim().toUpperCase();
                    return role.equals("OWNER") || role.equals("ADMIN");
                })
                .forEach(member -> createNotification(
                        member.getUser(),
                        title,
                        message,
                        type,
                        taskId,
                        TASK_ENTITY));
    }

    private NotificationResponse convertToResponse(Notification notification, java.util.Map<Long, Long> taskProjectIdMap) {
        String targetPath = computeTargetPath(notification, taskProjectIdMap);
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getRelatedEntityId(),
                notification.getRelatedEntityType(),
                targetPath);
    }

    private String computeTargetPath(Notification notification, java.util.Map<Long, Long> taskProjectIdMap) {
        if (notification.getRelatedEntityId() == null) {
            return null;
        }

        return switch (notification.getType()) {
            case TEAM_INVITATION -> "/teams/invitations";
            case TEAM_INVITATION_ACCEPTED, TEAM_INVITATION_REJECTED -> "/teams/" + notification.getRelatedEntityId();
            case TEAM_MEMBER_ADDED -> "/teams/" + notification.getRelatedEntityId();
            case TEAM_MEMBER_REMOVED -> "/teams";
            case TEAM_PROJECT_CREATED -> "/project/" + notification.getRelatedEntityId();
            case TEAM_TASK_CREATED, TASK_ASSIGNED, TASK_ASSIGNMENT_ACCEPTED, TASK_ASSIGNMENT_REJECTED -> {
                Long projectId = taskProjectIdMap.get(notification.getRelatedEntityId());
                yield projectId != null ? "/project/" + projectId : null;
            }
        };
    }

    public void notifyTeamInvitationAccepted(User teamOwner, User invitedUser, Team team) {
        if (teamOwner.getId().equals(invitedUser.getId())) {
            return;
        }

        Notification notification = new Notification();
        notification.setRecipient(teamOwner);
        notification.setType(NotificationType.TEAM_INVITATION_ACCEPTED);
        notification.setTitle("Takım daveti kabul edildi");
        
        String username = invitedUser.getName() + " " + invitedUser.getSurname() + " (@" + invitedUser.getUsername() + ")";
        notification.setMessage(String.format("%s, %s takımına katılma davetinizi kabul etti.",
                username.trim(), team.getName()));
        
        notification.setRelatedEntityId(team.getId());
        notification.setRelatedEntityType("TEAM");
        notification.setRead(false);
        Notification saved = notificationRepository.save(notification);
        eventPublisher.publishEvent(new NotificationEvent(this, saved));
    }

    public void notifyTeamInvitationRejected(User teamOwner, User invitedUser, Team team) {
        if (teamOwner.getId().equals(invitedUser.getId())) {
            return;
        }

        Notification notification = new Notification();
        notification.setRecipient(teamOwner);
        notification.setType(NotificationType.TEAM_INVITATION_REJECTED);
        notification.setTitle("Takım daveti reddedildi");
        
        String username = invitedUser.getName() + " " + invitedUser.getSurname() + " (@" + invitedUser.getUsername() + ")";
        notification.setMessage(String.format("%s, %s takımına katılma davetinizi reddetti.",
                username.trim(), team.getName()));
        
        notification.setRelatedEntityId(team.getId());
        notification.setRelatedEntityType("TEAM");
        notification.setRead(false);
        Notification saved = notificationRepository.save(notification);
        eventPublisher.publishEvent(new NotificationEvent(this, saved));
    }
}
