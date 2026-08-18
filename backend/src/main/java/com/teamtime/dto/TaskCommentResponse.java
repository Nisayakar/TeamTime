package com.teamtime.dto;

import java.time.LocalDateTime;

public class TaskCommentResponse {
    private Long id;
    private Long taskId;
    private Long authorId;
    private String authorName;
    private String authorUsername;
    private String content;
    private LocalDateTime createdAt;

    public TaskCommentResponse() {}

    public TaskCommentResponse(Long id, Long taskId, Long authorId, String authorName, String authorUsername, String content, LocalDateTime createdAt) {
        this.id = id;
        this.taskId = taskId;
        this.authorId = authorId;
        this.authorName = authorName;
        this.authorUsername = authorUsername;
        this.content = content;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTaskId() { return taskId; }
    public void setTaskId(Long taskId) { this.taskId = taskId; }

    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getAuthorUsername() { return authorUsername; }
    public void setAuthorUsername(String authorUsername) { this.authorUsername = authorUsername; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
