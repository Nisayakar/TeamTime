package com.teamtime.controller;

import com.teamtime.dto.TaskRequest;
import com.teamtime.dto.TaskResponse;
import com.teamtime.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:5173")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {

        this.taskService = taskService;

    }

    @PostMapping("/{projectId}")
    public ResponseEntity<TaskResponse> createTask(
            @Valid @RequestBody TaskRequest task,
            @PathVariable Long projectId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        TaskResponse createdTask = taskService.createTask(task, projectId, userId);

        return ResponseEntity.ok(createdTask);

    }

    @GetMapping("/project/{projectId}")
    public List<TaskResponse> getTasksByProject(
            @PathVariable Long projectId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.getTasksByProject(projectId, userId);

    }

    @GetMapping("/recent")
    public List<TaskResponse> getRecentTasks(Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.getRecentTasks(userId);

    }

    @PutMapping("/{id}")
    public TaskResponse updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskRequest task,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.updateTask(id, task, userId);

    }

    @DeleteMapping("/{id}")
    public String deleteTask(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        taskService.deleteTask(id, userId);

        return "Görev silindi";

    }

}
