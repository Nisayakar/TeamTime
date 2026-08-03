package com.teamtime.service;

import com.teamtime.dto.DashboardDataResponse;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final TeamMemberRepository teamMemberRepository;

    public DashboardService(ProjectRepository projectRepository,
                            TaskRepository taskRepository,
                            TeamMemberRepository teamMemberRepository) {

        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.teamMemberRepository = teamMemberRepository;

    }

    public DashboardDataResponse getDashboardData(Long userId) {

        long projectCount = projectRepository.countByUserId(userId);
        long taskCount = taskRepository.countByProjectUserId(userId);
        long completedTaskCount = taskRepository.countByProjectUserIdAndStatus(userId, "TAMAMLANDI");
        long inProgressTaskCount = taskRepository.countByProjectUserIdAndStatus(userId, "DEVAM_EDIYOR");
        long teamCount = teamMemberRepository.countDistinctTeamsForUser(userId);

        return new DashboardDataResponse(projectCount, taskCount, completedTaskCount, inProgressTaskCount, teamCount);

    }

}
