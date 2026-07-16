package com.teamtime.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.teamtime.dto.ProjectRequest;
import com.teamtime.service.ProjectService;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class ProjectController {
    private final ProjectService projectService;
    
    public ProjectController(ProjectService projectService){
        this.projectService=projectService;
    }

    @PostMapping("/projects")
    public String createProject(@RequestBody ProjectRequest request){
        return projectService.createProject(request);
    }
}
