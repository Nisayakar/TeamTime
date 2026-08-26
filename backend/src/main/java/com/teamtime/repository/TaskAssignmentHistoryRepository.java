package com.teamtime.repository;

import com.teamtime.entity.TaskAssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskAssignmentHistoryRepository extends JpaRepository<TaskAssignmentHistory, Long> {
    List<TaskAssignmentHistory> findByTaskIdOrderByCreatedAtDesc(Long taskId);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM TaskAssignmentHistory t WHERE t.task.id = :taskId")
    void deleteByTaskId(@org.springframework.data.repository.query.Param("taskId") Long taskId);
}
