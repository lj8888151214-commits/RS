import { useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SimulationResponse } from '../types/climate';

const NUM_PALMS = 6;
const PALM_SPACING = 9.0;
const PALM_SIDE_OFFSET = 5.0;

// 🐶 강아지 3마리 전용 설정
const NUM_DOGS = 3;
// 8.2m -> 4.0m로 수정하여 오른쪽 보도블록 위로 정확히 배치
const DOG_SIDE_OFFSET = 4.0;
const DOG_SCALE = 1.0;

export const usePalmTrees = (initialBaseAir: number = 25.0) => {
  const palmGroupRef = useRef<THREE.Group | null>(null);
  const dogGroupRef = useRef<THREE.Group | null>(null);
  const parentContainerRef = useRef<THREE.Group | null>(null);

  const palmInstancesRef = useRef<THREE.Group[]>([]);
  const dogInstancesRef = useRef<THREE.Group[]>([]);
  const mixersRef = useRef<THREE.AnimationMixer[]>([]);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // 35℃ 기준 분기: true면 야자수, false면 강아지
  const isExtremeHeatRef = useRef<boolean>(initialBaseAir >= 35.0);

  const applyVisibility = () => {
    if (palmGroupRef.current) {
      palmGroupRef.current.visible = isExtremeHeatRef.current;
    }
    if (dogGroupRef.current) {
      dogGroupRef.current.visible = !isExtremeHeatRef.current;
    }
  };

  const initPalmTrees = (sceneOrGroup: THREE.Group | THREE.Scene, _climateData?: SimulationResponse | null) => {
    parentContainerRef.current = sceneOrGroup as THREE.Group;

    // 🌴 야자수 컨테이너
    const palmGroup = new THREE.Group();
    palmGroup.visible = false;
    sceneOrGroup.add(palmGroup);
    palmGroupRef.current = palmGroup;

    // 🐕 강아지 컨테이너
    const dogGroup = new THREE.Group();
    dogGroup.visible = false;
    sceneOrGroup.add(dogGroup);
    dogGroupRef.current = dogGroup;

    const loader = new GLTFLoader();

    // 1. 야자수 로드 (6그루)
    loader.load(
      '/models/palmtree.glb',
      (gltf) => {
        const baseModel = gltf.scene;
        baseModel.scale.set(0.65, 0.65, 0.65);

        for (let i = 0; i < NUM_PALMS; i++) {
          const clone = baseModel.clone();
          palmGroup.add(clone);
          palmInstancesRef.current.push(clone);
        }
        applyVisibility();
      },
      undefined,
      (err) => console.warn('palmtree.glb 로드 실패:', err)
    );

    // 2. 강아지 로드 (3마리)
    loader.load(
      '/models/dog.glb',
      (gltf) => {
        const baseDog = gltf.scene;
        baseDog.scale.set(DOG_SCALE, DOG_SCALE, DOG_SCALE);

        for (let i = 0; i < NUM_DOGS; i++) {
          const pivot = new THREE.Group();
          const clone = baseDog.clone();

          clone.position.set(0, 0, 0);
          pivot.add(clone);

          dogGroup.add(pivot);
          dogInstancesRef.current.push(pivot);

          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(clone);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
            mixersRef.current.push(mixer);
          }
        }
        applyVisibility();
      },
      undefined,
      (err) => console.warn('dog.glb 로드 실패:', err)
    );
  };

  const updatePalmTreePositions = (
    roadHeading: number,
    scaleMultiplier: number = 1.0,
    isRotatingOrBlocked: boolean = false
  ) => {
    const delta = clockRef.current.getDelta();
    const elapsedTime = clockRef.current.getElapsedTime();

    if (mixersRef.current.length > 0) {
      mixersRef.current.forEach((mixer) => mixer.update(delta));
    }

    if (isRotatingOrBlocked || scaleMultiplier < 0.05) {
      if (palmGroupRef.current) palmGroupRef.current.visible = false;
      if (dogGroupRef.current) dogGroupRef.current.visible = false;
      return;
    }

    applyVisibility();

    const roadRad = THREE.MathUtils.degToRad(roadHeading);
    const forwardX = Math.sin(roadRad);
    const forwardZ = -Math.cos(roadRad);
    const rightX = Math.cos(roadRad);
    const rightZ = Math.sin(roadRad);

    // 🌴 야자수 위치 갱신
    palmInstancesRef.current.forEach((tree, i) => {
      const dist = (i + 1) * PALM_SPACING;
      const posX = forwardX * dist + rightX * PALM_SIDE_OFFSET;
      const posZ = forwardZ * dist + rightZ * PALM_SIDE_OFFSET;
      tree.position.set(posX, 0.0, posZ);
      tree.scale.setScalar(0.65 * scaleMultiplier);
    });

    // 🐕 강아지 3마리 인도 배치 (전방 7m~11m, 우측 3.8m~4.4m 인도 구역)
const dogOffsets = [
      { fwd: 7.5,  side: DOG_SIDE_OFFSET,       spinSpeed: 2.2, phase: 0.0, radius: 0.22 },
      { fwd: 9.3,  side: DOG_SIDE_OFFSET + 0.35, spinSpeed: 2.6, phase: 1.8, radius: 0.28 },
      { fwd: 11.2, side: DOG_SIDE_OFFSET - 0.2, spinSpeed: 2.0, phase: 3.5, radius: 0.20 },
    ];

    dogInstancesRef.current.forEach((pivot, i) => {
          const cfg = dogOffsets[i] || dogOffsets[0];
          const t = elapsedTime * cfg.spinSpeed + cfg.phase;

          // 🌀 작게 원을 그리며 도는 궤적 오프셋 (반경 약 20~28cm)
          const circleOffsetFwd = Math.cos(t) * cfg.radius;
          const circleOffsetSide = Math.sin(t) * cfg.radius;

          const posX = forwardX * (cfg.fwd + circleOffsetFwd) + rightX * (cfg.side + circleOffsetSide);
          const posZ = forwardZ * (cfg.fwd + circleOffsetFwd) + rightZ * (cfg.side + circleOffsetSide);

          // 🐾 지면 밀착: Y 높이를 0.02m로 바닥에 딱 맞춤
          const groundY = 0.02;

          pivot.position.set(posX, groundY, posZ);

          // 🔄 몸을 진행 방향/원을 따라 360도 한 바퀴 자연스럽게 회전
          // 도로 헤딩 + 원형 궤적 접선 방향(-t)
          const currentYaw = -roadRad - t + Math.PI / 2;

          pivot.rotation.set(
            0,          // 똑바로 선 자세 (피치 없음)
            currentYaw, // 360도 회전
            0,          // 뒹굴기 제거
            'YXZ'
          );

          pivot.scale.setScalar(DOG_SCALE * scaleMultiplier);
        });
  };

  const updatePalmBadges = (_data: SimulationResponse | null, currentAirTemp: number) => {
    const isOver35 = currentAirTemp >= 35.0;
    if (isExtremeHeatRef.current !== isOver35) {
      isExtremeHeatRef.current = isOver35;
      applyVisibility();
    }
  };

  const updateMovement = (
    _loc: { lat: number; lng: number },
    _heading: number,
    highestTemp: number
  ) => {
    if (highestTemp !== -999) {
      const isOver35 = highestTemp >= 35.0;
      isExtremeHeatRef.current = isOver35;
      applyVisibility();
    }
  };

  return {
    initPalmTrees,
    updateMovement,
    updatePalmTreePositions,
    updatePalmBadges,
  };
};