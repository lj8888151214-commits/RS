import React from 'react';
import type { MaterialType } from '../utils/climateVisualUtils';

interface StreetOverlayHeaderProps {
    showSun: boolean;
    onToggleSun: () => void;
    materialType: MaterialType;
    onToggleMaterial: () => void;
}

export const StreetOverlayHeader: React.FC<StreetOverlayHeaderProps> = ({
                                                                            showSun,
                                                                            onToggleSun,
                                                                            materialType,
                                                                            onToggleMaterial,
                                                                        }) => {
    return (
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 30, display: 'flex', gap: '8px' }}>
            <button
                onClick={onToggleSun}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: showSun ? 'rgba(245, 158, 11, 0.9)' : 'rgba(15, 23, 42, 0.85)',
                    color: '#ffffff',
                    border: `1px solid ${showSun ? '#f59e0b' : '#475569'}`,
                    borderRadius: '20px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s ease',
                }}
            >
                <span>{showSun ? '☀️' : '⛅'}</span>
                <span>{showSun ? '3D 태양 표시' : '3D 태양 숨김'}</span>
            </button>

            <button
                onClick={onToggleMaterial}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: materialType === 'sidewalk' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(15, 23, 42, 0.85)',
                    color: '#ffffff',
                    border: `1px solid ${materialType === 'sidewalk' ? '#10b981' : '#475569'}`,
                    borderRadius: '20px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s ease',
                }}
            >
                <span>{materialType === 'sidewalk' ? '🧱' : '🛣️'}</span>
                <span>{materialType === 'sidewalk' ? '보도블럭 모드' : '아스팔트 모드'}</span>
            </button>
        </div>
    );
};