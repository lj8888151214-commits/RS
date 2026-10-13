import React from 'react';
import type { MaterialType } from '../utils/climateVisualUtils';

interface StreetOverlayHeaderProps {
  showSun: boolean;
  onToggleSun: () => void;
  materialType: MaterialType;
  onToggleMaterial: () => void;
  walkMode?: 'road' | 'sidewalk';
  onToggleWalkMode?: () => void;
}

export const StreetOverlayHeader: React.FC<StreetOverlayHeaderProps> = ({
  showSun,
  onToggleSun,
  materialType,
  onToggleMaterial,
  walkMode = 'road',
  onToggleWalkMode,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 20,
      }}
    >
      {/* 1. 3D 재생 / 태양 표시 토글 버튼 */}
      <button
        onClick={onToggleSun}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          backgroundColor: showSun ? '#1e293b' : '#334155',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        <span>{showSun ? '▶ 3D 재생 표시' : '⏸ 일시정지'}</span>
      </button>

      {/* 2. 아스팔트 / 보도블럭 재질 모드 토글 버튼 */}
      <button
        onClick={onToggleMaterial}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          backgroundColor: materialType === 'asphalt' ? '#0f172a' : '#0369a1',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        <span>{materialType === 'asphalt' ? '▦ 아스팔트 모드' : '🧱 보도블럭 모드'}</span>
      </button>

      {/* 3. 보도블럭 걷기 / 도로 걷기 토글 버튼 */}
      {onToggleWalkMode && (
        <button
          onClick={onToggleWalkMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: walkMode === 'sidewalk' ? '#0284c7' : '#1e293b',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <span>{walkMode === 'sidewalk' ? '🚶 보도블럭 걷기' : '🛣️ 도로 걷기'}</span>
        </button>
      )}
    </div>
  );
};