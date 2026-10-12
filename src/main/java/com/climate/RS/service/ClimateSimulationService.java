package com.climate.RS.service;

import com.climate.RS.dto.GridPointDto;
import com.climate.RS.dto.SimulationResponseDto;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ClimateSimulationService {

    private final BuildingGisService buildingGisService;
    private final SolarPositionService solarPositionService;

    public ClimateSimulationService(BuildingGisService buildingGisService, SolarPositionService solarPositionService) {
        this.buildingGisService = buildingGisService;
        this.solarPositionService = solarPositionService;
    }

    public SimulationResponseDto simulateMicroclimate(double lat, double lng, Integer minuteOffset) {
        // 1. 기준 시각 (현재 시각 + 15분 단위 오프셋)
        LocalDateTime targetTime = LocalDateTime.now().plusMinutes(minuteOffset != null ? minuteOffset : 0);

        // 2. 실시간 태양 궤적 계산 (고도각, 방위각, 일사 계수)
        SolarPositionService.SolarAngles solar = solarPositionService.calculateSolarPosition(lat, lng, targetTime);

        // 3. 주변 건물 데이터 수집 (초고층 건물 그림자를 위해 반경을 150m로 확대)
        List<BuildingGisService.BuildingInfo> buildings =
                buildingGisService.fetchSurroundingBuildings(lat, lng, 150.0);

        // 4. 고도각 기반 동적 일사량 (맑은 날 정오 기준 최대 950 W/m²)
        double directRadiation = Math.round(950.0 * Math.max(0.0, solar.radiationFactor()) * 10.0) / 10.0;
        double baseAirTemp = 21.0 + (solar.radiationFactor() * 6.5);
        double baseWind = 2.4;

        List<GridPointDto> gridPoints = new ArrayList<>();
        int[] distances = {5, 10, 15, 20, 25};

        for (int dist : distances) {
            double ptLat = lat + (dist * 0.000009);
            double ptLng = lng;

            // 5. [핵심] 실시간 태양 방위각과 고도각을 적용한 정밀 건물 그림자 판별
            boolean isShadow = buildingGisService.checkShadowAtPoint(
                    ptLat, ptLng, solar.azimuthDeg(), solar.altitudeDeg(), buildings
            );

            // 미세 열섬/노면 편차 (0.0 ~ 1.5°C)
            double microVariance = Math.sin(lat * 1000.0 + dist) * 1.5;

            double thermalGain;
            if (isShadow) {
                // 그늘 구역: 직사광 차단으로 대기온 수준 유지 (약 22°C ~ 24°C)
                thermalGain = 1.2 + (microVariance * 0.2);
            } else {
                // 직사광 구역: 아스팔트 급속 축열 (약 37°C ~ 40°C)
                thermalGain = (directRadiation / 50.0) + microVariance;
            }

            double asphaltTemp = baseAirTemp + thermalGain;
            double redBlockTemp = baseAirTemp + (thermalGain * 0.65);
            double whiteBlockTemp = baseAirTemp + (thermalGain * 0.35);

            gridPoints.add(GridPointDto.builder()
                    .distanceMeters(dist)
                    .ambientTemp(Math.round(baseAirTemp * 10.0) / 10.0)
                    .asphaltTemp(Math.round(asphaltTemp * 10.0) / 10.0)
                    .redBlockTemp(Math.round(redBlockTemp * 10.0) / 10.0)
                    .whiteBlockTemp(Math.round(whiteBlockTemp * 10.0) / 10.0)
                    .buildingWallTemp(baseAirTemp + 3.0)
                    .isShadow(isShadow)
                    .adjustedWindSpeed(baseWind)
                    .adjustedWindDirection((int) solar.azimuthDeg())
                    .build());
        }

        return SimulationResponseDto.builder()
                .baseLat(lat)
                .baseLng(lng)
                .rawAirTemp(Math.round(baseAirTemp * 10.0) / 10.0)
                .rawWindSpeed(baseWind)
                .rawWindDirection((int) solar.azimuthDeg())
                .directRadiation(directRadiation)
                .surroundingBuildings(buildings) // 프론트로 실제 주변 건물 전달!
                .gridPoints(gridPoints)
                .build();
    }
}