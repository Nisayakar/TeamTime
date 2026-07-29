package com.teamtime.service;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

@Component
public class SecureVerificationCodeGenerator implements VerificationCodeGenerator {

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public String generateSixDigitCode() {
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }
}
