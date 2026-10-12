import React from 'react';
import type { SimulationResponse } from '../types/climate';

interface DashboardCardProps {
  climateData: SimulationResponse | null;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ climateData }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        minWidth: '240px',
      }}
    >
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
        송도과학로 51번길 미기후
      </h3>
      {climateData ? (
        <div style={{ fontSize: '13px', color: '#555' }}>
          실시간 기상 및 도로망 데이터 연동 중
        </div>
      ) : (
        <div style={{ fontSize: '13px', color: '#888' }}>
          실시간 기상 데이터 수신 중...
        </div>
      )}
    </div>
  );
};