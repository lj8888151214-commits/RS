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
  onLocationChange?: (newLoc: { lat: number; lng: number }) => void;
  onPOVChanged: (heading: number, pitch: number, zoom: number) => void;
  // [보완] 이동 시 새 좌표(nextLoc)까지 전달받도록 타입 시그니처 일치
  onStepForward?: (newHeading: number, nextLoc: { lat: number; lng: number }) => void;
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
  onLocationChange,
  onPOVChanged,
  onStepForward,
}: UseGoogleMapsParams) => {
  const panoramaInstanceRef = useRef<unknown>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markerInstanceRef = useRef<unknown>(null);
  const sunBeamPolylineRef = useRef<unknown>(null);
  const mapMarkersRef = useRef<unknown[]>([]);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const polyline = sunBeamPolylineRef.current as any;
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

  const updateMapMarkers = (
    center: { lat: number; lng: number },
    roadHeading: number,
    points: NonNullable<SimulationResponse['gridPoints']>,
    currentMaterial: MaterialType
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as unknown as { google?: any }).google;
    if (!mapInstanceRef.current || !g?.maps) return;

    mapMarkersRef.current.forEach((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m as any)?.setMap(null);
    });
    mapMarkersRef.current = [];

    const offsetDistance = currentMaterial === 'sidewalk' ? 3.5 : 0.0;
    const safeHeading = Number.isFinite(roadHeading) ? roadHeading : 0;
    const roadRad = THREE.MathUtils.degToRad(safeHeading);
    const metersPerLat = 111000.0;
    const metersPerLng = 88000.0;

    const fwdX = Math.sin(roadRad);
    const fwdZ = -Math.cos(roadRad);
    const sideX = Math.cos(roadRad);
    const sideZ = Math.sin(roadRad);

    // [개선] 3D 가로수길 8그루 라인(4m ~ 46m)과 1:1로 일치시킨 8개 좌표
    const visualDists = [4.0, 10.0, 16.0, 22.0, 28.0, 34.0, 40.0, 46.0];

    visualDists.forEach((dist, idx) => {
      const pt = points[idx % (points.length || 1)];
      const isShadow = pt?.isShadow ?? false;
      const rawTemp = (pt && typeof pt.asphaltTemp === 'number')
        ? pt.asphaltTemp
        : (isShadow ? baseAir - 1.2 : baseAir + (directRadiation / 950.0) * 16.0);
      const distVariation = Math.sin(idx * 1.3) * 0.4 + (idx * 0.15);
      const sidewalkReduction = isShadow ? 1.5 : 9.5;

      const targetTemp = currentMaterial === 'sidewalk'
        ? Math.max(baseAir - 1.0, rawTemp - sidewalkReduction + distVariation)
        : (rawTemp + distVariation);

      const isOver30 = targetTemp > 10.0 || (baseAir + 14.0) > 30.0;
      // 3D 뷰의 sideOffset(5.2m)과 동일하게 보도블럭 우측 라인에 핀 배치
      const markerOffset = isOver30 ? 5.2 : offsetDistance;
      const colorHex = isShadow ? '#00e5ff' : (currentMaterial === 'sidewalk' ? '#f59e0b' : '#ff4d4f');

      const dNorthMeters = -(fwdZ * dist + sideZ * markerOffset);
      const dEastMeters = fwdX * dist + sideX * markerOffset;

      const markerPos = {
        lat: center.lat + dNorthMeters / metersPerLat,
        lng: center.lng + dEastMeters / metersPerLng,
      };

      const mapMarker = new g.maps.Marker({
        position: markerPos,
        map: mapInstanceRef.current,
        title: isOver30 ? `[야자수 가로수 #${idx + 1}] 전방 ${dist.toFixed(1)}m` : `전방 ${dist.toFixed(1)}m 노면`,
        icon: isOver30
          ? {
              url: 'https://cdn-icons-png.flaticon.com/512/3429/3429141.png',
              scaledSize: new g.maps.Size(24, 24),
              origin: new g.maps.Point(0, 0),
              anchor: new g.maps.Point(12, 24),
            }
          : {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: colorHex,
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
            },
      });

      mapMarkersRef.current.push(mapMarker);
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

          // [핵심] 걸어갈 때마다 바뀐 위치(next)를 3D 씬으로 넘겨서 나무를 상대 거리만큼 스쳐 지나가게 함
          if (onStepForward) {
            onStepForward(curHeading, next);
          }
        }
      });

      updateSunBeamOnMap(location, sunAzimuth);
      handlePOV();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gCheck = (window as unknown as { google?: any }).google;
        if (!document.getElementById('google-maps-script') && !gCheck?.maps) {
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBFkCNMvQEdgwEq4iuJPvEDGFmZxp9gPQI';
          const script = document.createElement('script');
          script.id = 'google-maps-script';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
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

  // 상태 변동 시 지도 마커 갱신
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