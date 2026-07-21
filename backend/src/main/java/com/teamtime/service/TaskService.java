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


    public Task createTask(Task task, Long projectId) {


        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new RuntimeException("Proje bulunamadı")
                );


        task.setProject(project);


        return taskRepository.save(task);

    }



    public List<Task> getTasksByProject(Long projectId) {


        return taskRepository.findByProjectId(projectId);

    }

    public List<Task> getRecentTasks() {


        return taskRepository.findAllByOrderByIdDesc();

    }



    public Task updateTask(Long id, Task updatedTask) {


        Optional<Task> task =
                taskRepository.findById(id);



        if(task.isEmpty()){

            throw new RuntimeException("Görev bulunamadı");

        }



        Task existingTask = task.get();


        existingTask.setTitle(updatedTask.getTitle());

        existingTask.setDescription(updatedTask.getDescription());

        existingTask.setStatus(updatedTask.getStatus());



        return taskRepository.save(existingTask);

    }



    public void deleteTask(Long id) {


        if(!taskRepository.existsById(id)){

            throw new RuntimeException("Görev bulunamadı");

        }


        taskRepository.deleteById(id);

    }


}
