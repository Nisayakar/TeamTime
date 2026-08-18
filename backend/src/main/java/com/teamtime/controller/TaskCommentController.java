package com.teamtime.controller;

import com.teamtime.dto.TaskCommentRequest;
import com.teamtime.dto.TaskCommentResponse;
import com.teamtime.service.TaskCommentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TaskCommentController {

    private final TaskCommentService commentService;

    public TaskCommentController(TaskCommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<TaskCommentResponse> createComment(
            @PathVariable Long taskId,
            @RequestBody TaskCommentRequest request,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(commentService.createComment(taskId, request.getContent(), currentUserId));
    }

    @GetMapping("/tasks/{taskId}/comments")
    public ResponseEntity<List<TaskCommentResponse>> getComments(
            @PathVariable Long taskId,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(commentService.getComments(taskId, currentUserId));
    }

    @DeleteMapping("/tasks/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        commentService.deleteComment(commentId, currentUserId);
        return ResponseEntity.noContent().build();
    }
}
