package com.teamtime.entity;

public enum TeamRole {
    OWNER,
    ADMIN,
    MEMBER;

    public static TeamRole from(String value) {
        if (value == null || value.isBlank()) {
            return MEMBER;
        }

        return TeamRole.valueOf(value.trim().toUpperCase());
    }
}
