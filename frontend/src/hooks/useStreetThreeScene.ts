import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SimulationResponse } from '../types/climate';
import type { MaterialType } from '../utils/climateVisualUtils';
import { useThreeSun } from './useThreeSun';
import { usePalmTrees } from './usePalmTrees';
import { useRoadTires } from './useRoadTires';

interface UseStreetThreeSceneParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  location: { lat: number; lng: number };
  climateData: SimulationResponse | null;
  sunAlt: number;
  sunAzimuth: number;
  directRadiation: number;
  baseAir: number;
  showSun: boolean;
  materialType: MaterialType;
  heading: number;
}

export const useStreetThreeScene = ({
  canvasRef,
  containerRef,
  location,
  climateData,
  sunAlt,
  sunAzimuth,
  directRadiation,
  baseAir,
  showSun,
  materialType,
  heading,
}: UseStreetThreeSceneParams) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentHeadingRef = useRef<number>(heading);

  // 1. 하위 시각화 훅 선언 (중복 선언 없이 1회만 호출)
  const { initSun, update3DSunPosition } = useThreeSun();
  const {
    initPalmTrees,
    updateMovement,
    updatePalmTreePositions,
    currentRenderDistRef,
  } = usePalmTrees(baseAir);
  const { initRoadTires, updateRoadTires, rollTires } = useRoadTires();

  // 2. 오브젝트 갱신: 이동 거리 계산 및 타이어 노면 정보 갱신
  const updateObjects = (
    currentLoc: { lat: number; lng: number },
    roadHeading: number,
    data: SimulationResponse | null
  ) => {
    currentHeadingRef.current = roadHeading;
    const highestTemp = Math.max(
      -999,
      ...(data?.gridPoints?.map((p) => p?.asphaltTemp ?? -999) || [-999])
    );

    updateMovement(currentLoc, roadHeading, highestTemp);
    updateRoadTires(roadHeading, data, baseAir);
  };

  const triggerSunUpdate = (azimuthDeg: number, radiation: number, userShowSun: boolean) => {
    update3DSunPosition(location, sunAlt, azimuthDeg, radiation, userShowSun, climateData);
  };

  // 3. Three.js 초기화 및 프레임 렌더 루프
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    let animationId: number;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : window.innerWidth / 2;
    const height = rect.height > 0 ? rect.height : window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sunLight.position.set(50, 100, 50);
    scene.add(ambientLight, sunLight);

    // 하위 모듈 등록
    initSun(scene);
    initRoadTires(scene, () => {
      updateObjects(location, currentHeadingRef.current, climateData);
    });
    initPalmTrees(scene);

    const animate = () => {
      animationId = requestAnimationFrame(animate);

     // 1. 야자수 위치 보간
           updatePalmTreePositions(currentHeadingRef.current);

           // 2. 타이어를 일정한 속도로 자연스럽게 굴림
           rollTires();

      // 전진 거리에 맞춰 타이어 회전 (currentRenderDistRef 안전 참조)
      if (currentRenderDistRef?.current !== undefined) {
        rollTires(currentRenderDistRef.current);
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth / 2;
      const h = containerRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (animationId) cancelAnimationFrame(animationId);
      renderer.dispose();
    };
  }, []);

  // 4. 환경 변수 변경 감지
  useEffect(() => {
    updateObjects(location, currentHeadingRef.current, climateData);
    triggerSunUpdate(sunAzimuth, directRadiation, showSun);
  }, [
    location,
    climateData,
    sunAlt,
    sunAzimuth,
    directRadiation,
    baseAir,
    showSun,
    materialType,
  ]);

  // 5. 시점(POV) 동기화
  const syncCameraPOV = (headingDeg: number, pitchDeg: number, zoomLevel: number) => {
    if (!cameraRef.current) return;
    const safeHeading = Number.isFinite(headingDeg) ? headingDeg : 0;
    const safePitch = Number.isFinite(pitchDeg) ? pitchDeg : 0;
    const safeZoom = Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1;

    currentHeadingRef.current = safeHeading;
    cameraRef.current.fov = Math.max(25, Math.min(100, 180 / Math.pow(2, safeZoom)));
    cameraRef.current.updateProjectionMatrix();
    cameraRef.current.rotation.set(
      THREE.MathUtils.degToRad(safePitch),
      THREE.MathUtils.degToRad(-safeHeading),
      0,
      'YXZ'
    );
  };

  return {
    currentHeadingRef,
    updateObjects,
    update3DSunPosition: triggerSunUpdate,
    syncCameraPOV,
  };
};