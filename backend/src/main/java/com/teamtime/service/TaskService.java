package com.teamtime.service;

import com.teamtime.dto.TaskRequest;
import com.teamtime.dto.TaskResponse;
import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.TaskPriority;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TaskService {


    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final NotificationService notificationService;



    public TaskService(TaskRepository taskRepository,
                       ProjectRepository projectRepository,
                       TeamMemberRepository teamMemberRepository,
                       NotificationService notificationService) {

        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.notificationService = notificationService;

    }


    @Transactional
    public TaskResponse createTask(TaskRequest request, Long projectId, Long userId) {


        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Proje bulunamadı")
                );

        requireTaskMutationAccess(project, userId);

        validateNewTaskDueDate(request.getDueDate());

        Task task = new Task();
        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription());
        task.setStatus(normalizeStatus(request.getStatus()));
        task.setPriority(normalizePriority(request.getPriority()));
        task.setDueDate(request.getDueDate());
        task.setProject(project);
        updateCompletedAt(task);

        Task savedTask = taskRepository.save(task);

        if (project.getTeam() != null) {
            notificationService.notifyTeamTaskCreated(
                    project.getTeam(),
                    savedTask.getId(),
                    savedTask.getTitle(),
                    userId);
        }

        return convertToResponse(savedTask);

    }



    public List<TaskResponse> getTasksByProject(Long projectId, Long userId) {


        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Proje bulunamadı")
                );

        requireTaskViewAccess(project, userId);

        return taskRepository.findByProjectId(projectId)
                .stream()
                .map(this::convertToResponse)
                .toList();

    }

    public List<TaskResponse> getRecentTasks(Long userId) {


        return taskRepository.findAccessibleTasksOrderByIdDesc(userId)
                .stream()
                .map(this::convertToResponse)
                .toList();

    }

    public List<TaskResponse> getUpcomingTasks(Long userId) {
        return taskRepository.findUpcomingAccessibleTasks(userId, LocalDate.now(), PageRequest.of(0, 5))
                .stream()
                .map(this::convertToResponse)
                .toList();
    }



    @Transactional
    public TaskResponse updateTask(Long id, TaskRequest updatedTask, Long userId) {


        Optional<Task> task =
                taskRepository.findById(id);



        if(task.isEmpty()){

            throw new ResourceNotFoundException("Görev bulunamadı veya bu görev için yetkiniz yok");

        }



        Task existingTask = task.get();

        requireTaskMutationAccess(existingTask.getProject(), userId);


        existingTask.setTitle(updatedTask.getTitle().trim());

        existingTask.setDescription(updatedTask.getDescription());

        existingTask.setStatus(normalizeStatus(updatedTask.getStatus()));

        existingTask.setPriority(normalizePriority(updatedTask.getPriority()));

        existingTask.setDueDate(updatedTask.getDueDate());

        updateCompletedAt(existingTask);



        return convertToResponse(taskRepository.save(existingTask));

    }



    public void deleteTask(Long id, Long userId) {


        Optional<Task> task = taskRepository.findById(id);

        if(task.isEmpty()){

            throw new ResourceNotFoundException("Görev bulunamadı veya bu görev için yetkiniz yok");

        }


        Task existingTask = task.get();
        requireTaskMutationAccess(existingTask.getProject(), userId);

        taskRepository.delete(existingTask);

    }

    private void requireTaskViewAccess(Project project, Long userId) {
        if (project.getTeam() == null) {
            if (!project.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Proje bulunamadı veya bu proje için yetkiniz yok");
            }

            return;
        }

        requireTeamMembership(project.getTeam().getId(), userId);
    }

    private void requireTaskMutationAccess(Project project, Long userId) {
        if (project.getTeam() == null) {
            if (!project.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Proje bulunamadı veya bu proje için yetkiniz yok");
            }

            return;
        }

        TeamRole role = requireTeamMembership(project.getTeam().getId(), userId);

        if (role != TeamRole.OWNER && role != TeamRole.ADMIN) {
            throw new AccessDeniedException("Takım projesindeki görevleri yönetme yetkiniz yok");
        }
    }

    private TeamRole requireTeamMembership(Long teamId, Long userId) {
        TeamMember membership = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new AccessDeniedException("Bu takım için yetkiniz yok"));

        return TeamRole.from(membership.getRole());
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "BEKLIYOR";
        }

        if (!status.equals("BEKLIYOR") && !status.equals("DEVAM_EDIYOR") && !status.equals("TAMAMLANDI")) {
            throw new IllegalArgumentException("Geçersiz görev durumu");
        }

        return status;
    }

    private TaskPriority normalizePriority(TaskPriority priority) {
        if (priority == null) {
            return TaskPriority.MEDIUM;
        }

        return priority;
    }

    private void validateNewTaskDueDate(LocalDate dueDate) {
        if (dueDate != null && dueDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Son tarih bugün veya gelecek bir tarih olmalıdır");
        }
    }

    private void updateCompletedAt(Task task) {
        if ("TAMAMLANDI".equals(task.getStatus())) {
            if (task.getCompletedAt() == null) {
                task.setCompletedAt(LocalDateTime.now());
            }

            return;
        }

        task.setCompletedAt(null);
    }

    private TaskResponse convertToResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus(),
                task.getPriority(),
                task.getDueDate(),
                task.getCreatedAt(),
                task.getCompletedAt(),
                isOverdue(task),
                task.getProject() != null ? task.getProject().getId() : null,
                task.getProject() != null ? task.getProject().getProjectName() : null);
    }

    private boolean isOverdue(Task task) {
        return task.getDueDate() != null
                && task.getDueDate().isBefore(LocalDate.now())
                && !"TAMAMLANDI".equals(task.getStatus());
    }

}
