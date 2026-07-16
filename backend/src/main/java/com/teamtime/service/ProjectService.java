package com.teamtime.service;

import org.springframework.stereotype.Service;

import com.teamtime.dto.ProjectRequest;
import com.teamtime.entity.Project;
import com.teamtime.repository.ProjectRepository;

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

}
