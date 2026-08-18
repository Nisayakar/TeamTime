package com.teamtime.service;

import org.springframework.stereotype.Service;

import com.teamtime.dto.ProjectRequest;
import com.teamtime.dto.ProjectResponse;
import com.teamtime.entity.Project;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.entity.Task;
import com.teamtime.entity.User;
import com.teamtime.exception.ConflictException;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import com.teamtime.repository.TeamRepository;
import com.teamtime.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectService {
    private static final int RECENT_PROJECT_LIMIT = 5;

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final NotificationService notificationService;
    private final TaskAttachmentService taskAttachmentService;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository, UserRepository userRepository,
            TeamRepository teamRepository, TeamMemberRepository teamMemberRepository, NotificationService notificationService,
            TaskAttachmentService taskAttachmentService) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.notificationService = notificationService;
        this.taskAttachmentService = taskAttachmentService;
    }

    @Transactional
    public String createProject(ProjectRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        Project project = new Project();

        project.setProjectName(request.getProjectName());
        project.setDescription(request.getDescription());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        project.setUser(user);

        if (request.getTeamId() != null) {
            Team team = teamRepository.findById(request.getTeamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Takım bulunamadı"));
            requireTeamProjectManager(team.getId(), userId);
            project.setTeam(team);
        } else {
            project.setTeam(null);
        }

        Project savedProject = projectRepository.save(project);

        if (savedProject.getTeam() != null) {
            notificationService.notifyTeamProjectCreated(
                    savedProject.getTeam(),
                    savedProject.getId(),
                    savedProject.getProjectName(),
                    userId);
        }

        return "Proje başarıyla oluşturuldu";

    }

    @Transactional
    public String updateProject(Long id, ProjectRequest request, Long userId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proje bulunamadı"));
        requireProjectManager(project, userId);

        if (request.getTeamId() != null && !request.getTeamId().equals(project.getTeamId())) {
            throw new ConflictException("Projenin takım bağlantısı güncelleme sırasında değiştirilemez");
        }

        if (request.getProjectName() != null) {
            project.setProjectName(request.getProjectName());
        }

        if (request.getDescription() != null && !request.getDescription().isEmpty()) {
            project.setDescription(request.getDescription());
        }

        if (request.getStartDate() != null) {
            project.setStartDate(request.getStartDate());
        }

        if (request.getEndDate() != null) {
            project.setEndDate(request.getEndDate());
        }

        projectRepository.save(project);

        return "Proje başarıyla güncellendi";
    }

    @Transactional
    public String deleteProject(Long id, Long userId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proje bulunamadı"));
        requireProjectOwner(project, userId);

        List<Task> projectTasks = taskRepository.findByProjectId(id);
        for (Task task : projectTasks) {
            taskAttachmentService.deleteAttachmentsForTask(task.getId());
        }

        taskRepository.deleteByProjectId(id);
        projectRepository.delete(project);
        return "Proje başarıyla silindi";
    }

    public List<ProjectResponse> getAllProjects(Long userId) {
        return toResponseList(projectRepository.findAccessibleProjects(userId));
    }

    public List<ProjectResponse> getRecentProjects(Long userId) {
        return toResponseList(projectRepository.findRecentAccessibleProjects(userId, PageRequest.of(0, RECENT_PROJECT_LIMIT)));
    }

    public ProjectResponse getProject(Long id, Long userId) {

        Project project = projectRepository.findAccessibleProjectById(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Proje bulunamadı veya bu proje için yetkiniz yok"));

        return toResponse(project);

    }

    private void requireProjectOwner(Project project, Long userId) {
        if (project.getTeam() == null) {
            if (!project.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Proje bulunamadı veya bu proje için yetkiniz yok");
            }
            return;
        }

        TeamRole role = getMembershipRole(project.getTeam().getId(), userId);
        if (role != TeamRole.OWNER) {
            throw new AccessDeniedException("Takım projesini silme yetkiniz yok");
        }
    }

    private void requireProjectManager(Project project, Long userId) {
        if (project.getTeam() == null) {
            if (!project.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Proje bulunamadı veya bu proje için yetkiniz yok");
            }

            return;
        }

        requireTeamProjectManager(project.getTeam().getId(), userId);
    }

    private void requireTeamProjectMember(Long teamId, Long userId) {
        getMembershipRole(teamId, userId); // Throws AccessDeniedException if not a member
    }

    private void requireTeamProjectManager(Long teamId, Long userId) {
        TeamRole role = getMembershipRole(teamId, userId);

        if (role != TeamRole.OWNER && role != TeamRole.ADMIN) {
            throw new AccessDeniedException("Takım projesini yönetme yetkiniz yok");
        }
    }

    private TeamRole getMembershipRole(Long teamId, Long userId) {
        TeamMember membership = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new AccessDeniedException("Bu takım için yetkiniz yok"));

        return TeamRole.from(membership.getRole());
    }

    public ProjectResponse toResponse(Project project) {
        List<Task> tasks = taskRepository.findByProjectId(project.getId());
        int progress = 0;
        if (!tasks.isEmpty()) {
            long completedCount = tasks.stream().filter(t -> "TAMAMLANDI".equals(t.getStatus())).count();
            progress = (int) Math.round((double) completedCount / tasks.size() * 100);
        }

        return new ProjectResponse(
                project.getId(),
                project.getProjectName(),
                project.getDescription(),
                project.getStartDate(),
                project.getEndDate(),
                project.getTeamId(),
                project.getTeamName(),
                project.isTeamProject(),
                progress);
    }

    private List<ProjectResponse> toResponseList(List<Project> projects) {
        return projects.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

}
