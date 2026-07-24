package com.teamtime.service;

import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TaskService {


    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;



    public TaskService(TaskRepository taskRepository,
                       ProjectRepository projectRepository) {

        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;

    }


    public Task createTask(Task task, Long projectId, Long userId) {


        Project project = projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Proje bulunamadı veya bu proje için yetkiniz yok")
                );


        task.setProject(project);


        return taskRepository.save(task);

    }



    public List<Task> getTasksByProject(Long projectId, Long userId) {


        return taskRepository.findByProjectIdAndProjectUserId(projectId, userId);

    }

    public List<Task> getRecentTasks(Long userId) {


        return taskRepository.findAllByProjectUserIdOrderByIdDesc(userId);

    }



    public Task updateTask(Long id, Task updatedTask, Long userId) {


        Optional<Task> task =
                taskRepository.findByIdAndProjectUserId(id, userId);



        if(task.isEmpty()){

            throw new IllegalArgumentException("Görev bulunamadı veya bu görev için yetkiniz yok");

        }



        Task existingTask = task.get();


        existingTask.setTitle(updatedTask.getTitle());

        existingTask.setDescription(updatedTask.getDescription());

        existingTask.setStatus(updatedTask.getStatus());



        return taskRepository.save(existingTask);

    }



    public void deleteTask(Long id, Long userId) {


        Optional<Task> task = taskRepository.findByIdAndProjectUserId(id, userId);

        if(task.isEmpty()){

            throw new IllegalArgumentException("Görev bulunamadı veya bu görev için yetkiniz yok");

        }


        taskRepository.delete(task.get());

    }


}
