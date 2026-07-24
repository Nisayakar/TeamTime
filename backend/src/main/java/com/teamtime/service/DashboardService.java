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

    public DashboardDataResponse getDashboardData(Long userId) {

        long projectCount = projectRepository.countByUserId(userId);
        long taskCount = taskRepository.countByProjectUserId(userId);
        long completedTaskCount = taskRepository.countByProjectUserIdAndStatus(userId, "TAMAMLANDI");
        long inProgressTaskCount = taskRepository.countByProjectUserIdAndStatus(userId, "DEVAM_EDIYOR");

        return new DashboardDataResponse(projectCount, taskCount, completedTaskCount, inProgressTaskCount);

    }

}
