package com.teamtime.dto;

import java.time.LocalDate;

public class ProjectResponse {

    private Long id;
    private String projectName;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long teamId;
    private String teamName;
    private boolean teamProject;
    private int progress;

    public ProjectResponse() {
    }

    public ProjectResponse(
            Long id,
            String projectName,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            Long teamId,
            String teamName,
            boolean teamProject
    ) {
        this(id, projectName, description, startDate, endDate, teamId, teamName, teamProject, 0);
    }

    public ProjectResponse(
            Long id,
            String projectName,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            Long teamId,
            String teamName,
            boolean teamProject,
            int progress
    ) {
        this.id = id;
        this.projectName = projectName;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.teamId = teamId;
        this.teamName = teamName;
        this.teamProject = teamProject;
        this.progress = progress;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Long getTeamId() {
        return teamId;
    }

    public void setTeamId(Long teamId) {
        this.teamId = teamId;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public boolean isTeamProject() {
        return teamProject;
    }

    public void setTeamProject(boolean teamProject) {
        this.teamProject = teamProject;
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }
}
