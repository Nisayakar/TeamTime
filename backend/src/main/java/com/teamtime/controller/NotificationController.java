package com.teamtime.controller;

import com.teamtime.dto.NotificationPageResponse;
import com.teamtime.dto.NotificationResponse;
import com.teamtime.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:5173")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<NotificationPageResponse> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(notificationService.getCurrentUserNotifications(currentUserId, page, size));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(Map.of("unreadCount", notificationService.getUnreadCount(currentUserId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Long currentUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(notificationService.markAsRead(id, currentUserId));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        notificationService.markAllAsRead(currentUserId);
        return ResponseEntity.noContent().build();
    }

    @org.springframework.web.bind.annotation.DeleteMapping
    public ResponseEntity<Void> clearAllNotifications(Authentication authentication) {
        Long currentUserId = (Long) authentication.getPrincipal();
        notificationService.clearAllNotifications(currentUserId);
        return ResponseEntity.noContent().build();
    }
}
