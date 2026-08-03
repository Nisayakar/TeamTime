package com.teamtime.repository;

import com.teamtime.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            select distinct task
            from Task task
            left join task.project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where (task.project.team is null and task.project.user.id = :userId)
               or membership.id is not null
            order by task.id desc
            """)
    List<Task> findAccessibleTasksOrderByIdDesc(@Param("userId") Long userId);

}
