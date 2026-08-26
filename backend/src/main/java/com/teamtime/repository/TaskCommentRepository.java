package com.teamtime.repository;

import com.teamtime.entity.TaskComment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskCommentRepository extends JpaRepository<TaskComment, Long> {
    List<TaskComment> findByTaskIdOrderByCreatedAtAsc(Long taskId);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM TaskComment t WHERE t.task.id = :taskId")
    void deleteByTaskId(@org.springframework.data.repository.query.Param("taskId") Long taskId);
}
