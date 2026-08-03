package com.teamtime.service;

import com.teamtime.entity.Project;
import com.teamtime.entity.Task;
import com.teamtime.entity.TeamMember;
import com.teamtime.entity.TeamRole;
import com.teamtime.exception.ResourceNotFoundException;
import com.teamtime.repository.ProjectRepository;
import com.teamtime.repository.TaskRepository;
import com.teamtime.repository.TeamMemberRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TaskService {


    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;



    public TaskService(TaskRepository taskRepository,
                       ProjectRepository projectRepository,
                       TeamMemberRepository teamMemberRepository) {

        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.teamMemberRepository = teamMemberRepository;

    }


    public Task createTask(Task task, Long projectId, Long userId) {


        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Proje bulunamadı")
                );

        requireTaskMutationAccess(project, userId);

        task.setProject(project);


        return taskRepository.save(task);

    }



    public List<Task> getTasksByProject(Long projectId, Long userId) {


        Project project = projectRepository.findById(projectId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Proje bulunamadı")
                );

        requireTaskViewAccess(project, userId);

        return taskRepository.findByProjectId(projectId);

    }

    public List<Task> getRecentTasks(Long userId) {


        return taskRepository.findAccessibleTasksOrderByIdDesc(userId);

    }



    public Task updateTask(Long id, Task updatedTask, Long userId) {


        Optional<Task> task =
                taskRepository.findById(id);



        if(task.isEmpty()){

            throw new ResourceNotFoundException("Görev bulunamadı veya bu görev için yetkiniz yok");

        }



        Task existingTask = task.get();

        requireTaskMutationAccess(existingTask.getProject(), userId);


        existingTask.setTitle(updatedTask.getTitle());

        existingTask.setDescription(updatedTask.getDescription());

        existingTask.setStatus(updatedTask.getStatus());



        return taskRepository.save(existingTask);

    }



    public void deleteTask(Long id, Long userId) {


        Optional<Task> task = taskRepository.findById(id);

        if(task.isEmpty()){

            throw new ResourceNotFoundException("Görev bulunamadı veya bu görev için yetkiniz yok");

        }


        Task existingTask = task.get();
        requireTaskMutationAccess(existingTask.getProject(), userId);

        taskRepository.delete(existingTask);

    }

    private void requireTaskViewAccess(Project project, Long userId) {
        if (project.getTeam() == null) {
            if (!project.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Proje bulunamadı veya bu proje için yetkiniz yok");
            }

            return;
        }

        requireTeamMembership(project.getTeam().getId(), userId);
    }

    private void requireTaskMutationAccess(Project project, Long userId) {
        if (project.getTeam() == null) {
            if (!project.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Proje bulunamadı veya bu proje için yetkiniz yok");
            }

            return;
        }

        TeamRole role = requireTeamMembership(project.getTeam().getId(), userId);

        if (role != TeamRole.OWNER && role != TeamRole.ADMIN) {
            throw new AccessDeniedException("Takım projesindeki görevleri yönetme yetkiniz yok");
        }
    }

    private TeamRole requireTeamMembership(Long teamId, Long userId) {
        TeamMember membership = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new AccessDeniedException("Bu takım için yetkiniz yok"));

        return TeamRole.from(membership.getRole());
    }


}
