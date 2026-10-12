package com.climate.RS.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.temporal.ChronoField;

@Service
public class SolarPositionService {

    public record SolarAngles(double altitudeDeg, double azimuthDeg, double radiationFactor) {}

    /**
     * 위도, 경도, 특정 일시(15분 단위)를 기반으로 태양 고도각(Altitude) 및 방위각(Azimuth) 정밀 계산
     */
    public SolarAngles calculateSolarPosition(double lat, double lng, LocalDateTime dateTime) {
        int dayOfYear = dateTime.get(ChronoField.DAY_OF_YEAR);
        double hour = dateTime.getHour() + (dateTime.getMinute() / 60.0);

        // 1. 태양 적위 (Solar Declination, 라디안)
        double declination = Math.toRadians(23.45 * Math.sin(Math.toRadians((360.0 / 365.0) * (dayOfYear - 81))));

        // 2. 균시차(Equation of Time) 보정 및 지방 태양시(Local Solar Time)
        double b = Math.toRadians((360.0 / 365.0) * (dayOfYear - 81));
        double eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // 분 단위
        double timeCorrection = 4.0 * (lng - 135.0) + eot; // 한국 표준시 자오선 기준 (135°E)
        double solarTime = hour + (timeCorrection / 60.0);

        // 3. 시간각 (Hour Angle, 라디안)
        double hourAngle = Math.toRadians(15.0 * (solarTime - 12.0));
        double latRad = Math.toRadians(lat);

        // 4. 태양 고도각 (Solar Altitude, 라디안 -> 도)
        double sinAltitude = Math.sin(latRad) * Math.sin(declination) +
                Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
        double altitudeRad = Math.asin(Math.max(-1.0, Math.min(1.0, sinAltitude)));
        double altitudeDeg = Math.toDegrees(altitudeRad);

        // 5. 태양 방위각 (Solar Azimuth, 북쪽 기준 시계방향 0~360°)
        double cosAzimuth = (Math.sin(declination) * Math.cos(latRad) -
                Math.cos(declination) * Math.sin(latRad) * Math.cos(hourAngle)) / Math.cos(altitudeRad);
        cosAzimuth = Math.max(-1.0, Math.min(1.0, cosAzimuth));
        double azimuthDeg = Math.toDegrees(Math.acos(cosAzimuth));
        if (hourAngle > 0) {
            azimuthDeg = 360.0 - azimuthDeg; // 오후 시간대 방위각 보정
        }

        // 6. 대기 투과 일사 계수 (0.0 ~ 1.0)
        double radiationFactor = (altitudeDeg > 0) ? Math.sin(altitudeRad) : 0.0;

        return new SolarAngles(altitudeDeg, azimuthDeg, radiationFactor);
    }
}