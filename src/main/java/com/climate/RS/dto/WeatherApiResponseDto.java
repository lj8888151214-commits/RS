package com.climate.RS.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WeatherApiResponseDto {

    private CurrentWeather current;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CurrentWeather {
        private String time;

        @JsonProperty("temperature_2m")
        private double temperature2m; // 기온 (°C)

        @JsonProperty("wind_speed_10m")
        private double windSpeed10m; // 풍속 (m/s)

        @JsonProperty("wind_direction_10m")
        private double windDirection10m; // 풍향 (°)

        @JsonProperty("direct_normal_irradiance")
        private double directNormalIrradiance; // 직달 일사량 (W/m²)
    }
}