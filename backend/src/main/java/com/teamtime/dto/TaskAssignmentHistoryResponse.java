package com.teamtime.dto;

import com.teamtime.entity.TaskAssignmentHistoryEventType;
import java.time.LocalDateTime;

public class TaskAssignmentHistoryResponse {
    private Long id;
    private Long taskId;
    private Long assignedById;
    private String assignedByName;
    private String assignedByUsername;
    private Long assignedToId;
    private String assignedToName;
    private String assignedToUsername;
    private TaskAssignmentHistoryEventType eventType;
    private String reason;
    private LocalDateTime createdAt;

    public TaskAssignmentHistoryResponse() {}

    public TaskAssignmentHistoryResponse(Long id, Long taskId, Long assignedById, String assignedByName, String assignedByUsername,
                                         Long assignedToId, String assignedToName, String assignedToUsername,
                                         TaskAssignmentHistoryEventType eventType, String reason, LocalDateTime createdAt) {
        this.id = id;
        this.taskId = taskId;
        this.assignedById = assignedById;
        this.assignedByName = assignedByName;
        this.assignedByUsername = assignedByUsername;
        this.assignedToId = assignedToId;
        this.assignedToName = assignedToName;
        this.assignedToUsername = assignedToUsername;
        this.eventType = eventType;
        this.reason = reason;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTaskId() { return taskId; }
    public void setTaskId(Long taskId) { this.taskId = taskId; }

    public Long getAssignedById() { return assignedById; }
    public void setAssignedById(Long assignedById) { this.assignedById = assignedById; }

    public String getAssignedByName() { return assignedByName; }
    public void setAssignedByName(String assignedByName) { this.assignedByName = assignedByName; }

    public String getAssignedByUsername() { return assignedByUsername; }
    public void setAssignedByUsername(String assignedByUsername) { this.assignedByUsername = assignedByUsername; }

    public Long getAssignedToId() { return assignedToId; }
    public void setAssignedToId(Long assignedToId) { this.assignedToId = assignedToId; }

    public String getAssignedToName() { return assignedToName; }
    public void setAssignedToName(String assignedToName) { this.assignedToName = assignedToName; }

    public String getAssignedToUsername() { return assignedToUsername; }
    public void setAssignedToUsername(String assignedToUsername) { this.assignedToUsername = assignedToUsername; }

    public TaskAssignmentHistoryEventType getEventType() { return eventType; }
    public void setEventType(TaskAssignmentHistoryEventType eventType) { this.eventType = eventType; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
