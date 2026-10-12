package com.climate.RS.service;

import com.climate.RS.dto.WeatherApiResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class WeatherApiService {

    private final RestTemplate restTemplate = new RestTemplate();

    public WeatherApiResponseDto fetchLiveWeather(double lat, double lng) {
        try {
            // URL 쿼리 파라미터 문자열 생성
            String url = String.format(
                    "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m,wind_speed_10m,wind_direction_10m,direct_normal_irradiance&timezone=Asia/Seoul",
                    lat, lng
            );

            // 실시간 날씨 데이터 조회 및 DTO 매핑
            return restTemplate.getForObject(url, WeatherApiResponseDto.class);
        } catch (Exception e) {
            System.err.println("실시간 기상 API 연동 오류 (기본값으로 대체): " + e.getMessage());
            return null;
        }
    }
}