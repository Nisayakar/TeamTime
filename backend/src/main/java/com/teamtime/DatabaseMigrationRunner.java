package com.teamtime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigrationRunner implements CommandLineRunner {
    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            System.out.println("=== STARTING DB MIGRATION ===");
            jdbcTemplate.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
            jdbcTemplate.execute("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type::text IN (" +
                    "'TEAM_MEMBER_ADDED'," +
                    "'TEAM_MEMBER_REMOVED'," +
                    "'TEAM_PROJECT_CREATED'," +
                    "'TEAM_TASK_CREATED'," +
                    "'TEAM_INVITATION'," +
                    "'TEAM_INVITATION_ACCEPTED'," +
                    "'TEAM_INVITATION_REJECTED'," +
                    "'TASK_ASSIGNED'," +
                    "'TASK_ASSIGNMENT_ACCEPTED'," +
                    "'TASK_ASSIGNMENT_REJECTED'))");
            System.out.println("=== MIGRATION APPLIED SUCCESSFULLY ===");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
