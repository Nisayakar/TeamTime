package com.teamtime.service;

import org.springframework.stereotype.Service;

import com.teamtime.dto.ProjectRequest;
import com.teamtime.entity.Project;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import jakarta.transaction.Transactional;

import java.util.List;

@Service
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
    }

    public String createProject(ProjectRequest request) {
        Project project = new Project();

        project.setProjectName(request.getProjectName());
        project.setDescription(request.getDescription());
        project.setTeamName(request.getTeamName());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());

        projectRepository.save(project);

        return "Proje başarıyla oluşturuldu";

    }

    public String updateProject(Long id, ProjectRequest request) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proje Bulunamadı"));

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
    public String deleteProject(Long id) {
        if (!projectRepository.existsById(id)) {
            throw new RuntimeException("Proje Bulunamadı");
        }

        taskRepository.deleteByProjectId(id);
        projectRepository.deleteById(id);
        return "Proje başarıyla silindi";
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public List<Project> getRecentProjects() {
        return projectRepository.findAllByOrderByIdDesc();
    }

    public Project getProject(Long id) {

        return projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proje bulunamadı"));

    }

}
