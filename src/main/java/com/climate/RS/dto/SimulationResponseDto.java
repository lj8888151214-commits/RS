package com.climate.RS.dto;

import com.climate.RS.service.BuildingGisService.BuildingInfo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationResponseDto {
    private Long logId;
    private double baseLat;
    private double baseLng;
    private double rawAirTemp;
    private double rawWindSpeed;
    private double rawWindDirection;
    private double directRadiation;
    private int laneCount;
    private double roadWidthMeters;
    private double sidewalkOffsetMeters; // 보도 오프셋 필드 추가
    private List<GridPointDto> gridPoints;
    private List<BuildingInfo> surroundingBuildings;
}