import { useEffect, useState } from 'react';
import { fetchClimateSimulation } from './api/climateApi';
import type { SimulationResponse } from './types/climate';
import { StreetMicroclimateView } from './components/StreetMicroclimateView';

export default function App() {
const [currentLocation, setCurrentLocation] = useState({
  lat: 37.3835,
  lng: 126.6738
});
    const [minuteOffset, setMinuteOffset] = useState<number>(0);
    const [climateData, setClimateData] = useState<SimulationResponse | null>(null);

    useEffect(() => {
        let isCancelled = false;

        fetchClimateSimulation({
            lat: currentLocation.lat,
            lng: currentLocation.lng,
            minuteOffset,
        })
            .then((data) => {
                if (!isCancelled) setClimateData(data);
            })
            .catch((err) => {
                console.error('기상 데이터 수신 실패:', err);
            });

        return () => {
            isCancelled = true;
        };
    }, [currentLocation.lat, currentLocation.lng, minuteOffset]);

    return (
        <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
            <StreetMicroclimateView
                location={currentLocation}
                heading={142}
                climateData={climateData}
                onLocationChange={(newLoc) => setCurrentLocation(newLoc)}
                onTimeOffsetChange={(offset) => setMinuteOffset(offset)}
            />
        </div>
    );
}