package com.teamtime.repository;

import com.teamtime.entity.TaskAssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskAssignmentHistoryRepository extends JpaRepository<TaskAssignmentHistory, Long> {
    List<TaskAssignmentHistory> findByTaskIdOrderByCreatedAtDesc(Long taskId);
    void deleteByTaskId(Long taskId);
}
