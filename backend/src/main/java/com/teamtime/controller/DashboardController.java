package com.teamtime.controller;

import com.teamtime.dto.DashboardDataResponse;
import com.teamtime.service.DashboardService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {

        this.dashboardService = dashboardService;

    }

    @GetMapping("/dashboard")
    public DashboardDataResponse getDashboardData() {

        return dashboardService.getDashboardData();

    }

}
