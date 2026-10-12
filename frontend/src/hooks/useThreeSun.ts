import { useRef } from 'react';
import * as THREE from 'three';
import { createSunGlowTexture, getSunOcclusionRatio } from '../utils/climateVisualUtils';
import type { SimulationResponse } from '../types/climate';

export const useThreeSun = () => {
  const sunGroupRef = useRef<THREE.Group | null>(null);

  const initSun = (scene: THREE.Scene) => {
    const sunGroup = new THREE.Group();
    sunGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(12, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })
      )
    );

    const glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createSunGlowTexture(),
        color: 0xffe066,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
      })
    );
    glowSprite.scale.set(65, 65, 1);
    sunGroup.add(glowSprite);

    scene.add(sunGroup);
    sunGroupRef.current = sunGroup;
    return sunGroup;
  };

  const update3DSunPosition = (
    location: { lat: number; lng: number },
    sunAlt: number,
    azimuthDeg: number,
    radiation: number,
    userShowSun: boolean,
    climateData: SimulationResponse | null
  ) => {
    const sunGroup = sunGroupRef.current;
    if (!sunGroup) return;

    if (!userShowSun || radiation <= 0) {
      sunGroup.visible = false;
      return;
    }

    const occlusion = getSunOcclusionRatio(
      location.lat,
      location.lng,
      azimuthDeg,
      sunAlt,
      climateData?.surroundingBuildings
    );

    if (occlusion >= 0.98) {
      sunGroup.visible = false;
      return;
    }

    sunGroup.visible = true;
    const visibility = Math.max(0.0, 1.0 - occlusion);

    sunGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).transparent = true;
        (child.material as THREE.MeshBasicMaterial).opacity = visibility;
      } else if (child instanceof THREE.Sprite) {
        (child.material as THREE.SpriteMaterial).transparent = true;
        (child.material as THREE.SpriteMaterial).opacity = visibility;
        const scale = 65 * (0.3 + 0.7 * visibility);
        child.scale.set(scale, scale, 1);
      }
    });

    const altRad = THREE.MathUtils.degToRad(sunAlt);
    const azRad = THREE.MathUtils.degToRad(azimuthDeg);
    const dist = 180.0;

    const posX = dist * Math.cos(altRad) * Math.sin(azRad);
    const posY = dist * Math.sin(altRad);
    const posZ = -dist * Math.cos(altRad) * Math.cos(azRad);

    if (Number.isFinite(posX) && Number.isFinite(posY) && Number.isFinite(posZ)) {
      sunGroup.position.set(posX, posY, posZ);
    }
  };

  return { sunGroupRef, initSun, update3DSunPosition };
};