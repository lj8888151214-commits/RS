package com.climate.RS.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.stereotype.Service;

@Service
public class RoadNetworkService {

    @Data
    @AllArgsConstructor
    public static class RoadInfo {
        private int lanes;
        private double roadWidthMeters;
        private double sidewalkOffsetMeters;
    }

    public RoadInfo analyzeRoadProfile(double lat, double lng) {
        // 송도과학로 51번길 기준: 왕복 4차선(차도 약 14.0m)
        // 보도블록 중심선 = (차도 폭 / 2) + 인도 여유폭 1.5m = 8.5m
        int lanes = 4;
        double roadWidth = 14.0;
        double sidewalkOffset = (roadWidth / 2.0) + 1.5;

        return new RoadInfo(lanes, roadWidth, sidewalkOffset);
    }
}