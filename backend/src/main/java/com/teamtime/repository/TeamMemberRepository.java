package com.teamtime.repository;

import com.teamtime.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    Optional<TeamMember> findByTeamIdAndUserId(Long teamId, Long userId);

    List<TeamMember> findByTeamId(Long teamId);

    List<TeamMember> findByUserId(Long userId);

    @Query("""
            select count(distinct teamMember.team.id)
            from TeamMember teamMember
            where teamMember.user.id = :userId
            """)
    long countDistinctTeamsForUser(@Param("userId") Long userId);

    void deleteByTeamId(Long teamId);
}
