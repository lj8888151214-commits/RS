import type { SimulationResponse } from '../types/climate';

interface FetchSimulationParams {
  lat: number;
  lng: number;
  minuteOffset?: number;
}



export async function fetchClimateSimulation({
                                               lat,
                                               lng,
                                               minuteOffset = 0,
                                             }: FetchSimulationParams): Promise<SimulationResponse> {
  // Vite 프록시를 사용하는 경우 상대 경로('/api/...'),
  // 직접 호출할 경우 'http://localhost:8080/api/...' 형태로 지정
  const url = new URL('/api/climate/simulate', window.location.origin);
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lng', lng.toString());
  if (minuteOffset !== 0) {
    url.searchParams.set('minuteOffset', minuteOffset.toString());
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`기상 시뮬레이션 데이터 조회 실패: ${response.status} ${response.statusText}`);
  }

  return response.json();
}