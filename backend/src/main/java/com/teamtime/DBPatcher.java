package com.teamtime;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

public class DBPatcher {
    public static void main(String[] args) {
        Map<String, String> env = new HashMap<>();
        try {
            Files.readAllLines(Paths.get(".env")).forEach(line -> {
                if (line.contains("=")) {
                    String[] parts = line.split("=", 2);
                    env.put(parts[0].trim(), parts[1].trim());
                }
            });
        } catch (IOException e) {
            System.err.println(".env file not found or could not be read.");
        }

        String url = env.getOrDefault("SPRING_DATASOURCE_URL", "jdbc:postgresql://localhost:5432/teamtime");
        String user = env.getOrDefault("SPRING_DATASOURCE_USERNAME", "teamtime");
        String password = env.getOrDefault("SPRING_DATASOURCE_PASSWORD", "teamtime123");

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            System.out.println("Connected to Postgres!");
            
            String drop = "ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check";
            stmt.execute(drop);
            System.out.println("Dropped old constraint.");

            String add = "ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type::text IN (" +
                    "'TEAM_MEMBER_ADDED'," +
                    "'TEAM_MEMBER_REMOVED'," +
                    "'TEAM_PROJECT_CREATED'," +
                    "'TEAM_TASK_CREATED'," +
                    "'TEAM_INVITATION'," +
                    "'TEAM_INVITATION_ACCEPTED'," +
                    "'TEAM_INVITATION_REJECTED'," +
                    "'TASK_ASSIGNED'," +
                    "'TASK_ASSIGNMENT_ACCEPTED'," +
                    "'TASK_ASSIGNMENT_REJECTED'))";
            stmt.execute(add);
            System.out.println("Added new constraint with TEAM_INVITATION_ACCEPTED/REJECTED!");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
