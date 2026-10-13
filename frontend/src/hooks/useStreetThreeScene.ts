import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SimulationResponse } from '../types/climate';
import type { MaterialType } from '../utils/climateVisualUtils';
import { useThreeSun } from './useThreeSun';
import { usePalmTrees } from './usePalmTrees';
import { useRoadTires } from './useRoadTires';

// 🚫 트럭/장애물이 있어 가로수를 숨길 Pano ID 목록
const OBSTACLE_PANO_IDS = [
  '0C6KDvjuGAHjOQeHM33idg', // 👈 흰색 탑차가 주차된 현재 화면
  'YSUtgygI7Ic-MQn9fw0HxA',
  '2zEKnVnDKFu-pBK9CO9xBQ',
  'V_C9ARKxoMldMz-QxjKWbg',
  '2r3A2NOkrQuD8zgNAHwF_Q',
  'q3oiqPKhLk8dXO4SRBGHAw',
  'Jh9c8ctFyOm8tYqnuwTeow',
];

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
  walkMode?: 'road' | 'sidewalk';
  currentPanoId?: string; // 👈 현재 파노라마 ID
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
  walkMode = 'road',
  currentPanoId = '',
}: UseStreetThreeSceneParams) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const worldGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentHeadingRef = useRef<number>(heading);
  const roadFixedHeadingRef = useRef<number>(heading);
  const currentPitchRef = useRef<number>(0);
  const walkModeRef = useRef<'road' | 'sidewalk'>(walkMode);

  // ⚡ [핵심] 클로저 문제 해결: prop으로 들어온 currentPanoId를 최신 Ref에 지속 동기화
  const currentPanoIdRef = useRef<string>(currentPanoId);
  currentPanoIdRef.current = currentPanoId;

  // 시점 전환 애니메이션용 Ref
  const lastHeadingRef = useRef<number>(heading);
  const turnSpeedRef = useRef<number>(0);
  const transitionScaleRef = useRef<number>(1);
  const turningOffsetAngleRef = useRef<number>(0);

  walkModeRef.current = walkMode;

  const { initSun, update3DSunPosition } = useThreeSun();
  const {
    initPalmTrees,
    updateMovement,
    updatePalmTreePositions,
    updatePalmBadges,
  } = usePalmTrees(baseAir);
  const { initRoadTires, updateRoadTires, rollTires } = useRoadTires();

  const applyCameraPosition = () => {
    if (!cameraRef.current) return;
    const rad = THREE.MathUtils.degToRad(currentHeadingRef.current);
    const rightX = Math.cos(rad);
    const rightZ = Math.sin(rad);

    if (walkModeRef.current === 'sidewalk') {
      cameraRef.current.position.set(rightX * 3.2, 0.2, rightZ * 3.2);
    } else {
      cameraRef.current.position.set(0, 0, 0);
    }
  };

  const updateObjects = (
    currentLoc: { lat: number; lng: number },
    roadHeading: number,
    data: SimulationResponse | null
  ) => {
    roadFixedHeadingRef.current = roadHeading;
    currentHeadingRef.current = roadHeading;
    const highestTemp = Math.max(
      -999,
      ...(data?.gridPoints?.map((p) => p?.asphaltTemp ?? -999) || [-999])
    );

    updateMovement(currentLoc, roadHeading, highestTemp);
    updateRoadTires(roadHeading, data, baseAir, walkModeRef.current);
    if (updatePalmBadges) {
      updatePalmBadges(data, baseAir);
    }
    applyCameraPosition();
  };

  const triggerSunUpdate = (azimuthDeg: number, radiation: number, userShowSun: boolean) => {
    update3DSunPosition(location, sunAlt, azimuthDeg, radiation, userShowSun, climateData);
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    let animationId: number;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : window.innerWidth / 2;
    const height = rect.height > 0 ? rect.height : window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);
    worldGroupRef.current = worldGroup;

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

    initSun(scene);
    initRoadTires(worldGroup, () => {
      updateObjects(location, currentHeadingRef.current, climateData);
    });
    initPalmTrees(worldGroup, climateData);

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // 회전 속도 감지
      const isRotating = Math.abs(turnSpeedRef.current) > 0.065;

      if (isRotating) {
        turningOffsetAngleRef.current += turnSpeedRef.current * 0.055;
        transitionScaleRef.current = THREE.MathUtils.lerp(transitionScaleRef.current, 0, 0.35);
      } else {
        turningOffsetAngleRef.current = THREE.MathUtils.lerp(turningOffsetAngleRef.current, 0, 0.09);
        transitionScaleRef.current = THREE.MathUtils.lerp(transitionScaleRef.current, 1, 0.08);
      }

      turnSpeedRef.current *= 0.82;
      const currentScale = Math.max(0, transitionScaleRef.current);

      if (worldGroupRef.current) {
        worldGroupRef.current.rotation.y = THREE.MathUtils.degToRad(turningOffsetAngleRef.current * 5.0);
        worldGroupRef.current.scale.set(currentScale, currentScale, currentScale);
        worldGroupRef.current.visible = currentScale > 0.05;
      }

      // 🚫 [실시간 트럭 화면 판정] 최신 Ref를 직접 읽음
      const hasObstacle = OBSTACLE_PANO_IDS.includes(currentPanoIdRef.current);

      // 🌲 야자수 갱신: 트럭이 있는 화면이거나 화면 회전 중이면 즉시 숨김
      updatePalmTreePositions(
        roadFixedHeadingRef.current,
        currentScale,
        isRotating || hasObstacle
      );

      // 타이어 구름
      rollTires();

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

  useEffect(() => {
    updateObjects(location, currentHeadingRef.current, climateData);
    triggerSunUpdate(sunAzimuth, directRadiation, showSun);
  }, [
    walkMode,
    location,
    climateData,
    sunAlt,
    sunAzimuth,
    directRadiation,
    baseAir,
    showSun,
    materialType,
  ]);

  const syncCameraPOV = (headingDeg: number, pitchDeg: number, zoomLevel: number) => {
    if (!cameraRef.current) return;
    const safeHeading = Number.isFinite(headingDeg) ? headingDeg : 0;
    const safePitch = Number.isFinite(pitchDeg) ? pitchDeg : 0;
    const safeZoom = Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1;

    let delta = safeHeading - lastHeadingRef.current;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    if (Math.abs(delta) > 0.15) {
      turnSpeedRef.current = -delta;
    }
    lastHeadingRef.current = safeHeading;
    currentHeadingRef.current = safeHeading;
    currentPitchRef.current = safePitch;

    cameraRef.current.fov = Math.max(25, Math.min(100, 180 / Math.pow(2, safeZoom)));
    cameraRef.current.updateProjectionMatrix();
    cameraRef.current.rotation.set(
      THREE.MathUtils.degToRad(safePitch),
      THREE.MathUtils.degToRad(-safeHeading),
      0,
      'YXZ'
    );

    applyCameraPosition();
  };

  return {
    currentHeadingRef,
    updateObjects,
    update3DSunPosition: triggerSunUpdate,
    syncCameraPOV,
  };
};