package com.teamtime.dto;

public class DashboardDataResponse {

    private long projectCount;
    private long taskCount;
    private long completedTaskCount;
    private long inProgressTaskCount;

    public DashboardDataResponse() {
    }

    public DashboardDataResponse(long projectCount, long taskCount, long completedTaskCount, long inProgressTaskCount) {
        this.projectCount = projectCount;
        this.taskCount = taskCount;
        this.completedTaskCount = completedTaskCount;
        this.inProgressTaskCount = inProgressTaskCount;
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
}