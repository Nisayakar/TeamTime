package com.teamtime.service;

import org.springframework.stereotype.Service;

import com.teamtime.dto.ProjectRequest;
import com.teamtime.entity.Project;
import com.teamtime.repository.ProjectRepository;
import java.util.List;

@Service
public class ProjectService {
    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
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

    public String deleteProject(Long id) {
        projectRepository.deleteById(id);
        return "Proje başarıyla silindi";
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public Project getProject(Long id) {

        return projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proje bulunamadı"));

    }

}
