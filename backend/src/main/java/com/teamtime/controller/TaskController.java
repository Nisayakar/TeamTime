package com.teamtime.controller;

import com.teamtime.entity.Task;
import com.teamtime.service.TaskService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.http.ResponseEntity;

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
            @PathVariable Long projectId) {

        try {

            Task createdTask = taskService.createTask(task, projectId);

            return ResponseEntity.ok(createdTask);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());

        }

    }

    @GetMapping("/project/{projectId}")
    public List<Task> getTasksByProject(
            @PathVariable Long projectId) {

        return taskService.getTasksByProject(projectId);

    }

    @GetMapping("/recent")
    public List<Task> getRecentTasks() {

        return taskService.getRecentTasks();

    }

    @PutMapping("/{id}")
    public String updateTask(
            @PathVariable Long id,
            @RequestBody Task task) {

        taskService.updateTask(id, task);

        return "Görev başarıyla güncellendi";

    }

    @DeleteMapping("/{id}")
    public String deleteTask(
            @PathVariable Long id) {

        taskService.deleteTask(id);

        return "Görev silindi";

    }

}
