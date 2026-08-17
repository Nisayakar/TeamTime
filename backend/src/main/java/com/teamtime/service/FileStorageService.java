package com.teamtime.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${app.upload.profile-images-dir:uploads/profile-images}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public String storeProfileImage(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Failed to store empty file.");
        }

        try {
            String extension = validateImageAndGetExtension(file);
            String fileName = UUID.randomUUID().toString() + extension;
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            
            // Path traversal protection
            if (!targetLocation.getParent().equals(this.fileStorageLocation)) {
                throw new SecurityException("Cannot store file outside current directory.");
            }

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            return fileName;

        } catch (IOException ex) {
            throw new RuntimeException("Could not store file. Please try again!", ex);
        }
    }

    public void deleteProfileImage(String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return;
        }
        try {
            Path targetLocation = this.fileStorageLocation.resolve(fileName).normalize();
            if (targetLocation.getParent().equals(this.fileStorageLocation)) {
                Files.deleteIfExists(targetLocation);
            }
        } catch (IOException ex) {
            // Log and ignore to prevent 500 error on cleanup
            System.err.println("Could not delete file: " + fileName + ". Error: " + ex.getMessage());
        }
    }

    private String validateImageAndGetExtension(MultipartFile file) throws IOException {
        byte[] bytes = new byte[12];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(bytes);
            if (read < 12) {
                throw new IllegalArgumentException("Invalid file format.");
            }
        }

        if (isJpeg(bytes)) {
            return ".jpg";
        } else if (isPng(bytes)) {
            return ".png";
        } else if (isWebp(bytes)) {
            return ".webp";
        }

        throw new IllegalArgumentException("Unsupported file type. Only JPEG, PNG, and WEBP are allowed.");
    }

    private boolean isJpeg(byte[] bytes) {
        return (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF);
    }

    private boolean isPng(byte[] bytes) {
        return (bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x4E &&
                bytes[3] == (byte) 0x47 && bytes[4] == (byte) 0x0D && bytes[5] == (byte) 0x0A &&
                bytes[6] == (byte) 0x1A && bytes[7] == (byte) 0x0A);
    }

    private boolean isWebp(byte[] bytes) {
        // WEBP starts with RIFF, then 4 bytes size, then WEBP
        return (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
                bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P');
    }
}
