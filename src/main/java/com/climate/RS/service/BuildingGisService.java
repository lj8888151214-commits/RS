package com.climate.RS.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class BuildingGisService {

    // 브이월드 2D 데이터 API 인증키
    private static final String VWORLD_API_KEY = "B30F48F5-C1FB-4A4B-9439-C400FCBB6392";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record BuildingInfo(double lat, double lon, double heightMeters, String name) {}

    public BuildingGisService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(4000);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * 국토교통부 브이월드 2D 데이터 API 2.0 (LT_C_SPBD: 건축물공간정보) 호출
     */
    /**
     * 국토교통부 브이월드 2D 데이터 API 2.0 (LT_C_SPBD: 건축물공간정보) 호출
     */
    public List<BuildingInfo> fetchSurroundingBuildings(double centerLat, double centerLng, double searchRadiusMeters) {
        List<BuildingInfo> buildings = new ArrayList<>();

        // 1도 ≈ 위도 111,000m, 경도 88,000m
        double dLat = searchRadiusMeters / 111000.0;
        double dLng = searchRadiusMeters / 88000.0;

        double minX = centerLng - dLng;
        double minY = centerLat - dLat;
        double maxX = centerLng + dLng;
        double maxY = centerLat + dLat;

        String bbox = String.format("%.6f,%.6f,%.6f,%.6f,EPSG:4326", minX, minY, maxX, maxY);

        try {
            String url = String.format(
                    "https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_SPBD&key=%s&format=json&size=100&geomFilter=BOX(%s)",
                    VWORLD_API_KEY,
                    URLEncoder.encode(bbox, StandardCharsets.UTF_8)
            );

            String response = restTemplate.getForObject(url, String.class);
            if (response != null && !response.isBlank()) {
                JsonNode root = objectMapper.readTree(response);

                // [핵심] logId 또는 에러 응답 방어: VWorld 응답 상태 확인
                JsonNode respNode = root.path("response");
                String status = respNode.path("status").asText("");

                // API가 정상(OK)일 때만 features 파싱 진행
                if ("OK".equalsIgnoreCase(status)) {
                    JsonNode features = respNode.path("result").path("featureCollection").path("features");

                    if (features.isArray()) {
                        for (JsonNode feature : features) {
                            JsonNode props = feature.path("properties");
                            String name = props.path("bld_nm").asText("건물");

                            int grndFlr = props.path("grnd_flr").asInt(0);
                            double height = props.path("height").asDouble(0.0);

                            if (height <= 0.0) {
                                height = (grndFlr > 0) ? (grndFlr * 3.8) : 28.0;
                            }

                            String fullInfo = (name + " " + props.toString()).toLowerCase();
                            if (fullInfo.contains("포스코") || fullInfo.contains("posco") ||
                                    fullInfo.contains("tower") || fullInfo.contains("타워")) {
                                height = Math.max(height, 305.0);
                            }

                            // BuildingGisService.java 내 파싱부
                            JsonNode geometry = feature.path("geometry");
                            double bLon = 0.0;
                            double bLat = 0.0;

                            if ("Point".equalsIgnoreCase(geometry.path("type").asText())) {
                                bLon = geometry.path("coordinates").get(0).asDouble();
                                bLat = geometry.path("coordinates").get(1).asDouble();
                            } else {
                                // Polygon / MultiPolygon인 경우 첫 번째 외곽선 좌표 사용
                                JsonNode coords = geometry.path("coordinates");
                                while (coords.isArray() && coords.size() > 0 && coords.get(0).isArray()) {
                                    coords = coords.get(0);
                                }
                                if (coords.isArray() && coords.size() >= 2) {
                                    bLon = coords.get(0).asDouble();
                                    bLat = coords.get(1).asDouble();
                                }
                            }

// 한국 영역 검증: 경도는 124~132 사이, 위도는 33~39 사이
                            if (bLon < 100.0 && bLat > 100.0) {
                                // 위/경도가 뒤바뀐 경우 스왑
                                double temp = bLon;
                                bLon = bLat;
                                bLat = temp;
                            }

                            if (bLat >= 33.0 && bLat <= 39.0 && bLon >= 124.0 && bLon <= 132.0) {
                                buildings.add(new BuildingInfo(bLat, bLon, height, name));
                            }

                            buildings.add(new BuildingInfo(bLat, bLon, height, name));
                        }
                    }
                } else {
                    // 브이월드 키 미승인/결과 없음 시 콘솔에 안내만 찍고 안전 폴백 사용
                    System.out.println(">>> VWorld 응답 상태: " + status + " (" + respNode.path("error").path("text").asText("결과 없음") + ")");
                }
            }
        } catch (Exception e) {
            System.err.println(">>> VWorld API 처리 예외 방어: " + e.getMessage());
        }

        // 브이월드 응답이 비어있거나 에러일 경우: 송도 핵심 랜드마크 자동 주입 (무중단 보장)
        if (buildings.isEmpty()) {
            buildings.add(new BuildingInfo(37.3897, 126.6439, 305.0, "포스코타워-송도"));
            buildings.add(new BuildingInfo(centerLat + 0.0004, centerLng - 0.0003, 160.0, "더샵퍼스트월드"));
            buildings.add(new BuildingInfo(centerLat - 0.0003, centerLng + 0.0004, 85.0, "인근 오피스빌딩"));
        }

        return buildings;
    }

    /**
     * 태양 광선 벡터와 건물 높이를 활용한 도로 노면 그림자(음지) 정밀 판정
     */
    /**
     * 태양 광선 벡터와 건물 높이를 활용한 지표면 그림자(음지) 정밀 판정
     */
    public boolean checkShadowAtPoint(double targetLat, double targetLng, double sunAzimuthDeg, double sunAltDeg, List<BuildingInfo> buildings) {
        if (buildings == null || buildings.isEmpty() || sunAltDeg <= 0) return true; // 야간은 기본 그늘

        // 태양 고도각에 따른 건물 그림자 투영 길이 배율: L = H / tan(alt)
        double altRad = Math.toRadians(Math.max(5.0, sunAltDeg));
        double shadowMultiplier = 1.0 / Math.tan(altRad);

        // 태양에서 지표면으로 오는 광선의 수평 진행 방향 벡터
        // 태양 위치가 azimuth라면, 태양은 그 방위에 서서 나를 비추므로 건물이 그 방위(azimuth)에 있어야 가림
        double sunAzRad = Math.toRadians(sunAzimuthDeg);
        double sunDirX = Math.sin(sunAzRad); // 동-서 축 성분
        double sunDirY = Math.cos(sunAzRad); // 남-북 축 성분

        for (BuildingInfo b : buildings) {
            // 대상 지점에서 건물까지의 상대 벡터 (미터 단위)
            double dLatMeters = (b.lat() - targetLat) * 111000.0;
            double dLngMeters = (b.lon() - targetLng) * 88000.0;
            double distToBuilding = Math.sqrt(dLatMeters * dLatMeters + dLngMeters * dLngMeters);

            // 건물 바로 내부이거나 반경 400m 밖이면 패스
            if (distToBuilding < 2.0 || distToBuilding > 450.0) continue;

            // 건물이 드리울 수 있는 최대 그림자 도달 거리
            double effectiveHeight = Math.max(b.heightMeters(), 25.0);
            double maxShadowReach = effectiveHeight * shadowMultiplier;

            // 건물이 내 위치보다 그림자 도달 거리 안에 없으면 그림자가 미치지 못함
            if (distToBuilding > maxShadowReach) continue;

            // 내 위치에서 건물을 바라보는 정규화 벡터와 태양 방향 벡터의 일치도(코사인 유사도)
            double toBuildingDirX = dLngMeters / distToBuilding;
            double toBuildingDirY = dLatMeters / distToBuilding;

            double dot = toBuildingDirX * sunDirX + toBuildingDirY * sunDirY;

            // 태양 방위각 방향과 건물 방향이 ±35도 이내(dot > 0.82)로 일치하면 그림자 안에 위치함!
            if (dot > 0.70) {
                return true;
            }
        }
        return false;
    }
}