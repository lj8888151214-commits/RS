import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SimulationResponse } from '../types/climate';
import type { MaterialType } from '../utils/climateVisualUtils';

interface UseGoogleMapsParams {
  streetViewRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.RefObject<HTMLDivElement | null>;
  location: { lat: number; lng: number };
  heading: number;
  sunAzimuth: number;
  baseAir: number;
  directRadiation: number;
  materialType: MaterialType;
  climateData: SimulationResponse | null;
  walkMode?: 'road' | 'sidewalk';
  onLocationChange?: (newLoc: { lat: number; lng: number }) => void;
  onPOVChanged: (heading: number, pitch: number, zoom: number) => void;
  onStepForward?: (newHeading: number, nextLoc: { lat: number; lng: number }) => void;
  onPanoChanged?: (panoId: string) => void;
}

export const useGoogleMapsStreetView = ({
  streetViewRef,
  mapRef,
  location,
  heading,
  sunAzimuth,
  baseAir,
  directRadiation,
  materialType,
  climateData,
  walkMode = 'road',
  onLocationChange,
  onPOVChanged,
  onStepForward,
  onPanoChanged,
}: UseGoogleMapsParams) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const panoramaInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sunBeamPolylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapMarkersRef = useRef<any[]>([]);
  const currentHeadingRef = useRef<number>(heading);

  const updateSunBeamOnMap = (center: { lat: number; lng: number }, azimuth: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as unknown as { google?: any }).google;
    if (!mapInstanceRef.current || !g?.maps) return;

    const rad = THREE.MathUtils.degToRad(azimuth);
    const beamDist = 0.0016;
    const path = [
      center,
      { lat: center.lat + Math.cos(rad) * beamDist, lng: center.lng + Math.sin(rad) * beamDist },
    ];

    const polyline = sunBeamPolylineRef.current;
    if (polyline) {
      polyline.setPath(path);
    } else {
      sunBeamPolylineRef.current = new g.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#f59e0b',
        strokeOpacity: 0.95,
        strokeWeight: 4,
        icons: [{
          icon: { path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 4, fillColor: '#d97706', fillOpacity: 1 },
          offset: '100%',
        }],
        map: mapInstanceRef.current,
      });
    }
  };

  // 🏢 지도 화면 내 실제 건물 기준 태양 전면(양지)/후면(음지) 온도 마커 표시
  // 🏢 태양 기준 건물 블록 전면(양지)/후면(음지) 대형 타이포그래피 텍스트 표시
    const updateMapMarkers = (
      center: { lat: number; lng: number },
      _roadHeading: number,
      _points: NonNullable<SimulationResponse['gridPoints']>,
      currentMaterial: MaterialType
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as unknown as { google?: any }).google;
      if (!mapInstanceRef.current || !g?.maps) return;

      // 기존 마커 제거
      mapMarkersRef.current.forEach((m) => {
        try {
          m?.setMap(null);
        } catch {
          // ignore
        }
      });
      mapMarkersRef.current = [];

      const metersPerLat = 111000.0;
      const metersPerLng = 88000.0;
      const sunRad = THREE.MathUtils.degToRad(sunAzimuth);

      // 재질별 반사율 및 온도 계산
      const albedoFactor = currentMaterial === 'sidewalk' ? 0.82 : 1.0;
      const frontVal = (baseAir + (directRadiation / 950.0) * 16.2 * albedoFactor).toFixed(2);
      const backVal = Math.max(baseAir - 1.2, baseAir + (directRadiation / 950.0) * 2.5 * albedoFactor).toFixed(2);

      // 🏢 내 위치 도로변이 아닌, 우측 대형 건물군 중심 기준
      const bldCenterLat = center.lat + 15.0 / metersPerLat;
      const bldCenterLng = center.lng + 75.0 / metersPerLng;

      // 태양 방위각 방향으로 시원하게 벌어지는 거리 (전면/후면 65m)
      const spreadDist = 65.0;
      const fwdNorth = Math.cos(sunRad) * spreadDist;
      const fwdEast = Math.sin(sunRad) * spreadDist;

      const typographyMarkers = [
        // ☀️ 태양 전면 (양지 노면 반사온도)
        {
          text: frontVal,
          lat: bldCenterLat + fwdNorth / metersPerLat,
          lng: bldCenterLng + fwdEast / metersPerLng,
          strokeColor: '#ea580c', // 선명한 오렌지 외곽선
        },
        // 🌑 태양 후면 (음지/그늘 노면 반사온도)
        {
          text: backVal,
          lat: bldCenterLat - fwdNorth / metersPerLat,
          lng: bldCenterLng - fwdEast / metersPerLng,
          strokeColor: '#f97316', // 주황 외곽선
        },
      ];

      typographyMarkers.forEach((cfg) => {
        // 🎨 스케치와 동일한 흰색 채움 + 굵은 주황색 외곽선 타이포그래피 SVG
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="220" height="90" viewBox="0 0 220 90">
            <text x="110" y="62"
                  text-anchor="middle"
                  font-family="system-ui, -apple-system, sans-serif, 'Noto Sans KR'"
                  font-size="52"
                  font-weight="900"
                  fill="#ffffff"
                  stroke="${cfg.strokeColor}"
                  stroke-width="7"
                  stroke-linejoin="round"
                  paint-order="stroke fill">
              ${cfg.text}
            </text>
          </svg>
        `.trim();

        const marker = new g.maps.Marker({
          position: { lat: cfg.lat, lng: cfg.lng },
          map: mapInstanceRef.current,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new g.maps.Size(150, 62),
            anchor: new g.maps.Point(75, 31),
          },
          zIndex: 9999,
        });

        mapMarkersRef.current.push(marker);
      });
    };

  useEffect(() => {
    let isCleanedUp = false;

    const initMaps = () => {
      if (isCleanedUp) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as unknown as { google?: any }).google;
      if (!streetViewRef.current || !mapRef.current || !g?.maps) return;

      const safeInitialHeading = Number.isFinite(heading) ? heading : 0;

      const panorama = new g.maps.StreetViewPanorama(streetViewRef.current, {
        position: location,
        pov: { heading: safeInitialHeading, pitch: 10 },
        zoom: 1,
        disableDefaultUI: true,
        linksControl: true,
        clickToGo: true,
      });
      panoramaInstanceRef.current = panorama;

      const map = new g.maps.Map(mapRef.current, {
        center: location,
        zoom: 17,
        mapTypeId: 'roadmap',
        streetViewControl: false,
      });
      mapInstanceRef.current = map;

      const marker = new g.maps.Marker({
        position: location,
        map: map,
        title: '내 위치',
      });
      markerInstanceRef.current = marker;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addListener('click', (e: any) => {
        const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        panorama.setPosition(next);
        if (onLocationChange) onLocationChange(next);
      });

      const handlePOV = () => {
        if (!panorama) return;
        const pov = panorama.getPov();
        if (!pov) return;

        const safeHeading = Number.isFinite(pov.heading) ? pov.heading : safeInitialHeading;
        const safePitch = Number.isFinite(pov.pitch) ? pov.pitch : 0;

        const rawZoom = panorama.getZoom();
        const safeZoom = (typeof rawZoom === 'number' && Number.isFinite(rawZoom) && rawZoom > 0) ? rawZoom : 1;

        currentHeadingRef.current = safeHeading;
        onPOVChanged(safeHeading, safePitch, safeZoom);
      };

      panorama.addListener('pano_changed', () => {
        const panoId = panorama.getPano();
        if (panoId) {
          console.log('📍 현재 스트리트뷰 Pano ID:', panoId);
          if (onPanoChanged) {
            onPanoChanged(panoId);
          }
        }
      });

      panorama.addListener('pov_changed', handlePOV);
      panorama.addListener('zoom_changed', handlePOV);
      panorama.addListener('position_changed', () => {
        const pos = panorama.getPosition();
        if (pos) {
          const next = { lat: pos.lat(), lng: pos.lng() };
          map.setCenter(pos);
          marker.setPosition(pos);
          updateSunBeamOnMap(next, sunAzimuth);
          if (onLocationChange) onLocationChange(next);

          const currentPov = panorama.getPov();
          const curHeading = (currentPov && Number.isFinite(currentPov.heading))
            ? currentPov.heading
            : heading;
          currentHeadingRef.current = curHeading;

          updateMapMarkers(next, curHeading, climateData?.gridPoints || [], materialType);

          if (onStepForward) {
            onStepForward(curHeading, next);
          }
        }
      });

      updateSunBeamOnMap(location, sunAzimuth);
      updateMapMarkers(location, safeInitialHeading, climateData?.gridPoints || [], materialType);
      handlePOV();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gCheck = (window as unknown as { google?: any }).google;
    if (!document.getElementById('google-maps-script') && !gCheck?.maps) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBFkCNMvQEdgwEq4iuJPvEDGFmZxp9gPQI';
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      document.head.appendChild(script);
    }

    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as unknown as { google?: any }).google;
      if (g?.maps) {
        clearInterval(interval);
        initMaps();
      }
    }, 100);

    return () => {
      isCleanedUp = true;
      clearInterval(interval);
    };
  }, []);

  // 🚶 보도블럭 ↔ 🛣️ 도로 전환 시 시점 전환
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as unknown as { google?: any }).google;
    if (!panoramaInstanceRef.current || !g?.maps) return;

    const panorama = panoramaInstanceRef.current;
    const baseHeading = currentHeadingRef.current;

    if (walkMode === 'sidewalk') {
      panorama.setPov({
        heading: (baseHeading + 32) % 360,
        pitch: -8,
      });
      panorama.setZoom(1.15);

      const svService = new g.maps.StreetViewService();
      const rightRad = THREE.MathUtils.degToRad(baseHeading + 90);
      const metersPerLat = 111000.0;
      const metersPerLng = 88000.0;
      const sideLat = location.lat + (Math.cos(rightRad) * 4.5) / metersPerLat;
      const sideLng = location.lng + (Math.sin(rightRad) * 4.5) / metersPerLng;

      svService.getPanorama(
        {
          location: { lat: sideLat, lng: sideLng },
          radius: 15,
          preference: g.maps.StreetViewPreference.NEAREST,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data: any, status: any) => {
          if (status === g.maps.StreetViewStatus.OK && data?.location?.pano) {
            panorama.setPano(data.location.pano);
          }
        }
      );
    } else {
      panorama.setPov({
        heading: baseHeading,
        pitch: 0,
      });
      panorama.setZoom(1.0);
    }
  }, [walkMode, location]);

  useEffect(() => {
    updateSunBeamOnMap(location, sunAzimuth);
    updateMapMarkers(
      location,
      currentHeadingRef.current,
      climateData?.gridPoints || [],
      materialType
    );
  }, [location, sunAzimuth, climateData, materialType]);

  return {
    mapInstanceRef,
    updateSunBeamOnMap,
    updateMapMarkers,
  };
};