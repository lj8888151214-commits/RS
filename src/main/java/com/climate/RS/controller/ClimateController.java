package com.climate.RS.controller;

import com.climate.RS.dto.GridPointDto;
import com.climate.RS.dto.SimulationResponseDto;
import com.climate.RS.dto.WeatherApiResponseDto;
import com.climate.RS.service.ThermalPhysicsEngineService;
import com.climate.RS.service.WeatherApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/climate")
@RequiredArgsConstructor
public class ClimateController {

    private final ThermalPhysicsEngineService thermalEngineService;
    private final WeatherApiService weatherApiService;

    @GetMapping("/simulate")
    public SimulationResponseDto simulate(
            @RequestParam(defaultValue = "37.3861") double lat,
            @RequestParam(defaultValue = "126.6692") double lng) {

        // 1. 송도 현지 실시간 기상 관측값 조회
        WeatherApiResponseDto weather = weatherApiService.fetchLiveWeather(lat, lng);

        double airTemp = 20.0;
        double windSpeed = 3.0;
        double windDir = 180.0;
        double directRad = 0.0;

        if (weather != null && weather.getCurrent() != null) {
            var cur = weather.getCurrent();
            airTemp = cur.getTemperature2m();
            windSpeed = cur.getWindSpeed10m();
            windDir = cur.getWindDirection10m();
            directRad = cur.getDirectNormalIrradiance();
        }

        // 2. 도로 규격 (송도과학로 51번길 4차선 기준)
        int laneCount = 4;
        double roadWidth = 14.0;
        double sidewalkOffset = (roadWidth / 2.0) + 1.5; // 8.5m

        // 3. 실시간 관측치 기반 100m 단위 열환경 계산
        List<GridPointDto> points = thermalEngineService.calculate10mGrids(
                airTemp, directRad, windSpeed, windDir
        );

        // 4. 결과 DTO 반환
        return SimulationResponseDto.builder()
                .logId(System.currentTimeMillis())
                .baseLat(lat)
                .baseLng(lng)
                .rawAirTemp(airTemp)
                .rawWindSpeed(windSpeed)
                .rawWindDirection(windDir)
                .directRadiation(directRad)
                .laneCount(laneCount)
                .roadWidthMeters(roadWidth)
                .sidewalkOffsetMeters(sidewalkOffset)
                .gridPoints(points)
                .build();
    }
}