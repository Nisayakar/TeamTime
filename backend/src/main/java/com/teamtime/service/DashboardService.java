package com.teamtime.service;

import com.teamtime.dto.DashboardDataResponse;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

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

        long projectCount = projectRepository.countAccessibleProjects(userId);
        long taskCount = taskRepository.countAccessibleTasks(userId);
        long completedTaskCount = taskRepository.countAccessibleTasksByStatus(userId, "TAMAMLANDI");
        long inProgressTaskCount = taskRepository.countAccessibleTasksByStatus(userId, "DEVAM_EDIYOR");
        long teamCount = teamMemberRepository.countDistinctTeamsForUser(userId);
        LocalDate today = LocalDate.now();
        long overdueTaskCount = taskRepository.countAccessibleOverdueTasks(userId, today);
        long dueTodayTaskCount = taskRepository.countAccessibleDueTodayTasks(userId, today);
        long upcomingTaskCount = taskRepository.countAccessibleUpcomingTasks(userId, today);

        return new DashboardDataResponse(
                projectCount,
                taskCount,
                completedTaskCount,
                inProgressTaskCount,
                teamCount,
                overdueTaskCount,
                dueTodayTaskCount,
                upcomingTaskCount);

    }

}
