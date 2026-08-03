package com.teamtime.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.teamtime.entity.Project;
import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findAllByOrderByIdDesc();

    List<Project> findByUserId(Long userId);

    List<Project> findAllByUserIdOrderByIdDesc(Long userId);

    Optional<Project> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    boolean existsByTeam_Id(Long teamId);

    @Query("""
            select count(distinct project.id)
            from Project project
            left join TeamMember membership on membership.team = project.team and membership.user.id = :userId
            where (project.team is null and project.user.id = :userId)
               or membership.id is not null
            """)
    long countAccessibleProjects(@Param("userId") Long userId);

    @Query("""
            select distinct project
            from Project project
            left join fetch project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where (project.team is null and project.user.id = :userId)
               or membership.id is not null
            order by project.id desc
            """)
    List<Project> findAccessibleProjects(@Param("userId") Long userId);

    @Query("""
            select distinct project
            from Project project
            left join fetch project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where (project.team is null and project.user.id = :userId)
               or membership.id is not null
            order by project.id desc
            """)
    List<Project> findRecentAccessibleProjects(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            select distinct project
            from Project project
            left join fetch project.team team
            left join TeamMember membership on membership.team = team and membership.user.id = :userId
            where ((project.team is null and project.user.id = :userId)
               or membership.id is not null)
              and project.id = :projectId
            """)
    Optional<Project> findAccessibleProjectById(@Param("projectId") Long projectId, @Param("userId") Long userId);

}
