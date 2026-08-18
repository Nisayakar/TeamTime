package com.teamtime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.Locale;

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
            
            // 1. Existing notifications constraints migration
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
                    "'TASK_ASSIGNMENT_REJECTED'," +
                    "'DUE_SOON'," +
                    "'OVERDUE'))");
            
            // 2. Username Migration
            migrateUsernames();

            // 3. Avatar Migration
            System.out.println("--- Migrating Avatars ---");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_path VARCHAR(255)");

            System.out.println("=== MIGRATION APPLIED SUCCESSFULLY ===");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void migrateUsernames() {
        System.out.println("--- Migrating Usernames ---");
        // Add column if not exists
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255)");
        jdbcTemplate.execute("ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS username VARCHAR(255)");

        // Backfill existing users
        List<Map<String, Object>> usersWithoutUsername = jdbcTemplate.queryForList("SELECT id, name, surname FROM users WHERE username IS NULL");
        for (Map<String, Object> user : usersWithoutUsername) {
            Long id = ((Number) user.get("id")).longValue();
            String name = (String) user.get("name");
            String surname = (String) user.get("surname");
            
            String baseUsername = generateBaseUsername(name, surname);
            String finalUsername = findUniqueUsername(baseUsername);
            
            jdbcTemplate.update("UPDATE users SET username = ? WHERE id = ?", finalUsername, id);
        }

        // Backfill pending_registrations if any exist (to prevent errors when adding NOT NULL)
        List<Map<String, Object>> pendingWithoutUsername = jdbcTemplate.queryForList("SELECT id, first_name, last_name FROM pending_registrations WHERE username IS NULL");
        for (Map<String, Object> pending : pendingWithoutUsername) {
            Long id = ((Number) pending.get("id")).longValue();
            String name = (String) pending.get("first_name");
            String surname = (String) pending.get("last_name");

            String baseUsername = generateBaseUsername(name, surname);
            String finalUsername = findUniqueUsername(baseUsername);

            jdbcTemplate.update("UPDATE pending_registrations SET username = ? WHERE id = ?", finalUsername, id);
        }

        // Set NOT NULL and add UNIQUE constraints
        jdbcTemplate.execute("ALTER TABLE users ALTER COLUMN username SET NOT NULL");
        jdbcTemplate.execute("ALTER TABLE pending_registrations ALTER COLUMN username SET NOT NULL");
        
        try {
            jdbcTemplate.execute("ALTER TABLE users ADD CONSTRAINT uk_users_username UNIQUE (username)");
        } catch (Exception e) {
            // Might already exist
        }
        
        try {
            jdbcTemplate.execute("ALTER TABLE pending_registrations ADD CONSTRAINT uk_pending_registrations_username UNIQUE (username)");
        } catch (Exception e) {
            // Might already exist
        }
    }

    private String generateBaseUsername(String name, String surname) {
        String base = (name != null ? name : "") + (surname != null ? surname : "");
        if (base.trim().isEmpty()) {
            base = "user";
        }
        
        // Normalize Turkish characters and remove accents
        String normalized = Normalizer.normalize(base, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        normalized = pattern.matcher(normalized).replaceAll("");
        
        // Convert to lowercase and replace special chars
        normalized = normalized.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_.]", "");
                
        if (normalized.length() < 3) {
            normalized += "user";
        }
        if (normalized.length() > 30) {
            normalized = normalized.substring(0, 30);
        }
        return normalized;
    }

    private String findUniqueUsername(String baseUsername) {
        String candidate = baseUsername;
        int suffix = 2;
        while (usernameExists(candidate)) {
            String suffixStr = String.valueOf(suffix);
            if (baseUsername.length() + suffixStr.length() > 30) {
                candidate = baseUsername.substring(0, 30 - suffixStr.length()) + suffixStr;
            } else {
                candidate = baseUsername + suffixStr;
            }
            suffix++;
        }
        return candidate;
    }

    private boolean usernameExists(String username) {
        Integer userCount = jdbcTemplate.queryForObject("SELECT count(*) FROM users WHERE LOWER(username) = LOWER(?)", Integer.class, username);
        Integer pendingCount = jdbcTemplate.queryForObject("SELECT count(*) FROM pending_registrations WHERE LOWER(username) = LOWER(?)", Integer.class, username);
        return (userCount != null && userCount > 0) || (pendingCount != null && pendingCount > 0);
    }
}
