import * as THREE from 'three';

export type MaterialType = 'asphalt' | 'sidewalk';

/** 태양 글로우 스프라이트 텍스처 생성 */
export function createSunGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.9)');
  gradient.addColorStop(0.5, 'rgba(255, 150, 20, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** 3D 노면 상단 뱃지 캔버스 드로잉 (보도블럭/아스팔트 시인성 완벽 보장) */
export function drawSquareBadge(
  ctx: CanvasRenderingContext2D,
  dist: number,
  temp: number,
  isShadow: boolean,
  materialType: MaterialType
): void {
  // 1. 전체 캔버스 클리어
  ctx.clearRect(0, 0, 360, 150);

  // 2. 배경 박스
  const isSidewalk = materialType === 'sidewalk';
  ctx.fillStyle = isShadow
    ? 'rgba(8, 28, 54, 0.95)'
    : isSidewalk
    ? 'rgba(35, 23, 10, 0.95)'
    : 'rgba(42, 12, 12, 0.95)';
  ctx.fillRect(6, 6, 348, 138);

  // 3. 테두리 선
  ctx.lineWidth = 5;
  ctx.strokeStyle = isShadow ? '#00e5ff' : isSidewalk ? '#f59e0b' : '#ff4d4f';
  ctx.strokeRect(6, 6, 348, 138);

  // 4. 상단 라벨 텍스트 ([ 전방 Xm 보도블럭 / 아스팔트 ])
  ctx.fillStyle = isShadow ? '#38bdf8' : isSidewalk ? '#fbbf24' : '#fca5a5';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelName = isSidewalk ? '보도블럭' : '아스팔트';
  ctx.fillText(`[ 전방 ${dist}m ${labelName} ]`, 180, 42);

  // 5. 핵심: 대형 온도 수치 텍스트
  const displayTemp = typeof temp === 'number' && !isNaN(temp) ? temp : 25.0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(`${displayTemp.toFixed(1)}°C`, 180, 95);

  // 6. 하단 강조 인디케이터 바
  ctx.fillStyle = isShadow ? '#00e5ff' : isSidewalk ? '#f59e0b' : '#ff4d4f';
  ctx.fillRect(16, 130, 328, 5);
}

/** 건물 형상 기준 태양 소프트 차폐율(0.0 ~ 1.0) 계산 */
export function getSunOcclusionRatio(
  userLat: number,
  userLng: number,
  sunAzimuthDeg: number,
  sunAltDeg: number,
  buildings?: Array<{ lat: number; lon: number; heightMeters: number; name?: string }>
): number {
  if (!buildings || buildings.length === 0 || sunAltDeg <= 0) return 0.0;

  let maxOcclusion = 0.0;

  for (const b of buildings) {
    if (!b || typeof b.lat !== 'number' || typeof b.lon !== 'number') continue;

    // 미터 단위 거리 환산
    const dLat = (b.lat - userLat) * 111000.0;
    const dLng = (b.lon - userLng) * 88000.0;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

    if (dist < 3.0 || dist > 450.0) continue;

    // 관측자 기준 건물의 수평 방위각 (0~360도)
    let bldAzimuth = (Math.atan2(dLng, dLat) * 180.0) / Math.PI;
    if (bldAzimuth < 0) bldAzimuth += 360.0;

    // 아파트/빌딩 유효 높이 (최소 20m 보장)
    const effectiveHeight = Math.max(b.heightMeters || 25.0, 20.0);
    const bldMaxAlt = (Math.atan2(effectiveHeight, dist) * 180.0) / Math.PI;

    // 아파트 판상형 구조를 고려한 가로 너비(반경 25m, 전체 폭 약 50m 추정)
    const estimatedWidth = 25.0;
    const coreHalfWidth = Math.max(12.0, (estimatedWidth / dist) * (180.0 / Math.PI));

    // 태양 원반 크기 및 부분 차폐 여유각 (Soft Edge)
    const edgeMargin = 4.5;

    // 방위각 차이 계산 (원형 순환 보정)
    let azDiff = Math.abs(sunAzimuthDeg - bldAzimuth);
    if (azDiff > 180.0) {
      azDiff = 360.0 - azDiff; // 👈 뺄셈 연산자 복구
    }

    // 완전히 빗겨나간 경우 스킵
    if (sunAltDeg > bldMaxAlt + edgeMargin) continue;
    if (azDiff > coreHalfWidth + edgeMargin) continue;

    // 완전 차폐 구역 내부
    if (azDiff <= coreHalfWidth && sunAltDeg <= bldMaxAlt) {
      return 1.0;
    }

    // 부분 차폐 (소프트 엣지) 감쇄 계수 계산 (0.0 ~ 1.0)
    const azFactor =
      azDiff <= coreHalfWidth
        ? 1.0
        : 1.0 - Math.min(1.0, Math.max(0.0, (azDiff - coreHalfWidth) / edgeMargin));

    const altFactor =
      sunAltDeg <= bldMaxAlt
        ? 1.0
        : 1.0 - Math.min(1.0, Math.max(0.0, (sunAltDeg - bldMaxAlt) / edgeMargin));

    const occlusion = azFactor * altFactor;

    if (occlusion > maxOcclusion) {
      maxOcclusion = occlusion;
    }
  }

  return maxOcclusion;
}