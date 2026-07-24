package com.teamtime.repository;

import com.teamtime.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    List<Task> findAllByOrderByIdDesc();

    long countByStatus(String status);

    void deleteByProjectId(Long projectId);

    List<Task> findByProjectIdAndProjectUserId(Long projectId, Long userId);

    List<Task> findAllByProjectUserIdOrderByIdDesc(Long userId);

    Optional<Task> findByIdAndProjectUserId(Long id, Long userId);

    long countByProjectUserId(Long userId);

    long countByProjectUserIdAndStatus(Long userId, String status);

    void deleteByProjectIdAndProjectUserId(Long projectId, Long userId);

}
