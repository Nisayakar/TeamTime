package com.teamtime.controller;

import com.teamtime.entity.Task;
import com.teamtime.service.TaskService;
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
    public ResponseEntity<?> createTask(
            @RequestBody Task task,
            @PathVariable Long projectId,
            Authentication authentication) {

        try {

            Long userId = (Long) authentication.getPrincipal();
            Task createdTask = taskService.createTask(task, projectId, userId);

            return ResponseEntity.ok(createdTask);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());

        }

    }

    @GetMapping("/project/{projectId}")
    public List<Task> getTasksByProject(
            @PathVariable Long projectId,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.getTasksByProject(projectId, userId);

    }

    @GetMapping("/recent")
    public List<Task> getRecentTasks(Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.getRecentTasks(userId);

    }

    @PutMapping("/{id}")
    public String updateTask(
            @PathVariable Long id,
            @RequestBody Task task,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        taskService.updateTask(id, task, userId);

        return "Görev başarıyla güncellendi";

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
