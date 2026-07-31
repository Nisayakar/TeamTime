package com.teamtime.repository;

import com.teamtime.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {

    @Query("""
            select distinct team
            from Team team
            join TeamMember member on member.team = team
            where member.user.id = :userId
            order by team.id desc
            """)
    List<Team> findDistinctByMemberUserId(@Param("userId") Long userId);
}
