package com.climate.RS.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "simulation_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SimulationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    private double airTemp;
    private double windSpeed;
    private double windDirection;
    private double directRadiation;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public SimulationLog(double latitude, double longitude, double airTemp,
                         double windSpeed, double windDirection, double directRadiation) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.airTemp = airTemp;
        this.windSpeed = windSpeed;
        this.windDirection = windDirection;
        this.directRadiation = directRadiation;
        this.createdAt = LocalDateTime.now();
    }
}