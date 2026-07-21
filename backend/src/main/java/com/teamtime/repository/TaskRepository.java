package com.teamtime.repository;

import com.teamtime.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    List<Task> findAllByOrderByIdDesc();

    long countByStatus(String status);

}
