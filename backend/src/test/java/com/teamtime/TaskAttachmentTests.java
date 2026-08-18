package com.teamtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamtime.dto.TaskAttachmentResponse;
import com.teamtime.entity.*;
import com.teamtime.repository.*;
import com.teamtime.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.File;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class TaskAttachmentTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private TeamMemberRepository teamMemberRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TaskAttachmentRepository taskAttachmentRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TeamInvitationRepository teamInvitationRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private User user;
    private Project project;
    private Task task;
    private String token;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        teamInvitationRepository.deleteAll();
        taskAttachmentRepository.deleteAll();
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        teamMemberRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setEmail("test@example.com");
        user.setPassword("password");
        user.setName("John");
        user.setSurname("Doe");
        user.setUsername("johndoe");
        user = userRepository.save(user);

        project = new Project();
        project.setProjectName("Test Project");
        project.setUser(user);
        project = projectRepository.save(project);

        task = new Task();
        task.setTitle("Test Task");
        task.setProject(project);
        task.setStatus("BEKLIYOR");
        task.setPriority(TaskPriority.MEDIUM);
        task = taskRepository.save(task);

        token = "Bearer " + jwtService.generateToken(user);
    }

    @Test
    void testUploadAndDownloadAndCancelAttachment() throws Exception {
        byte[] pngContent = new byte[]{(byte) 0x89, (byte) 0x50, (byte) 0x4E, (byte) 0x47, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", pngContent);

        String uploadResponse = mockMvc.perform(multipart("/api/tasks/" + task.getId() + "/attachments")
                        .file(file)
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        TaskAttachmentResponse responseDto = objectMapper.readValue(uploadResponse, TaskAttachmentResponse.class);
        assertNotNull(responseDto.getId());
        assertEquals("test.png", responseDto.getFileName());

        mockMvc.perform(get("/api/tasks/" + task.getId() + "/attachments")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fileName").value("test.png"));

        mockMvc.perform(get("/api/tasks/attachments/" + responseDto.getId() + "/download")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"test.png\""));

        mockMvc.perform(delete("/api/tasks/attachments/" + responseDto.getId())
                        .header("Authorization", token))
                .andExpect(status().isNoContent());

        assertTrue(taskAttachmentRepository.findById(responseDto.getId()).isEmpty());
    }

    @Test
    void testUploadRejectsInvalidMagicBytes() throws Exception {
        byte[] txtContent = "Hello World".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "malicious.png", "image/png", txtContent);

        mockMvc.perform(multipart("/api/tasks/" + task.getId() + "/attachments")
                        .file(file)
                        .header("Authorization", token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testUploadRejectsFileOverLimit() throws Exception {
        byte[] largeContent = new byte[6 * 1024 * 1024]; // 6MB
        largeContent[0] = (byte) 0x89;
        largeContent[1] = (byte) 0x50;
        largeContent[2] = (byte) 0x4E;
        largeContent[3] = (byte) 0x47;

        MockMultipartFile largeFile = new MockMultipartFile("file", "too_large.png", "image/png", largeContent);

        mockMvc.perform(multipart("/api/tasks/" + task.getId() + "/attachments")
                        .file(largeFile)
                        .header("Authorization", token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testDeleteTaskCascadeDeletesAttachments() throws Exception {
        byte[] pngContent = new byte[]{(byte) 0x89, (byte) 0x50, (byte) 0x4E, (byte) 0x47, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", pngContent);

        String uploadResponse = mockMvc.perform(multipart("/api/tasks/" + task.getId() + "/attachments")
                        .file(file)
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        TaskAttachmentResponse responseDto = objectMapper.readValue(uploadResponse, TaskAttachmentResponse.class);
        
        TaskAttachment dbAttachment = taskAttachmentRepository.findById(responseDto.getId()).get();
        assertTrue(new File(dbAttachment.getFilePath()).exists());

        mockMvc.perform(delete("/api/tasks/" + task.getId())
                        .header("Authorization", token))
                .andExpect(status().isOk());

        assertTrue(taskAttachmentRepository.findById(responseDto.getId()).isEmpty());
        assertFalse(new File(dbAttachment.getFilePath()).exists());
    }
}
