package com.teamtime.service;

import com.teamtime.dto.TaskCommentResponse;
import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.entity.TaskComment;
import com.teamtime.entity.User;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskCommentRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TaskCommentService {

    private final TaskCommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public TaskCommentService(TaskCommentRepository commentRepository, TaskRepository taskRepository,
                              ProjectRepository projectRepository, UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    private Task getAccessibleTask(Long taskId, Long currentUserId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Görev bulunamadı"));
        
        projectRepository.findAccessibleProjectById(task.getProject().getId(), currentUserId)
                .orElseThrow(() -> new AccessDeniedException("Bu görev için yetkiniz yok"));
        
        return task;
    }

    @Transactional
    public TaskCommentResponse createComment(Long taskId, String content, Long currentUserId) {
        if (content == null || content.trim().isBlank()) {
            throw new IllegalArgumentException("Yorum içeriği boş olamaz.");
        }
        
        String trimmedContent = content.trim();
        if (trimmedContent.length() > 2000) {
            throw new IllegalArgumentException("Yorum en fazla 2000 karakter olabilir.");
        }

        Task task = getAccessibleTask(taskId, currentUserId);
        User author = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        TaskComment comment = new TaskComment();
        comment.setTask(task);
        comment.setAuthor(author);
        comment.setContent(trimmedContent);
        comment.setCreatedAt(LocalDateTime.now());

        TaskComment saved = commentRepository.save(comment);
        return convertToResponse(saved);
    }

    public List<TaskCommentResponse> getComments(Long taskId, Long currentUserId) {
        getAccessibleTask(taskId, currentUserId);
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    @Transactional
    public void deleteComment(Long commentId, Long currentUserId) {
        TaskComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Yorum bulunamadı"));

        if (!comment.getAuthor().getId().equals(currentUserId)) {
            throw new AccessDeniedException("Yalnızca kendi yorumlarınızı silebilirsiniz.");
        }

        commentRepository.delete(comment);
    }

    private TaskCommentResponse convertToResponse(TaskComment comment) {
        User author = comment.getAuthor();
        String authorName = "%s %s".formatted(author.getName(), author.getSurname()).trim();
        return new TaskCommentResponse(
                comment.getId(),
                comment.getTask().getId(),
                author.getId(),
                authorName,
                author.getUsername(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}
