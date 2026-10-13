import { useRef } from 'react';
import * as THREE from 'three';

export const useStreetOcclusion = () => {
  const occlusionGroupRef = useRef<THREE.Group | null>(null);

  const initOcclusion = (scene: THREE.Scene, roadHeading: number) => {
    const group = new THREE.Group();
    scene.add(group);
    occlusionGroupRef.current = group;

   const occluderMat = new THREE.MeshBasicMaterial({
     color: 0xff0000,
     wireframe: true, // 빨간색 와이어프레임 박스로 눈에 보이게 표시
   });

    // 🧱 1. 공사장 하얀 펜스 가림벽
    // 높이를 5m -> 2.8m로 낮추어(실제 펜스 높이) 상단 나뭇잎이 잘리지 않도록 함
    // 두께: 0.3m, 높이: 2.8m, 길이: 120m
    const wallGeo = new THREE.BoxGeometry(0.3, 2.8, 120);
    const wallMesh = new THREE.Mesh(wallGeo, occluderMat);

    // 📍 위치 수정:
    // x: 기존 4.5m -> 5.8m (나뭇잎 흔들림 반경 밖으로 밀어냄)
    // y: 기존 1.2m -> 0.1m (펜스 지면 높이에 정확히 일치)
    // z: 전방 35m 구간
    wallMesh.position.set(5.8, 0.1, 35);
    wallMesh.renderOrder = 0;
    group.add(wallMesh);

    // 🚌 2. 버스/대형 차량 오클루더 (도로변 정차 차량 영역)
    const busGeo = new THREE.BoxGeometry(2.6, 3.2, 12.0);
    const busMesh = new THREE.Mesh(busGeo, occluderMat);
    // 버스 위치도 가로수 라인(x = 3.5m)을 침범하지 않도록 조정
    busMesh.position.set(5.2, 0.2, 28);
    busMesh.renderOrder = 0;
    group.add(busMesh);

    const roadRad = THREE.MathUtils.degToRad(roadHeading);
    group.rotation.set(0, -roadRad, 0);
  };

  const updateOcclusionHeading = (roadHeading: number) => {
    if (occlusionGroupRef.current) {
      const roadRad = THREE.MathUtils.degToRad(roadHeading);
      occlusionGroupRef.current.rotation.set(0, -roadRad, 0);
    }
  };

  return {
    initOcclusion,
    updateOcclusionHeading,
  };
};