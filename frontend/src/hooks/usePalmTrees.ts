import { useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { drawLeafBadge } from '../utils/streetBadges';

export const usePalmTrees = (baseAir: number) => {
  const palmTemplateRef = useRef<THREE.Group | null>(null);
  const palmTreeGroupRef = useRef<THREE.Group | null>(null);

  const currentRenderDistRef = useRef<number>(0);
  const targetDistRef = useRef<number>(0);
  const prevLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const isHeatWaveRef = useRef<boolean>(false);

  const initPalmTrees = (scene: THREE.Scene, onLoaded?: () => void) => {
    const rowGroup = new THREE.Group();
    rowGroup.visible = false;
    scene.add(rowGroup);
    palmTreeGroupRef.current = rowGroup;

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/models/palmtree.glb',
      (gltf) => {
        const model = gltf.scene;
        if (!model) return;

        const bbox = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetScale = Number.isFinite(maxDim) && maxDim > 0 ? 6.0 / maxDim : 1.0;
        model.scale.set(targetScale, targetScale, targetScale);

        const updatedBox = new THREE.Box3().setFromObject(model);
        model.position.y = -updatedBox.min.y;

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((m) => {
                m.depthTest = true;
                m.depthWrite = true;
                m.side = THREE.DoubleSide;
              });
            }
          }
        });

        palmTemplateRef.current = model;

        // 6그루 복제 및 잎사귀 뱃지 세팅
        while (rowGroup.children.length > 0) {
          rowGroup.remove(rowGroup.children[0]);
        }

        for (let i = 0; i < 6; i++) {
          const treeClone = model.clone(true);
          treeClone.visible = true;

          const badgeCanvas = document.createElement('canvas');
          badgeCanvas.width = 320;
          badgeCanvas.height = 140;
          const bCtx = badgeCanvas.getContext('2d')!;
          const bTexture = new THREE.CanvasTexture(badgeCanvas);

          const leafShadeTemp = Math.max(baseAir, baseAir + 2.5 + i * 0.3);
          drawLeafBadge(bCtx, leafShadeTemp, i);
          bTexture.needsUpdate = true;

          const leafBadge = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: bTexture, depthTest: false, depthWrite: false })
          );
          leafBadge.position.set(0, 3.8, 0);
          leafBadge.scale.set(1.9, 0.85, 1);
          leafBadge.renderOrder = 4000;

          treeClone.add(leafBadge);
          rowGroup.add(treeClone);
        }

        onLoaded?.();
      },
      undefined,
      (err) => console.warn('palmtree.glb 로드 실패:', err)
    );
  };

  // 위치 이동 시 전진 목표 거리 및 열섬 판정 업데이트
  const updateMovement = (
    currentLoc: { lat: number; lng: number },
    roadHeading: number,
    highestTemp: number
  ) => {
    const roadRad = THREE.MathUtils.degToRad(roadHeading);
    const metersPerLat = 111000.0;
    const metersPerLng = 88000.0;
    const fwdX = Math.sin(roadRad);
    const fwdZ = -Math.cos(roadRad);

    if (prevLocRef.current) {
      const dN = (currentLoc.lat - prevLocRef.current.lat) * metersPerLat;
      const dE = (currentLoc.lng - prevLocRef.current.lng) * metersPerLng;
      const stepMeters = dE * fwdX + -dN * fwdZ;

      if (Math.abs(stepMeters) > 0.3 && Math.abs(stepMeters) < 60.0) {
        targetDistRef.current += stepMeters * 0.55;
      }
    }
    prevLocRef.current = { lat: currentLoc.lat, lng: currentLoc.lng };
    isHeatWaveRef.current = highestTemp > 30.0 || baseAir + 14.0 > 30.0;
  };

  // 매 프레임 애니메이션 루프 내 호출
  const updatePalmTreePositions = (roadHeading: number) => {
    const rowGroup = palmTreeGroupRef.current;
    const templateModel = palmTemplateRef.current;
    if (!rowGroup || !templateModel || rowGroup.children.length === 0) return;

    if (!isHeatWaveRef.current) {
      rowGroup.visible = false;
      return;
    }
    rowGroup.visible = true;

    const roadRad = THREE.MathUtils.degToRad(roadHeading);
    const fwdX = Math.sin(roadRad);
    const fwdZ = -Math.cos(roadRad);
    const sideX = Math.cos(roadRad);
    const sideZ = Math.sin(roadRad);

    const sideOffset = 5.2;
    const treeSpacing = 6.5;
    const totalTrees = 6;
    const trackLength = totalTrees * treeSpacing;

    currentRenderDistRef.current += (targetDistRef.current - currentRenderDistRef.current) * 0.035;
    const moveOffset = ((currentRenderDistRef.current % trackLength) + trackLength) % trackLength;

    rowGroup.children.forEach((child, i) => {
      let relDist = 3.5 + i * treeSpacing - moveOffset;
      while (relDist < 2.0) relDist += trackLength;

      child.position.set(fwdX * relDist + sideX * sideOffset, -1.6, fwdZ * relDist + sideZ * sideOffset);
      child.rotation.y = -roadRad + (i % 3) * 0.35;

      const perspectiveScale = 1.0 + (relDist / 42.0) * 0.25;
      child.scale.set(
        templateModel.scale.x * perspectiveScale,
        templateModel.scale.y * perspectiveScale,
        templateModel.scale.z * perspectiveScale
      );
    });
  };

 // usePalmTrees.ts 하단 return 부분에 currentRenderDistRef 추가
 return {
     initPalmTrees,
     updateMovement,
     updatePalmTreePositions,
     currentRenderDistRef, // 👈 반드시 반환 목록에 포함
   };
 };