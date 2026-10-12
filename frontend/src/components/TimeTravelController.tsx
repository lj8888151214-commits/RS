import React from 'react';

interface TimeTravelControllerProps {
    timeOffset: number;
    onTimeChange: (deltaMinutes: number) => void;
}

export const TimeTravelController: React.FC<TimeTravelControllerProps> = ({
                                                                              timeOffset,
                                                                              onTimeChange,
                                                                          }) => {
    const displaySimTime = new Date(Date.now() + timeOffset * 60000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                padding: '8px 14px',
                borderRadius: '24px',
                border: '1px solid #f59e0b',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                zIndex: 25,
                backdropFilter: 'blur(4px)',
            }}
        >
      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fcd34d', marginRight: '6px' }}>
        ☀️ {displaySimTime}
      </span>
            <button
                onClick={() => onTimeChange(-15)}
                style={{
                    padding: '4px 10px',
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                }}
            >
                -15분
            </button>
            <button
                onClick={() => onTimeChange(15)}
                style={{
                    padding: '4px 10px',
                    backgroundColor: '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                }}
            >
                +15분
            </button>
        </div>
    );
};