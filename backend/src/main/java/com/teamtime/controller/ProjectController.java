package com.teamtime.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

import com.teamtime.dto.ProjectRequest;
import com.teamtime.service.ProjectService;
import java.util.List;
import com.teamtime.entity.Project;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class ProjectController {
    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping("/projects")
    public String createProject(@RequestBody ProjectRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return projectService.createProject(request, userId);
    }

    @GetMapping("/projects")
    public List<Project> getProjects(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return projectService.getAllProjects(userId);
    }

    @GetMapping("/projects/recent")
    public List<Project> getRecentProjects(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return projectService.getRecentProjects(userId);
    }

    @DeleteMapping("/projects/{id}")
    public String deleteProject(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return projectService.deleteProject(id, userId);
    }

    @PutMapping("/projects/{id}")
    public String updateProject(@PathVariable Long id,
            @RequestBody ProjectRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return projectService.updateProject(id, request, userId);
    }

    @GetMapping("/projects/{id}")
    public Project getProject(@PathVariable Long id, Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return projectService.getProject(id, userId);

    }
}
