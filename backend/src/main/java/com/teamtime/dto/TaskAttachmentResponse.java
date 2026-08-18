package com.teamtime.dto;

import java.time.LocalDateTime;

public class TaskAttachmentResponse {
    private Long id;
    private Long taskId;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private LocalDateTime createdAt;

    public TaskAttachmentResponse() {}

    public TaskAttachmentResponse(Long id, Long taskId, String fileName, String contentType, Long fileSize, LocalDateTime createdAt) {
        this.id = id;
        this.taskId = taskId;
        this.fileName = fileName;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTaskId() { return taskId; }
    public void setTaskId(Long taskId) { this.taskId = taskId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
