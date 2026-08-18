package com.teamtime.controller;

import com.teamtime.dto.AssignTaskRequest;
import com.teamtime.dto.RejectTaskAssignmentRequest;
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

    @GetMapping("/upcoming")
    public List<TaskResponse> getUpcomingTasks(Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.getUpcomingTasks(userId);

    }

    @GetMapping("/my")
    public List<TaskResponse> getTasksAssignedToMe(Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.getTasksAssignedToMe(userId);

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

    @PutMapping("/{id}/assignee")
    public TaskResponse assignTask(
            @PathVariable Long id,
            @Valid @RequestBody AssignTaskRequest request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.assignTask(id, request.getUserId(), userId);
    }

    @DeleteMapping("/{id}/assignee")
    public TaskResponse removeTaskAssignee(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.removeTaskAssignee(id, userId);
    }

    @PostMapping("/{id}/assignment/accept")
    public TaskResponse acceptAssignment(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.acceptAssignment(id, userId);
    }

    @PostMapping("/{id}/assignment/reject")
    public TaskResponse rejectAssignment(
            @PathVariable Long id,
            @Valid @RequestBody RejectTaskAssignmentRequest request,
            Authentication authentication) {

        Long userId = (Long) authentication.getPrincipal();
        return taskService.rejectAssignment(id, request.getReason(), userId);
    }
    @GetMapping("/{id}/assignment-history")
    public ResponseEntity<List<com.teamtime.dto.TaskAssignmentHistoryResponse>> getTaskAssignmentHistory(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(taskService.getTaskAssignmentHistory(id, userId));
    }
}
