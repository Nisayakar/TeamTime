package com.teamtime.exception;

public class TooManyVerificationAttemptsException extends RuntimeException {
    public TooManyVerificationAttemptsException(String message) {
        super(message);
    }
}
