package com.teamtime.exception;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException exception) {
        Map<String, String> errors = new LinkedHashMap<>();

        exception.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage()));

        Map<String, Object> response = createResponse(
                HttpStatus.BAD_REQUEST,
                "Validation hatası");
        response.put("errors", errors);

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateEmailException(DuplicateEmailException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(createResponse(HttpStatus.CONFLICT, exception.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentialsException(InvalidCredentialsException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createResponse(HttpStatus.UNAUTHORIZED, exception.getMessage()));
    }

    @ExceptionHandler(VerificationCodeException.class)
    public ResponseEntity<Map<String, Object>> handleVerificationCodeException(VerificationCodeException exception) {
        return ResponseEntity.badRequest()
                .body(createResponse(HttpStatus.BAD_REQUEST, exception.getMessage()));
    }

    @ExceptionHandler(TooManyVerificationAttemptsException.class)
    public ResponseEntity<Map<String, Object>> handleTooManyVerificationAttemptsException(
            TooManyVerificationAttemptsException exception
    ) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(createResponse(HttpStatus.TOO_MANY_REQUESTS, exception.getMessage()));
    }

    @ExceptionHandler(ResendCooldownException.class)
    public ResponseEntity<Map<String, Object>> handleResendCooldownException(ResendCooldownException exception) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(createResponse(HttpStatus.TOO_MANY_REQUESTS, exception.getMessage()));
    }

    @ExceptionHandler(MailConfigurationException.class)
    public ResponseEntity<Map<String, Object>> handleMailConfigurationException(MailConfigurationException exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createResponse(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage()));
    }

    @ExceptionHandler(EmailDeliveryException.class)
    public ResponseEntity<Map<String, Object>> handleEmailDeliveryException(EmailDeliveryException exception) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(createResponse(HttpStatus.BAD_GATEWAY, exception.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException exception) {
        return ResponseEntity.badRequest()
                .body(createResponse(HttpStatus.BAD_REQUEST, exception.getMessage()));
    }

    private Map<String, Object> createResponse(HttpStatus status, String message) {
        Map<String, Object> response = new LinkedHashMap<>();

        response.put("timestamp", LocalDateTime.now().toString());
        response.put("status", status.value());
        response.put("error", status.getReasonPhrase());
        response.put("message", message);

        return response;
    }
}
