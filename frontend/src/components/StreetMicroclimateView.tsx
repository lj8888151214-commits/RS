import React, { useRef, useState } from 'react';
import type { SimulationResponse } from '../types/climate';
import type { MaterialType } from '../utils/climateVisualUtils';
import { StreetOverlayHeader } from './StreetOverlayHeader';
import { SolverMathTerminal } from './SolverMathTerminal';
import { TimeTravelController } from './TimeTravelController';
import { useStreetThreeScene } from '../hooks/useStreetThreeScene';
import { useGoogleMapsStreetView } from '../hooks/useGoogleMapsStreetView';

interface StreetMicroclimateViewProps {
  location: { lat: number; lng: number };
  heading?: number;
  climateData: SimulationResponse | null;
  onLocationChange?: (newLoc: { lat: number; lng: number }) => void;
  onTimeOffsetChange?: (offsetMinutes: number) => void;
}

export const StreetMicroclimateView: React.FC<StreetMicroclimateViewProps> = ({
  location,
  heading = 142,
  climateData,
  onLocationChange,
  onTimeOffsetChange,
}) => {
  const containerWrapperRef = useRef<HTMLDivElement>(null);
  const streetViewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentPanoId, setCurrentPanoId] = useState<string>(''); // 현재 파노라마 ID 상태
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [showSun, setShowSun] = useState<boolean>(true);
  const [materialType, setMaterialType] = useState<MaterialType>('asphalt');
  const [walkMode, setWalkMode] = useState<'road' | 'sidewalk'>('road');

  const sunAzimuth = Number.isFinite(climateData?.rawWindDirection) ? Number(climateData?.rawWindDirection) : 180;
  const directRadiation = Number.isFinite(climateData?.directRadiation) ? Number(climateData?.directRadiation) : 750;
  const baseAir = Number.isFinite(climateData?.rawAirTemp) ? Number(climateData?.rawAirTemp) : 21.0;
  const sunAlt = Math.max(15, Math.min(75, (directRadiation / 950) * 60));

  const currentPoint = climateData?.gridPoints?.[0];
  const isShadowSample = currentPoint?.isShadow ?? false;
  const currentAsphaltTemp = (currentPoint && typeof currentPoint.asphaltTemp === 'number')
    ? (materialType === 'sidewalk' ? currentPoint.asphaltTemp - 9.5 : currentPoint.asphaltTemp)
    : (isShadowSample ? baseAir - 1.5 : (materialType === 'sidewalk' ? baseAir + 4.5 : baseAir + 14.0));

  // Three.js 씬 & 야자수 GLB 훅
  const { syncCameraPOV, updateObjects } = useStreetThreeScene({
    canvasRef,
    containerRef: containerWrapperRef,
    location,
    climateData,
    sunAlt,
    sunAzimuth,
    directRadiation,
    baseAir,
    showSun,
    materialType,
    heading,
    walkMode,
    currentPanoId, // 👈 [수정 1] Three.js 씬으로 현재 Pano ID 전달
  });

  // Google Maps & 스트리트뷰 훅
  useGoogleMapsStreetView({
    streetViewRef,
    mapRef,
    location,
    heading,
    sunAzimuth,
    baseAir,
    directRadiation,
    materialType,
    climateData,
    walkMode,
    onLocationChange,
    onPOVChanged: syncCameraPOV,
    onPanoChanged: (newPanoId) => { // 👈 [수정 2] 파노라마 변경 시 상태 동기화
      setCurrentPanoId(newPanoId);
    },
    onStepForward: (curHeading, nextLoc) => {
      updateObjects(nextLoc || location, curHeading, climateData);
    },
  });

  const handleTimeChange = (delta: number) => {
    const next = timeOffset + delta;
    setTimeOffset(next);
    if (onTimeOffsetChange) onTimeOffsetChange(next);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 좌측 스트리트뷰 + Three.js 영역 */}
      <div
        ref={containerWrapperRef}
        style={{ flex: '1 1 50%', height: '100%', position: 'relative', borderRight: '2px solid #0f172a' }}
      >
        <div ref={streetViewRef} style={{ width: '100%', height: '100%' }} />

        {/* zIndex 30 오버레이 캔버스 */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        />

        <StreetOverlayHeader
          showSun={showSun}
          onToggleSun={() => setShowSun((prev) => !prev)}
          materialType={materialType}
          onToggleMaterial={() => setMaterialType((prev) => (prev === 'asphalt' ? 'sidewalk' : 'asphalt'))}
          walkMode={walkMode}
          onToggleWalkMode={() => setWalkMode((prev) => (prev === 'road' ? 'sidewalk' : 'road'))}
        />

        <TimeTravelController timeOffset={timeOffset} onTimeChange={handleTimeChange} />
      </div>

      {/* 우측 3D 지도 영역 */}
      <div style={{ flex: '1 1 50%', height: '100%', position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <SolverMathTerminal
        lat={location.lat}
        lng={location.lng}
        sunAlt={sunAlt}
        sunAzimuth={sunAzimuth}
        baseAir={baseAir}
        directRadiation={directRadiation}
        currentAsphaltTemp={currentAsphaltTemp}
        isShadow={isShadowSample}
      />
    </div>
  );
};