package com.teamtime.service;

import org.springframework.stereotype.Service;

import com.teamtime.dto.ProjectRequest;
import com.teamtime.entity.Project;
import com.teamtime.entity.User;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.UserRepository;
import jakarta.transaction.Transactional;

import java.util.List;

@Service
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public String createProject(ProjectRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));

        Project project = new Project();

        project.setProjectName(request.getProjectName());
        project.setDescription(request.getDescription());
        project.setTeamName(request.getTeamName());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        project.setUser(user);

        projectRepository.save(project);

        return "Proje başarıyla oluşturuldu";

    }

    public String updateProject(Long id, ProjectRequest request, Long userId) {
        Project project = findProjectForUser(id, userId);

        if (request.getProjectName() != null) {
            project.setProjectName(request.getProjectName());
        }

        if (request.getDescription() != null && !request.getDescription().isEmpty()) {
            project.setDescription(request.getDescription());
        }

        if (request.getTeamName() != null && !request.getTeamName().isEmpty()) {
            project.setTeamName(request.getTeamName());
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
        Project project = findProjectForUser(id, userId);

        taskRepository.deleteByProjectIdAndProjectUserId(id, userId);
        projectRepository.delete(project);
        return "Proje başarıyla silindi";
    }

    public List<Project> getAllProjects(Long userId) {
        return projectRepository.findByUserId(userId);
    }

    public List<Project> getRecentProjects(Long userId) {
        return projectRepository.findAllByUserIdOrderByIdDesc(userId);
    }

    public Project getProject(Long id, Long userId) {

        return findProjectForUser(id, userId);

    }

    private Project findProjectForUser(Long id, Long userId) {
        return projectRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Proje bulunamadı veya bu proje için yetkiniz yok"));
    }

}
