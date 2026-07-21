package com.teamtime.service;

import com.teamtime.dto.DashboardDataResponse;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    public DashboardService(ProjectRepository projectRepository,
                            TaskRepository taskRepository) {

        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;

    }

    public DashboardDataResponse getDashboardData() {

        long projectCount = projectRepository.count();
        long taskCount = taskRepository.count();
        long completedTaskCount = taskRepository.countByStatus("COMPLETED");
        long inProgressTaskCount = taskRepository.countByStatus("IN_PROGRESS");

        return new DashboardDataResponse(projectCount, taskCount, completedTaskCount, inProgressTaskCount);

    }

}
