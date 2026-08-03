package com.teamtime.service;

import org.springframework.stereotype.Service;

import com.teamtime.dto.ProjectRequest;
import com.teamtime.entity.Project;
import com.teamtime.entity.Team;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
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

import java.util.List;

@Service
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository, UserRepository userRepository,
            TeamRepository teamRepository, TeamMemberRepository teamMemberRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
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

        projectRepository.save(project);

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
        requireProjectManager(project, userId);

        taskRepository.deleteByProjectId(id);
        projectRepository.delete(project);
        return "Proje başarıyla silindi";
    }

    public List<Project> getAllProjects(Long userId) {
        return projectRepository.findAccessibleProjects(userId);
    }

    public List<Project> getRecentProjects(Long userId) {
        return projectRepository.findAccessibleProjects(userId);
    }

    public Project getProject(Long id, Long userId) {

        return projectRepository.findAccessibleProjectById(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Proje bulunamadı veya bu proje için yetkiniz yok"));

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

}
