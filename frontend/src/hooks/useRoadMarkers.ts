import { useRef } from 'react';
import * as THREE from 'three';
import type { SimulationResponse } from '../types/climate';
import { getSunOcclusionRatio } from '../utils/climateVisualUtils';

interface RoadMarkerItem {
  pad: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  border: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  pole: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  badge: THREE.Sprite;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
}

export const useRoadMarkers = () => {
  const markersRef = useRef<RoadMarkerItem[]>([]);

  const initRoadMarkers = (scene: THREE.Scene) => {
    markersRef.current = [0, 1, 2, 3, 4].map(() => {
      const padGeom = new THREE.PlaneGeometry(2.4, 1.6);
      const pad = new THREE.Mesh(
        padGeom,
        new THREE.MeshBasicMaterial({
          color: 0xff4d4f,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        })
      );
      pad.rotation.x = -Math.PI / 2;

      const border = new THREE.LineSegments(
        new THREE.EdgesGeometry(padGeom),
        new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
      );
      border.rotation.x = -Math.PI / 2;

      const pole = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 1.2, 0),
        ]),
        new THREE.LineBasicMaterial({ color: 0xff4d4f, transparent: true, opacity: 0.85 })
      );

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff4d4f })
      );
      sphere.position.y = 1.2;

      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 150;
      const ctx = canvas.getContext('2d')!;
      const texture = new THREE.CanvasTexture(canvas);
      const badge = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false })
      );
      badge.position.y = 1.8;
      badge.scale.set(2.4, 1.0, 1);
      badge.renderOrder = 3000;

      scene.add(pad, border, pole, sphere, badge);
      return { pad, border, pole, sphere, badge, ctx, texture };
    });
  };

  const updateRoadMarkers = (
    currentLoc: { lat: number; lng: number },
    roadHeading: number,
    data: SimulationResponse | null,
    sunAlt: number,
    sunAzimuth: number,
    directRadiation: number,
    baseAir: number
  ) => {
    const points = data?.gridPoints || [];
    const roadRad = THREE.MathUtils.degToRad(roadHeading);
    const fwdX = Math.sin(roadRad);
    const fwdZ = -Math.cos(roadRad);

    const metersPerLat = 111000.0;
    const metersPerLng = 88000.0;

    markersRef.current.forEach((item, index) => {
      const pt = points[index];
      if (!pt || typeof pt.asphaltTemp !== 'number') {
        item.pad.visible = false;
        item.border.visible = false;
        item.pole.visible = false;
        item.sphere.visible = false;
        item.badge.visible = false;
        return;
      }

      // 도로 전방 거리 (5m, 11m, 17m...)
      const dist = 5.0 + index * 6.0;
      const posX = fwdX * dist;
      const posZ = fwdZ * dist;
      const posY = -1.6;

      item.pad.position.set(posX, posY, posZ);
      item.border.position.set(posX, posY, posZ);
      item.pole.position.set(posX, posY, posZ);
      item.sphere.position.set(posX, posY + 1.2, posZ);
      item.badge.position.set(posX, posY + 1.8, posZ);

      item.pad.visible = true;
      item.border.visible = true;
      item.pole.visible = true;
      item.sphere.visible = true;
      item.badge.visible = true;

      // -------------------------------------------------------------
      // [핵심 1] 개별 마커 지점의 실제 위도/경도 산출
      // -------------------------------------------------------------
      const markerLat = pt.lat ?? (currentLoc.lat + (-posZ / metersPerLat));
      const markerLng = pt.lng ?? (currentLoc.lng + (posX / metersPerLng));

      // 마커 지점 기준 건물 차폐율 계산
      const markerOcclusion = getSunOcclusionRatio(
        markerLat,
        markerLng,
        sunAzimuth,
        sunAlt,
        data?.surroundingBuildings
      );

      // -------------------------------------------------------------
      // [핵심 2] 정밀 그늘(차광) 판정
      // 1순위: 백엔드 격자점 데이터에 음영/일사 플래그가 명시된 경우 활용
      // 2순위: 일사량이 낮거나(야간/흐림), 건물이 태양을 20% 이상 가리기 시작할 때 그늘화
      // -------------------------------------------------------------
      const pointSolarRad = pt.solarRadiation ?? directRadiation;

      // 백엔드 명시 플래그 or 일사량 80 W/m² 이하 or 차폐율 0.25 초과 시 그늘로 판정
      const isBackendShaded = (pt as { isShaded?: boolean }).isShaded === true;
      const isLowRadiation = pointSolarRad < 80 || directRadiation <= 0 || sunAlt <= 0;
      const isBuildingOccluded = markerOcclusion > 0.25;

      const isShaded = isBackendShaded || isLowRadiation || isBuildingOccluded;

      // 유효 일사 비율 (0.0: 완전 그늘, 1.0: 맑은 직사광)
      const effectiveSunRatio = isShaded
        ? Math.max(0.0, Math.min(0.15, (1.0 - markerOcclusion) * (pointSolarRad / Math.max(1, directRadiation))))
        : Math.max(0.0, 1.0 - markerOcclusion);

      // -------------------------------------------------------------
      // [핵심 3] 그늘 보정 노면 온도 및 일사량 계산
      // -------------------------------------------------------------
      const rawTemp = pt.asphaltTemp;
      // 그늘 상태의 바닥 평형온도 (대기온 + 잔류 열용량 약 2.5°C)
      const baseShadeEquilibrium = Math.max(baseAir, baseAir + 2.5);

      const dynamicTemp = isShaded
        ? baseShadeEquilibrium + Math.max(0, rawTemp - baseShadeEquilibrium) * effectiveSunRatio
        : rawTemp;

      const dynamicRad = pointSolarRad * effectiveSunRatio;

      // -------------------------------------------------------------
      // [핵심 4] 시각화 및 라벨 상태 동기화
      // -------------------------------------------------------------
      const isCool = dynamicTemp < 30.0 || isShaded;
      const markerColor = isShaded
        ? 0x38bdf8 // 그늘 구역: 시원한 하늘색
        : dynamicTemp > 36.0
        ? 0xef4444 // 고온 직사광: 적색
        : 0xf97316; // 일반 직사광: 주황색

      item.pad.material.color.setHex(markerColor);
      item.pole.material.color.setHex(markerColor);
      item.sphere.material.color.setHex(markerColor);

      // 캔버스 뱃지 다시 그리기
      const { ctx, texture } = item;
      ctx.clearRect(0, 0, 360, 150);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(10, 10, 340, 130, 20);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = isShaded ? '#38bdf8' : dynamicTemp > 36 ? '#ef4444' : '#f97316';
      ctx.stroke();

      // 상단 타이틀 (그늘 vs 직사광 명확히 분기)
      ctx.fillStyle = isShaded ? '#38bdf8' : '#94a3b8';
      ctx.font = 'bold 22px sans-serif';
      const statusText = isShaded ? ' (그늘 구역)' : ' (직사광)';
      ctx.fillText(`지점 #${index + 1}${statusText}`, 28, 48);

      // 온도 수치
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(`${dynamicTemp.toFixed(1)}°C`, 28, 105);

      // 도달 일사량
      ctx.fillStyle = isShaded ? '#38bdf8' : '#fb923c';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(dynamicRad)} W/㎡`, 320, 105);
      ctx.restore();

      texture.needsUpdate = true;
    });
  };

  return { initRoadMarkers, updateRoadMarkers };
};