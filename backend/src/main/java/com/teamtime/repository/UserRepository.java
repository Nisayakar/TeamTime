package com.teamtime.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.teamtime.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

}