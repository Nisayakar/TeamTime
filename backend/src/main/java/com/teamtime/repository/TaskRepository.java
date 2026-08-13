package com.teamtime.repository;

import com.teamtime.entity.Task;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    List<Task> findAllByOrderByIdDesc();

    long countByStatus(String status);

    void deleteByProjectId(Long projectId);

    void deleteByProjectUserId(Long userId);

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

    @Query("""
            select count(distinct task.id)
            from Task task
            left join task.project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where (task.project.team is null and task.project.user.id = :userId)
               or membership.id is not null
            """)
    long countAccessibleTasks(@Param("userId") Long userId);

    @Query("""
            select count(distinct task.id)
            from Task task
            left join task.project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where ((task.project.team is null and task.project.user.id = :userId)
               or membership.id is not null)
              and task.status = :status
            """)
    long countAccessibleTasksByStatus(@Param("userId") Long userId, @Param("status") String status);

    @Query("""
            select count(distinct task.id)
            from Task task
            left join task.project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where ((task.project.team is null and task.project.user.id = :userId)
               or membership.id is not null)
              and task.status <> 'TAMAMLANDI'
              and task.dueDate < :today
            """)
    long countAccessibleOverdueTasks(@Param("userId") Long userId, @Param("today") LocalDate today);

    @Query("""
            select count(distinct task.id)
            from Task task
            left join task.project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where ((task.project.team is null and task.project.user.id = :userId)
               or membership.id is not null)
              and task.status <> 'TAMAMLANDI'
              and task.dueDate = :today
            """)
    long countAccessibleDueTodayTasks(@Param("userId") Long userId, @Param("today") LocalDate today);

    @Query("""
            select count(distinct task.id)
            from Task task
            left join task.project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where ((task.project.team is null and task.project.user.id = :userId)
              or membership.id is not null)
              and task.status <> 'TAMAMLANDI'
              and task.dueDate > :today
              and task.dueDate <= :upcomingEndDate
            """)
    long countAccessibleUpcomingTasks(
            @Param("userId") Long userId,
            @Param("today") LocalDate today,
            @Param("upcomingEndDate") LocalDate upcomingEndDate);

    @Query("""
            select task
            from Task task
            join fetch task.project project
            left join fetch project.team team
            where ((project.team is null and project.user.id = :userId)
              or exists (
                  select 1
                  from TeamMember membership
                  where membership.team = project.team
                    and membership.user.id = :userId
              ))
              and task.status <> 'TAMAMLANDI'
              and task.dueDate > :today
              and task.dueDate <= :upcomingEndDate
            order by task.dueDate asc,
                case task.priority
                    when com.teamtime.entity.TaskPriority.URGENT then 4
                    when com.teamtime.entity.TaskPriority.HIGH then 3
                    when com.teamtime.entity.TaskPriority.MEDIUM then 2
                    when com.teamtime.entity.TaskPriority.LOW then 1
                    else 0
                end desc,
                task.createdAt desc
            """)
    List<Task> findUpcomingAccessibleTasks(
            @Param("userId") Long userId,
            @Param("today") LocalDate today,
            @Param("upcomingEndDate") LocalDate upcomingEndDate,
            Pageable pageable);

}
