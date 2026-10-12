export interface BuildingInfo {
  lat: number;
  lon: number;
  heightMeters: number;
  name: string;
}

export interface GridPoint {
  distanceMeters: number;
  ambientTemp: number;
  asphaltTemp: number;
  redBlockTemp: number;
  whiteBlockTemp: number;
  buildingWallTemp: number;
  isShadow: boolean;
  adjustedWindSpeed: number;
  adjustedWindDirection: number;
}

export interface SimulationResponse {
  baseLat: number;
  baseLng: number;
  rawAirTemp: number;
  rawWindSpeed: number;
  rawWindDirection: number;
  directRadiation: number;
  gridPoints: GridPoint[];
  surroundingBuildings?: BuildingInfo[];
}