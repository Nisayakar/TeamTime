package com.teamtime.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teamtime.entity.Project;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    
}
