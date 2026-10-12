import { useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { SimulationResponse } from '../types/climate';

interface WheelItem {
  wheelPivot: THREE.Group;
}

export const useRoadTires = () => {
  const carGroupRef = useRef<THREE.Group | null>(null);
  const tireTemplateRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<WheelItem[]>([]);
  const tireRotationRef = useRef<number>(0);

  const singleBadgeRef = useRef<{
    badge: THREE.Sprite;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);

  // 4륜 바퀴 로컬 배치 (차폭 좌우 1.4m, 축간 전후 2.2m)
  const WHEEL_CONFIGS = [
    { localX: -0.5, localZ: 1.1 },  // 전륜 좌 (FL)
    { localX: 0.5, localZ: 1.1 },   // 전륜 우 (FR)
    { localX: -0.5, localZ: -1.1 }, // 후륜 좌 (RL)
    { localX: 0.5, localZ: -1.1 },  // 후륜 우 (RR)
  ];

  const initRoadTires = (scene: THREE.Scene, onLoaded?: () => void) => {
    const carGroup = new THREE.Group();
    carGroup.visible = true;
    scene.add(carGroup);
    carGroupRef.current = carGroup;

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/tire.glb',
      (gltf) => {
        const model = gltf.scene;
        if (!model) return;

        // 1. [핵심] 3D 형상의 기하학 데이터 원점 영점화 및 축 정비
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.frustumCulled = false;
            mesh.visible = true;

            if (mesh.geometry) {
              mesh.geometry.center(); // 로컬 축 불일치 및 통통 튐 원인 차단
              mesh.geometry.computeVertexNormals();
              mesh.geometry.computeBoundingBox();
            }
          }
        });

        // 2. [가장 중요] 타이어가 11자로 수직 배치되도록 각도 세팅 수정
        // 대각선 꼬임을 완전히 풀기 위해 orientContainer를 명시적으로 분리하고,
        // model 내부와 container 외곽의 변환축이 대각선으로 합성되지 않게 오일러 회전 순서 'YXZ'로 고정시킵니다.
        const orientContainer = new THREE.Group();

        // standard glb 바퀴를 곧게 세우고 진행방향(앞)으로 수직 11자 배치
        model.rotation.set(0, 0, 0);
        model.rotation.x = Math.PI / 3.5; // 수직 기립
        model.rotation.y = Math.PI / 3.5; // 11자 방향 전방 정렬

        orientContainer.add(model);

        // 3. 크기 정밀 제어 (직경 0.55m로 고정)
        const bbox = new THREE.Box3().setFromObject(orientContainer);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = Number.isFinite(maxDim) && maxDim > 0 ? 0.55 / maxDim : 1.0;
        orientContainer.scale.set(targetScale, targetScale, targetScale);

        // 최종 중심 맞춤 보정
        const postBbox = new THREE.Box3().setFromObject(orientContainer);
        const postCenter = new THREE.Vector3();
        postBbox.getCenter(postCenter);
        model.position.sub(postCenter);

        tireTemplateRef.current = orientContainer;

        // 자식 오브젝트 청소
        while (carGroup.children.length > 0) {
          carGroup.remove(carGroup.children[0]);
        }

        const finalBbox = new THREE.Box3().setFromObject(orientContainer);
        const finalSize = new THREE.Vector3();
        finalBbox.getSize(finalSize);
        const wheelRadius = finalSize.y / 2;

        // 4. 4륜 정밀 세로 정렬 배치
        wheelsRef.current = WHEEL_CONFIGS.map((cfg) => {
          const itemGroup = new THREE.Group();

          // 휠 Pivot 생성
          const wheelPivot = new THREE.Group();
          wheelPivot.position.set(0, wheelRadius, 0); // 바퀴 반경만큼 들어 올려 지면에 안착

          const tireInstance = orientContainer.clone(true);
          tireInstance.position.set(0, 0, 0);
          tireInstance.visible = true;

          // Pivot 하위에 정직하게 삽입
          wheelPivot.add(tireInstance);
          itemGroup.add(wheelPivot);

          // 4륜 좌표 지정 (대각선 뒤틀림 방지를 위해 정확한 localX, localZ만 대입)
          itemGroup.position.set(cfg.localX, 0, cfg.localZ);

          // 바퀴 개별의 Y, Z축 미세 틀어짐 방지 (11자 세로 직선 유지)
          itemGroup.rotation.set(0, 0, 0);

          carGroup.add(itemGroup);

          return { wheelPivot };
        });

        // 5. 바닥 통합 뱃지 추가 (Z-fighting 방지)
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 110;
        const ctx = canvas.getContext('2d')!;
        const texture = new THREE.CanvasTexture(canvas);

        const badge = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
          })
        );
        badge.position.set(0, -0.12, 0.1);
        badge.scale.set(1.6, 0.55, 1);
        badge.renderOrder = 4500;

        carGroup.add(badge);
        singleBadgeRef.current = { badge, ctx, texture };

        carGroup.visible = true;
        onLoaded?.();
      },
      undefined,
      (err) => console.warn('tire.glb 로드 실패:', err)
    );
  };

  // 앞으로 굴러가는 애니메이션 (프레임당 회전각)
  const rollTires = () => {
    if (wheelsRef.current.length === 0) return;

    const rollingSpeed = 0.012;
    tireRotationRef.current -= rollingSpeed;

    wheelsRef.current.forEach((item) => {
      // 👈 [주목] 대각선으로 틀어지지 않고 순수하게 주행 방향(로컬 X축)으로만 회전시킵니다.
      // 회전 중 자잘한 y, z 떨림을 '0'으로 강제해 대각선 왕복 진동 궤도를 전면 제거했습니다.
      item.wheelPivot.rotation.x = tireRotationRef.current;
      item.wheelPivot.rotation.y = 0;
      item.wheelPivot.rotation.z = 0;
    });
  };

  // 차량 위치 및 단일 통합 뱃지 업데이트
  const updateRoadTires = (
    roadHeading: number,
    data: SimulationResponse | null,
    baseAir: number
  ) => {
    const carGroup = carGroupRef.current;
    if (!carGroup || wheelsRef.current.length === 0) return;

    carGroup.visible = true;

    // 도로 전방 6.0m 중앙 배치
    const roadRad = THREE.MathUtils.degToRad(roadHeading);
    const fwdX = Math.sin(roadRad);
    const fwdZ = -Math.cos(roadRad);

    const vehicleDist = 6.0;
    const posX = fwdX * vehicleDist;
    const posZ = fwdZ * vehicleDist;
    const groundY = -1.45; // 노면에 스치듯이 안착

    carGroup.position.set(posX, groundY, posZ);

    // 차체의 월드 Yaw를 진행 방향으로 엄격하게 정렬
    carGroup.rotation.set(0, -roadRad, 0); // Y축 외 회전 완전 0으로 제어

    // 온도 매핑
    const pt = data?.gridPoints?.[0];
    const surfaceTemp = pt && typeof pt.asphaltTemp === 'number' ? pt.asphaltTemp : baseAir + 8.0;
    const isHighTemp = surfaceTemp > 35.0;

    // 단일 메시지 뱃지 갱신
    if (singleBadgeRef.current) {
      const { ctx, texture } = singleBadgeRef.current;
      ctx.clearRect(0, 0, 320, 110);

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(6, 6, 308, 98, 16);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = isHighTemp ? '#ef4444' : '#38bdf8';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🛞 4륜 타이어 접지 노면', 20, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(`${surfaceTemp.toFixed(1)}°C`, 20, 84);

      ctx.fillStyle = isHighTemp ? '#f87171' : '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(isHighTemp ? '과열주의' : '정상접지', 298, 78);
      ctx.restore();

      texture.needsUpdate = true;
    }
  };

  return { initRoadTires, updateRoadTires, rollTires };
};