package com.teamtime.controller;

import com.teamtime.dto.TaskAttachmentResponse;
import com.teamtime.entity.TaskAttachment;
import com.teamtime.service.TaskAttachmentService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskAttachmentController {

    private final TaskAttachmentService taskAttachmentService;

    public TaskAttachmentController(TaskAttachmentService taskAttachmentService) {
        this.taskAttachmentService = taskAttachmentService;
    }

    @PostMapping("/{taskId}/attachments")
    public ResponseEntity<TaskAttachmentResponse> uploadAttachment(
            @PathVariable Long taskId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Long userId
    ) throws IOException {
        TaskAttachmentResponse response = taskAttachmentService.uploadAttachment(taskId, file, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{taskId}/attachments")
    public ResponseEntity<List<TaskAttachmentResponse>> getAttachments(
            @PathVariable Long taskId,
            @AuthenticationPrincipal Long userId
    ) {
        List<TaskAttachmentResponse> response = taskAttachmentService.getAttachments(taskId, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long attachmentId,
            @AuthenticationPrincipal Long userId
    ) {
        TaskAttachment attachment = taskAttachmentService.getAttachmentForDownload(attachmentId, userId);
        Resource resource = new FileSystemResource(Paths.get(attachment.getFilePath()));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getFileName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable Long attachmentId,
            @AuthenticationPrincipal Long userId
    ) {
        taskAttachmentService.deleteAttachment(attachmentId, userId);
        return ResponseEntity.noContent().build();
    }
}
