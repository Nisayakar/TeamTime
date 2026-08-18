package com.teamtime.service;

import com.teamtime.dto.TaskRequest;
import com.teamtime.dto.TaskResponse;
import com.teamtime.entity.AssignmentStatus;
import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.TaskPriority;
import com.teamtime.exception.ConflictException;
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

import com.teamtime.repository.UserRepository;
import com.teamtime.repository.TaskAssignmentHistoryRepository;
import com.teamtime.entity.TaskAssignmentHistory;
import com.teamtime.entity.TaskAssignmentHistoryEventType;
import com.teamtime.entity.User;

@Service
public class TaskService {


    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final TaskAssignmentHistoryRepository taskAssignmentHistoryRepository;
    private final TaskAttachmentService taskAttachmentService;


    public TaskService(TaskRepository taskRepository,
                       ProjectRepository projectRepository,
                       TeamMemberRepository teamMemberRepository,
                       NotificationService notificationService,
                       UserRepository userRepository,
                       TaskAssignmentHistoryRepository taskAssignmentHistoryRepository,
                       TaskAttachmentService taskAttachmentService) {

        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.taskAssignmentHistoryRepository = taskAssignmentHistoryRepository;
        this.taskAttachmentService = taskAttachmentService;
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
        LocalDate today = LocalDate.now();

        return taskRepository.findUpcomingAccessibleTasks(userId, today, today.plusDays(7), PageRequest.of(0, 5))
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public List<TaskResponse> getTasksAssignedToMe(Long userId) {
        return taskRepository.findTasksAssignedToUser(userId)
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

        taskAttachmentService.deleteAttachmentsForTask(id);

        taskRepository.delete(existingTask);
    }

    @Transactional
    public TaskResponse assignTask(Long taskId, Long assignedUserId, Long currentUserId) {
        Task task = requireTask(taskId);
        Project project = task.getProject();

        requireTeamTaskMutationAccess(project, currentUserId);

        TeamMember targetMembership = teamMemberRepository.findByTeamIdAndUserId(project.getTeam().getId(), assignedUserId)
                .orElseThrow(() -> new AccessDeniedException("Atanacak kullanıcı bu takımın üyesi değil"));

        User previousAssignee = task.getAssignedUser();
        task.setAssignedUser(targetMembership.getUser());
        task.setRejectionReason(null);

        TaskAssignmentHistoryEventType type = previousAssignee == null ? TaskAssignmentHistoryEventType.ASSIGNED : TaskAssignmentHistoryEventType.REASSIGNED;

        if (assignedUserId.equals(currentUserId)) {
            task.setAssignmentStatus(AssignmentStatus.ACCEPTED);
            task.setAssignedAt(LocalDateTime.now());
            task.setRespondedAt(LocalDateTime.now());
            Task savedTask = taskRepository.save(task);
            
            recordHistory(savedTask, currentUserId, targetMembership.getUser(), type, null);
            recordHistory(savedTask, currentUserId, targetMembership.getUser(), TaskAssignmentHistoryEventType.ACCEPTED, null);
            
            return convertToResponse(savedTask);
        } else {
            task.setAssignmentStatus(AssignmentStatus.PENDING);
            task.setAssignedAt(LocalDateTime.now());
            task.setRespondedAt(null);
            
            Task savedTask = taskRepository.save(task);
            
            recordHistory(savedTask, currentUserId, targetMembership.getUser(), type, null);
            
            notificationService.notifyTaskAssigned(targetMembership.getUser(), savedTask.getProject().getTeam(), savedTask.getId(), savedTask.getTitle());
            return convertToResponse(savedTask);
        }
    }

    @Transactional
    public TaskResponse removeTaskAssignee(Long taskId, Long currentUserId) {
        Task task = requireTask(taskId);

        requireTeamTaskMutationAccess(task.getProject(), currentUserId);

        User previousAssignee = task.getAssignedUser();
        clearTaskAssignment(task);
        Task savedTask = taskRepository.save(task);

        recordHistory(savedTask, currentUserId, previousAssignee, TaskAssignmentHistoryEventType.UNASSIGNED, null);

        return convertToResponse(savedTask);
    }

    @Transactional
    public TaskResponse acceptAssignment(Long taskId, Long currentUserId) {
        Task task = requireTask(taskId);

        requireAssignedPendingTask(task, currentUserId);
        task.setAssignmentStatus(AssignmentStatus.ACCEPTED);
        task.setRejectionReason(null);
        task.setRespondedAt(LocalDateTime.now());

        Task savedTask = taskRepository.save(task);
        String responderName = "%s %s".formatted(savedTask.getAssignedUser().getName(), savedTask.getAssignedUser().getSurname()).trim();
        
        recordHistory(savedTask, currentUserId, savedTask.getAssignedUser(), TaskAssignmentHistoryEventType.ACCEPTED, null);
        
        notificationService.notifyTaskAssignmentAccepted(
                savedTask.getProject().getTeam(),
                savedTask.getId(),
                savedTask.getTitle(),
                responderName,
                currentUserId);

        return convertToResponse(savedTask);
    }

    @Transactional
    public TaskResponse rejectAssignment(Long taskId, String reason, Long currentUserId) {
        Task task = requireTask(taskId);
        String normalizedReason = normalizeRejectionReason(reason);

        requireAssignedPendingTask(task, currentUserId);
        task.setAssignmentStatus(AssignmentStatus.REJECTED);
        task.setRejectionReason(normalizedReason);
        task.setRespondedAt(LocalDateTime.now());

        Task savedTask = taskRepository.save(task);
        String responderName = "%s %s".formatted(savedTask.getAssignedUser().getName(), savedTask.getAssignedUser().getSurname()).trim();
        
        recordHistory(savedTask, currentUserId, savedTask.getAssignedUser(), TaskAssignmentHistoryEventType.REJECTED, normalizedReason);
        
        notificationService.notifyTaskAssignmentRejected(
                savedTask.getProject().getTeam(),
                savedTask.getId(),
                savedTask.getTitle(),
                responderName,
                normalizedReason,
                currentUserId);

        return convertToResponse(savedTask);
    }

    private void recordHistory(Task task, Long assignedById, User assignedTo, TaskAssignmentHistoryEventType eventType, String reason) {
        User assignedBy = assignedById != null ? userRepository.findById(assignedById).orElse(null) : null;
        TaskAssignmentHistory history = new TaskAssignmentHistory();
        history.setTask(task);
        history.setAssignedBy(assignedBy);
        history.setAssignedTo(assignedTo);
        history.setEventType(eventType);
        history.setReason(reason);
        history.setCreatedAt(LocalDateTime.now());
        taskAssignmentHistoryRepository.save(history);
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

    private void requireTeamTaskMutationAccess(Project project, Long userId) {
        if (project.getTeam() == null) {
            throw new IllegalArgumentException("Kişisel projelerde görev ataması yapılamaz");
        }

        requireTaskMutationAccess(project, userId);
    }

    private Task requireTask(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Görev bulunamadı veya bu görev için yetkiniz yok"));
    }

    private void requireAssignedPendingTask(Task task, Long currentUserId) {
        Project project = task.getProject();

        if (project.getTeam() == null) {
            throw new IllegalArgumentException("Kişisel projelerde görev ataması yapılamaz");
        }

        if (task.getAssignedUser() == null || !task.getAssignedUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("Bu görev size atanmamış");
        }

        teamMemberRepository.findByTeamIdAndUserId(project.getTeam().getId(), currentUserId)
                .orElseThrow(() -> new AccessDeniedException("Bu takımın artık üyesi değilsiniz, görevi kabul/red edemezsiniz"));

        if (task.getAssignmentStatus() != AssignmentStatus.PENDING) {
            throw new ConflictException("Bu görev ataması yanıt beklemiyor");
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

    private String normalizeRejectionReason(String reason) {
        String normalizedReason = reason == null ? "" : reason.trim();

        if (normalizedReason.isBlank()) {
            throw new IllegalArgumentException("Mazeret zorunludur");
        }

        if (normalizedReason.length() > 500) {
            throw new IllegalArgumentException("Mazeret en fazla 500 karakter olabilir");
        }

        return normalizedReason;
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
        var assignedUser = task.getAssignedUser();

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
                task.getProject() != null ? task.getProject().getProjectName() : null,
                assignedUser != null ? assignedUser.getId() : null,
                assignedUser != null ? "%s %s".formatted(assignedUser.getName(), assignedUser.getSurname()).trim() : null,
                task.getAssignmentStatus(),
                task.getRejectionReason(),
                task.getAssignedAt(),
                task.getRespondedAt());
    }

    private boolean isOverdue(Task task) {
        return task.getDueDate() != null
                && task.getDueDate().isBefore(LocalDate.now())
                && !"TAMAMLANDI".equals(task.getStatus());
    }

    @Transactional
    public void cleanupTasksForRemovedMember(Long teamId, Long userId) {
        // Find all tasks assigned to the removed user in projects belonging to the specified team
        List<Project> teamProjects = projectRepository.findByTeam_Id(teamId);
        if (teamProjects.isEmpty()) {
            return;
        }

        List<Task> tasksToClean = taskRepository.findByProjectIdInAndAssignedUserId(
                teamProjects.stream().map(Project::getId).toList(),
                userId
        );

        for (Task task : tasksToClean) {
            User previousAssignee = task.getAssignedUser();
            clearTaskAssignment(task);
            recordHistory(task, null, previousAssignee, TaskAssignmentHistoryEventType.UNASSIGNED, "Üye takımdan çıkarıldığı için atama kaldırıldı.");
        }
        
        taskRepository.saveAll(tasksToClean);
    }

    public List<com.teamtime.dto.TaskAssignmentHistoryResponse> getTaskAssignmentHistory(Long taskId, Long currentUserId) {
        Task task = requireTask(taskId);
        requireTaskViewAccess(task.getProject(), currentUserId);

        return taskAssignmentHistoryRepository.findByTaskIdOrderByCreatedAtDesc(taskId)
                .stream()
                .map(history -> {
                    User by = history.getAssignedBy();
                    User to = history.getAssignedTo();
                    String byName = by != null ? "%s %s".formatted(by.getName(), by.getSurname()).trim() : "Sistem";
                    String byUsername = by != null ? by.getUsername() : null;
                    String toName = to != null ? "%s %s".formatted(to.getName(), to.getSurname()).trim() : null;
                    String toUsername = to != null ? to.getUsername() : null;

                    return new com.teamtime.dto.TaskAssignmentHistoryResponse(
                            history.getId(),
                            history.getTask().getId(),
                            by != null ? by.getId() : null,
                            byName,
                            byUsername,
                            to != null ? to.getId() : null,
                            toName,
                            toUsername,
                            history.getEventType(),
                            history.getReason(),
                            history.getCreatedAt()
                    );
                })
                .toList();
    }

    private void clearTaskAssignment(Task task) {
        task.setAssignedUser(null);
        task.setAssignmentStatus(AssignmentStatus.UNASSIGNED);
        task.setRejectionReason(null);
        task.setAssignedAt(null);
        task.setRespondedAt(null);
    }
}
