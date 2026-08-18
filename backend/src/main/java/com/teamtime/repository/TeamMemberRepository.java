package com.teamtime.repository;

import com.teamtime.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {

    Optional<TeamMember> findByTeamIdAndUserId(Long teamId, Long userId);

    Optional<TeamMember> findFirstByTeamIdAndRole(Long teamId, String role);

    List<TeamMember> findByTeamId(Long teamId);

    List<TeamMember> findByUserId(Long userId);

    List<TeamMember> findByUserIdAndRoleIn(Long userId, List<String> roles);

    List<TeamMember> findByTeamIdAndUserIdNotOrderByJoinedDateAsc(Long teamId, Long userId);

    void deleteByUserId(Long userId);

    @Query("""
            select count(distinct teamMember.team.id)
            from TeamMember teamMember
            where teamMember.user.id = :userId
            """)
    long countDistinctTeamsForUser(@Param("userId") Long userId);

    void deleteByTeamId(Long teamId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select tm from TeamMember tm where tm.team.id = :teamId")
    List<TeamMember> findByTeamIdForWrite(@Param("teamId") Long teamId);
}
