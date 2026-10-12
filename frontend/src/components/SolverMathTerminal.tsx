import React, { useState } from 'react';

interface SolverMathTerminalProps {
    lat: number;
    lng: number;
    sunAlt: number;
    sunAzimuth: number;
    baseAir: number;
    directRadiation: number;
    currentAsphaltTemp: number;
    isShadow: boolean;
}

export const SolverMathTerminal: React.FC<SolverMathTerminalProps> = ({
                                                                          lat,
                                                                          lng,
                                                                          sunAlt,
                                                                          sunAzimuth,
                                                                          baseAir,
                                                                          directRadiation,
                                                                          currentAsphaltTemp,
                                                                          isShadow,
                                                                      }) => {
    // 기본 상태: 접힘(false)
    const [isOpen, setIsOpen] = useState<boolean>(false);

    // 일사 흡수 열유속 (Q_solar = alpha * I) -> 아스팔트 흡수율 약 0.90
    const qSolar = isShadow ? 0 : Math.round(0.90 * directRadiation);
    // 대류 열손실 계수 대략 15~20 W/(m^2*K)
    const hConv = 18.5;
    const qConv = Math.round(hConv * Math.max(0, currentAsphaltTemp - baseAir));

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '24px',
                left: '24px',
                zIndex: 50,
                fontFamily: 'Consolas, Monaco, monospace',
            }}
        >
            {/* 1. 접혀 있을 때 표시되는 세련된 플로팅 토글 버튼 */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#38bdf8';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <span style={{ fontSize: '15px' }}>⚡</span>
                    <span>열수지 수식 터미널 보기</span>
                    <span
                        style={{
                            backgroundColor: isShadow ? 'rgba(0, 229, 255, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: isShadow ? '#00e5ff' : '#ef4444',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            marginLeft: '4px',
                        }}
                    >
            {isShadow ? '음지 21°C' : `${currentAsphaltTemp.toFixed(1)}°C`}
          </span>
                </button>
            )}

            {/* 2. 클릭 시 열리는 상세 물리 연산 터미널 박스 */}
            {isOpen && (
                <div
                    style={{
                        width: '420px',
                        maxHeight: '480px',
                        backgroundColor: 'rgba(15, 23, 42, 0.96)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        borderRadius: '10px',
                        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out',
                    }}
                >
                    {/* 헤더: 드래그 핸들 및 닫기(접기) 버튼 */}
                    <div
                        style={{
                            padding: '10px 14px',
                            backgroundColor: 'rgba(30, 41, 59, 0.8)',
                            borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>
                Thermal Physics Solver Terminal
              </span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            title="접기"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '16px',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                lineHeight: 1,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                            ✕
                        </button>
                    </div>

                    {/* 본문 터미널 내용 */}
                    <div
                        style={{
                            padding: '14px',
                            fontSize: '12px',
                            color: '#cbd5e1',
                            lineHeight: 1.6,
                            overflowY: 'auto',
                        }}
                    >
                        {/* 상태 뱃지 */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <div
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: isShadow ? 'rgba(0, 229, 255, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    border: `1px solid ${isShadow ? '#00e5ff' : '#ef4444'}`,
                                    color: isShadow ? '#00e5ff' : '#ef4444',
                                    fontWeight: 'bold',
                                }}
                            >
                                {isShadow ? '● 음지 구역 (Shadow)' : '● 직달 일사 수열 (Sunlit)'}
                            </div>
                            <div
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(51, 65, 85, 0.5)',
                                    color: '#94a3b8',
                                }}
                            >
                                위치: {lat.toFixed(4)}, {lng.toFixed(4)}
                            </div>
                        </div>

                        {/* 물리 태양 변수 */}
                        <div style={{ marginBottom: '10px' }}>
                            <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>[태양 천문 기하학]</div>
                            <div>• 고도각(Altitude): {sunAlt.toFixed(1)}°</div>
                            <div>• 방위각(Azimuth): {sunAzimuth.toFixed(1)}° (북=0°, 남=180°)</div>
                            <div>• 직달일사량: {isShadow ? '0.0 W/m² (건물 차폐)' : `${directRadiation.toFixed(1)} W/m²`}</div>
                        </div>

                        {/* 열수지 방정식 */}
                        <div style={{ marginBottom: '10px' }}>
                            <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>[지표 열수지 방정식 (Heat Balance)]</div>
                            <div style={{ color: '#e2e8f0', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '6px', borderRadius: '4px' }}>
                                Rn - H - G = 0  ⇒  (1 - α)·I_dir - h_c·(T_s - T_a) = 0
                            </div>
                            <div style={{ marginTop: '4px' }}>• 태양 흡수열류(Q_solar): {qSolar} W/m²</div>
                            <div>• 대류 방열류(Q_conv): ~{qConv} W/m²</div>
                        </div>

                        {/* 결과 온도 */}
                        <div
                            style={{
                                padding: '8px',
                                backgroundColor: isShadow ? 'rgba(8, 28, 54, 0.7)' : 'rgba(69, 10, 10, 0.7)',
                                borderRadius: '6px',
                                borderLeft: `4px solid ${isShadow ? '#00e5ff' : '#ef4444'}`,
                            }}
                        >
                            <div style={{ color: '#94a3b8' }}>대기온도: {baseAir.toFixed(1)}°C</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff', marginTop: '2px' }}>
                                계산된 노면 온도: {currentAsphaltTemp.toFixed(1)}°C
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};