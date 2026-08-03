package com.teamtime.dto;

public class DashboardDataResponse {

    private long projectCount;
    private long taskCount;
    private long completedTaskCount;
    private long inProgressTaskCount;
    private long teamCount;
    private long overdueTaskCount;
    private long dueTodayTaskCount;
    private long upcomingTaskCount;

    public DashboardDataResponse() {
    }

    public DashboardDataResponse(long projectCount, long taskCount, long completedTaskCount, long inProgressTaskCount) {
        this.projectCount = projectCount;
        this.taskCount = taskCount;
        this.completedTaskCount = completedTaskCount;
        this.inProgressTaskCount = inProgressTaskCount;
    }

    public DashboardDataResponse(long projectCount, long taskCount, long completedTaskCount, long inProgressTaskCount,
            long teamCount) {
        this.projectCount = projectCount;
        this.taskCount = taskCount;
        this.completedTaskCount = completedTaskCount;
        this.inProgressTaskCount = inProgressTaskCount;
        this.teamCount = teamCount;
    }

    public DashboardDataResponse(long projectCount, long taskCount, long completedTaskCount, long inProgressTaskCount,
            long teamCount, long overdueTaskCount, long dueTodayTaskCount, long upcomingTaskCount) {
        this.projectCount = projectCount;
        this.taskCount = taskCount;
        this.completedTaskCount = completedTaskCount;
        this.inProgressTaskCount = inProgressTaskCount;
        this.teamCount = teamCount;
        this.overdueTaskCount = overdueTaskCount;
        this.dueTodayTaskCount = dueTodayTaskCount;
        this.upcomingTaskCount = upcomingTaskCount;
    }

    public long getProjectCount() {
        return projectCount;
    }

    public void setProjectCount(long projectCount) {
        this.projectCount = projectCount;
    }

    public long getTaskCount() {
        return taskCount;
    }

    public void setTaskCount(long taskCount) {
        this.taskCount = taskCount;
    }

    public long getCompletedTaskCount() {
        return completedTaskCount;
    }

    public void setCompletedTaskCount(long completedTaskCount) {
        this.completedTaskCount = completedTaskCount;
    }

    public long getInProgressTaskCount() {
        return inProgressTaskCount;
    }

    public void setInProgressTaskCount(long inProgressTaskCount) {
        this.inProgressTaskCount = inProgressTaskCount;
    }

    public long getTeamCount() {
        return teamCount;
    }

    public void setTeamCount(long teamCount) {
        this.teamCount = teamCount;
    }

    public long getOverdueTaskCount() {
        return overdueTaskCount;
    }

    public void setOverdueTaskCount(long overdueTaskCount) {
        this.overdueTaskCount = overdueTaskCount;
    }

    public long getDueTodayTaskCount() {
        return dueTodayTaskCount;
    }

    public void setDueTodayTaskCount(long dueTodayTaskCount) {
        this.dueTodayTaskCount = dueTodayTaskCount;
    }

    public long getUpcomingTaskCount() {
        return upcomingTaskCount;
    }

    public void setUpcomingTaskCount(long upcomingTaskCount) {
        this.upcomingTaskCount = upcomingTaskCount;
    }
}
