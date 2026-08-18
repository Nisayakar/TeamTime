package com.teamtime.service;

import com.teamtime.dto.TaskAttachmentResponse;
import com.teamtime.entity.*;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.TaskAttachmentRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class TaskAttachmentService {

    private final TaskRepository taskRepository;
    private final TaskAttachmentRepository taskAttachmentRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final String uploadDir;
    private final long maxFileSizeBytes;

    public TaskAttachmentService(
            TaskRepository taskRepository,
            TaskAttachmentRepository taskAttachmentRepository,
            TeamMemberRepository teamMemberRepository,
            @Value("${app.upload.dir:uploads}") String uploadDir,
            @Value("${spring.servlet.multipart.max-file-size:5MB}") DataSize maxFileSize
    ) {
        this.taskRepository = taskRepository;
        this.taskAttachmentRepository = taskAttachmentRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.uploadDir = uploadDir;
        this.maxFileSizeBytes = maxFileSize.toBytes();
    }

    @Transactional
    public TaskAttachmentResponse uploadAttachment(Long taskId, MultipartFile file, Long userId) throws IOException {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Görev bulunamadı"));

        requireProjectAccess(task.getProject(), userId);

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Boş dosya yüklenemez");
        }

        if (file.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("Dosya en fazla " + (maxFileSizeBytes / 1024 / 1024) + " MB olabilir.");
        }

        byte[] bytes = file.getBytes();
        String detectedMimeType = detectMimeType(bytes);

        if (detectedMimeType == null) {
            throw new IllegalArgumentException("Geçersiz dosya formatı. Sadece PDF, JPEG, PNG ve WEBP formatları desteklenmektedir.");
        }

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        String extension = getExtension(file.getOriginalFilename(), detectedMimeType);
        String uniqueFileName = UUID.randomUUID().toString() + extension;
        Path targetLocation = uploadPath.resolve(uniqueFileName);

        Files.write(targetLocation, bytes);

        TaskAttachment attachment = new TaskAttachment();
        attachment.setTask(task);
        attachment.setFileName(file.getOriginalFilename());
        attachment.setFilePath(targetLocation.toString());
        attachment.setContentType(detectedMimeType);
        attachment.setFileSize(file.getSize());
        attachment.setCreatedAt(LocalDateTime.now());

        TaskAttachment saved = taskAttachmentRepository.save(attachment);

        return convertToResponse(saved);
    }

    public List<TaskAttachmentResponse> getAttachments(Long taskId, Long userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Görev bulunamadı"));

        requireProjectAccess(task.getProject(), userId);

        return taskAttachmentRepository.findByTaskId(taskId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public TaskAttachment getAttachmentForDownload(Long attachmentId, Long userId) {
        TaskAttachment attachment = taskAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Dosya bulunamadı"));

        requireProjectAccess(attachment.getTask().getProject(), userId);

        return attachment;
    }

    @Transactional
    public void deleteAttachment(Long attachmentId, Long userId) {
        TaskAttachment attachment = taskAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Dosya bulunamadı"));

        requireProjectAccess(attachment.getTask().getProject(), userId);

        try {
            Files.deleteIfExists(Paths.get(attachment.getFilePath()));
        } catch (IOException e) {
            // Ignored
        }

        taskAttachmentRepository.delete(attachment);
    }

    @Transactional
    public void deleteAttachmentsForTask(Long taskId) {
        List<TaskAttachment> attachments = taskAttachmentRepository.findByTaskId(taskId);
        for (TaskAttachment attachment : attachments) {
            try {
                Files.deleteIfExists(Paths.get(attachment.getFilePath()));
            } catch (IOException e) {
                // Ignored
            }
        }
        taskAttachmentRepository.deleteAll(attachments);
    }

    private void requireProjectAccess(Project project, Long userId) {
        if (project.getTeam() == null) {
            if (!project.getUser().getId().equals(userId)) {
                throw new AccessDeniedException("Bu proje için yetkiniz yok");
            }
        } else {
            boolean isMember = teamMemberRepository.findByTeamIdAndUserId(project.getTeam().getId(), userId).isPresent();
            if (!isMember) {
                throw new AccessDeniedException("Bu takım projesi için yetkiniz yok");
            }
        }
    }

    private String detectMimeType(byte[] bytes) {
        if (bytes == null || bytes.length < 4) {
            return null;
        }

        if (bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x4E && bytes[3] == (byte) 0x47) {
            return "image/png";
        }

        if (bytes[0] == (byte) 0x25 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x44 && bytes[3] == (byte) 0x46) {
            return "application/pdf";
        }

        if (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF) {
            return "image/jpeg";
        }

        if (bytes.length >= 12 &&
            bytes[0] == (byte) 0x52 && bytes[1] == (byte) 0x49 && bytes[2] == (byte) 0x46 && bytes[3] == (byte) 0x46 &&
            bytes[8] == (byte) 0x57 && bytes[9] == (byte) 0x45 && bytes[10] == (byte) 0x42 && bytes[11] == (byte) 0x50) {
            return "image/webp";
        }

        return null;
    }

    private String getExtension(String originalFilename, String detectedMimeType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            String ext = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            if (ext.equals(".png") && "image/png".equals(detectedMimeType)) return ".png";
            if ((ext.equals(".jpg") || ext.equals(".jpeg")) && "image/jpeg".equals(detectedMimeType)) return ext;
            if (ext.equals(".pdf") && "application/pdf".equals(detectedMimeType)) return ".pdf";
            if (ext.equals(".webp") && "image/webp".equals(detectedMimeType)) return ".webp";
        }
        
        return switch (detectedMimeType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "application/pdf" -> ".pdf";
            case "image/webp" -> ".webp";
            default -> "";
        };
    }

    private TaskAttachmentResponse convertToResponse(TaskAttachment attachment) {
        return new TaskAttachmentResponse(
                attachment.getId(),
                attachment.getTask().getId(),
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getFileSize(),
                attachment.getCreatedAt()
        );
    }
}
