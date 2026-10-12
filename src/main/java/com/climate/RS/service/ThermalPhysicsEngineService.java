package com.climate.RS.service;

import com.climate.RS.dto.GridPointDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ThermalPhysicsEngineService {

    private static final double ALBEDO_ASPHALT = 0.08;
    private static final double ALBEDO_RED_BLOCK = 0.25;
    private static final double ALBEDO_WHITE_BLOCK = 0.65;
    private static final double ALBEDO_WALL = 0.35;

    public List<GridPointDto> calculate10mGrids(double airTemp, double radiation, double windSpeed, double windDir) {
        List<GridPointDto> points = new ArrayList<>();

        // 100m부터 500m까지 100m 간격으로 연산
        for (int dist = 100; dist <= 500; dist += 100) {
            // 데모용: 300m 지점은 건물 그늘(Shadow)로 가정
            boolean inShadow = (dist == 300);
            double effectiveRad = inShadow ? 0.0 : radiation;

            // 풍속에 따른 대류 열전달 계수
            double hc = Math.max(5.8, 5.8 + 3.94 * windSpeed);

            double tAsphalt = airTemp + ((1.0 - ALBEDO_ASPHALT) * effectiveRad) / hc;
            double tRed = airTemp + ((1.0 - ALBEDO_RED_BLOCK) * effectiveRad) / hc;
            double tWhite = airTemp + ((1.0 - ALBEDO_WHITE_BLOCK) * effectiveRad) / hc;
            double tWall = airTemp + ((1.0 - ALBEDO_WALL) * effectiveRad) / hc;

            double currentWindSpeed = inShadow ? windSpeed * 0.7 : windSpeed * 1.1;

            points.add(GridPointDto.builder()
                    .distanceMeters(dist)
                    .ambientTemp(round(airTemp))
                    .asphaltTemp(round(tAsphalt))
                    .redBlockTemp(round(tRed))
                    .whiteBlockTemp(round(tWhite))
                    .buildingWallTemp(round(tWall))
                    .isShadow(inShadow)
                    .adjustedWindSpeed(round(currentWindSpeed))
                    .adjustedWindDirection(windDir)
                    .build());
        }
        return points;
    }

    private double round(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}