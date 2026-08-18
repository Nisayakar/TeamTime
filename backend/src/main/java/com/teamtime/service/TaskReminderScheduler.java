package com.teamtime.service;

import com.teamtime.entity.NotificationType;
import com.teamtime.entity.Task;
import com.teamtime.entity.AssignmentStatus;
import com.teamtime.repository.NotificationRepository;
import com.teamtime.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class TaskReminderScheduler {

    private static final Logger logger = LoggerFactory.getLogger(TaskReminderScheduler.class);

    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;

    public TaskReminderScheduler(
            TaskRepository taskRepository,
            NotificationRepository notificationRepository,
            NotificationService notificationService
    ) {
        this.taskRepository = taskRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "${app.scheduler.task-reminders.cron:0 0 9 * * *}")
    public void sendTaskReminders() {
        logger.info("Starting due-date reminders check...");
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        List<Task> tasks = taskRepository.findAll().stream()
                .filter(t -> !"TAMAMLANDI".equals(t.getStatus()))
                .filter(t -> t.getDueDate() != null)
                .filter(t -> t.getAssignedUser() != null)
                .filter(t -> t.getAssignmentStatus() == AssignmentStatus.ACCEPTED)
                .toList();

        for (Task task : tasks) {
            LocalDate dueDate = task.getDueDate();
            Long recipientId = task.getAssignedUser().getId();

            if (dueDate.equals(tomorrow)) {
                boolean alreadyNotified = notificationRepository.existsByRecipientIdAndTypeAndRelatedEntityId(
                        recipientId,
                        NotificationType.DUE_SOON,
                        task.getId()
                );
                if (!alreadyNotified) {
                    notificationService.notifyTaskDueSoon(task.getAssignedUser(), task.getId(), task.getTitle());
                    logger.info("Sent DUE_SOON notification to user {} for task {}", recipientId, task.getId());
                }
            }

            if (dueDate.isBefore(today)) {
                boolean alreadyNotified = notificationRepository.existsByRecipientIdAndTypeAndRelatedEntityId(
                        recipientId,
                        NotificationType.OVERDUE,
                        task.getId()
                );
                if (!alreadyNotified) {
                    notificationService.notifyTaskOverdue(task.getAssignedUser(), task.getId(), task.getTitle());
                    logger.info("Sent OVERDUE notification to user {} for task {}", recipientId, task.getId());
                }
            }
        }
        logger.info("Completed due-date reminders check.");
    }
}
