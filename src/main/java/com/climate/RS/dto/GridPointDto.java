package com.climate.RS.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GridPointDto {
    private int distanceMeters;          // 거리 (10m, 20m, 30m ...)
    private double ambientTemp;           // 대기 기온 (°C)
    private double asphaltTemp;          // 아스팔트 노면 온도 (°C)
    private double redBlockTemp;         // 빨간색 보도블록 온도 (°C)
    private double whiteBlockTemp;       // 흰색 투수블록 온도 (°C)
    private double buildingWallTemp;     // 건물 외벽 온도 (°C)
    private boolean isShadow;            // 그늘 여부
    private double adjustedWindSpeed;    // 협곡/빌딩풍 보정 풍속 (m/s)
    private double adjustedWindDirection;// 보정 풍향 (degree)
}