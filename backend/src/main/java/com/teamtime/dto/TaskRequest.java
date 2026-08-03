package com.teamtime.dto;

import com.teamtime.entity.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class TaskRequest {

    @NotBlank(message = "Görev başlığı zorunludur")
    @Size(max = 160, message = "Görev başlığı en fazla 160 karakter olabilir")
    private String title;

    @Size(max = 1000, message = "Açıklama en fazla 1000 karakter olabilir")
    private String description;

    private String status;

    private TaskPriority priority;

    private LocalDate dueDate;

    public TaskRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }
}
