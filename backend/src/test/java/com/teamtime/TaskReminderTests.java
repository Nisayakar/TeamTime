package com.teamtime;

import com.teamtime.entity.*;
import com.teamtime.repository.*;
import com.teamtime.service.TaskReminderScheduler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
public class TaskReminderTests {

    @Autowired
    private TaskReminderScheduler taskReminderScheduler;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private User user;
    private Project project;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setName("John");
        user.setSurname("Doe");
        user.setUsername("johndoe");
        user.setEmail("john@example.com");
        user.setPassword("password");
        user = userRepository.save(user);

        project = new Project();
        project.setProjectName("Test Project");
        project.setUser(user);
        project = projectRepository.save(project);
    }

    @Test
    void testDueSoonAndOverdueReminders() {
        createTask("Due Soon Task", LocalDate.now().plusDays(1), user, AssignmentStatus.ACCEPTED, "BEKLIYOR");
        createTask("Overdue Task", LocalDate.now().minusDays(1), user, AssignmentStatus.ACCEPTED, "BEKLIYOR");
        createTask("Pending Task", LocalDate.now().plusDays(1), user, AssignmentStatus.PENDING, "BEKLIYOR");
        createTask("Rejected Task", LocalDate.now().minusDays(1), user, AssignmentStatus.REJECTED, "BEKLIYOR");
        createTask("Unassigned Task", LocalDate.now().plusDays(1), null, AssignmentStatus.UNASSIGNED, "BEKLIYOR");
        createTask("Completed Task", LocalDate.now().plusDays(1), user, AssignmentStatus.ACCEPTED, "TAMAMLANDI");

        taskReminderScheduler.sendTaskReminders();

        List<Notification> notifications = notificationRepository.findAll();
        assertThat(notifications).hasSize(2);

        Notification dueSoonNotification = notifications.stream()
                .filter(n -> n.getType() == NotificationType.DUE_SOON)
                .findFirst()
                .orElse(null);
        assertThat(dueSoonNotification).isNotNull();
        assertThat(dueSoonNotification.getMessage()).contains("Due Soon Task");

        Notification overdueNotification = notifications.stream()
                .filter(n -> n.getType() == NotificationType.OVERDUE)
                .findFirst()
                .orElse(null);
        assertThat(overdueNotification).isNotNull();
        assertThat(overdueNotification.getMessage()).contains("Overdue Task");
        assertThat(notifications)
                .noneMatch(n -> n.getMessage().contains("Pending Task"))
                .noneMatch(n -> n.getMessage().contains("Rejected Task"))
                .noneMatch(n -> n.getMessage().contains("Unassigned Task"))
                .noneMatch(n -> n.getMessage().contains("Completed Task"));

        taskReminderScheduler.sendTaskReminders();
        assertThat(notificationRepository.count()).isEqualTo(2);
    }

    private void createTask(String title, LocalDate dueDate, User assignedUser, AssignmentStatus assignmentStatus, String status) {
        Task task = new Task();
        task.setTitle(title);
        task.setDueDate(dueDate);
        task.setAssignedUser(assignedUser);
        task.setAssignmentStatus(assignmentStatus);
        task.setProject(project);
        task.setStatus(status);
        taskRepository.save(task);
    }
}
