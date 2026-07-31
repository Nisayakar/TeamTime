package com.teamtime.exception;

import java.time.LocalDateTime;
import java.util.Map;

public record ApiErrorResponse(
        String timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors
) {
    public static ApiErrorResponse of(int status, String error, String message, String path) {
        return new ApiErrorResponse(
                LocalDateTime.now().toString(),
                status,
                error,
                message,
                path,
                null);
    }

    public static ApiErrorResponse withFieldErrors(
            int status,
            String error,
            String message,
            String path,
            Map<String, String> fieldErrors
    ) {
        return new ApiErrorResponse(
                LocalDateTime.now().toString(),
                status,
                error,
                message,
                path,
                fieldErrors);
    }
}
