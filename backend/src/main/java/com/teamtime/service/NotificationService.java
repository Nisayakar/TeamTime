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

@Service
public class NotificationService {

    private static final String TEAM_ENTITY = "TEAM";
    private static final String PROJECT_ENTITY = "PROJECT";
    private static final String TASK_ENTITY = "TASK";
    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            TeamMemberRepository teamMemberRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.teamMemberRepository = teamMemberRepository;
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

        return notificationRepository.save(notification);
    }

    @Transactional
    public void notifyTeamMemberAdded(User recipient, Team team, String role) {
        createNotification(
                recipient,
                "Takıma eklendiniz",
                "%s takımına %s rolüyle eklendiniz.".formatted(team.getName(), role),
                NotificationType.TEAM_MEMBER_ADDED,
                team.getId(),
                TEAM_ENTITY);
    }

    @Transactional
    public void notifyTeamMemberRemoved(User recipient, Team team) {
        createNotification(
                recipient,
                "Takımdan çıkarıldınız",
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

    public NotificationPageResponse getCurrentUserNotifications(Long currentUserId, int page, int size) {
        requireUser(currentUserId);
        validatePageRequest(page, size);

        Page<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(
                currentUserId,
                PageRequest.of(page, size));

        List<NotificationResponse> content = notifications.getContent()
                .stream()
                .map(this::convertToResponse)
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

        return convertToResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllAsRead(Long currentUserId) {
        requireUser(currentUserId);
        notificationRepository.markAllAsReadForRecipient(currentUserId);
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

    private NotificationResponse convertToResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getRelatedEntityId(),
                notification.getRelatedEntityType());
    }
}
