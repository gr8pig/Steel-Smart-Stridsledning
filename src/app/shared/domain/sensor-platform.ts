export type SensorPlatformType = 'AWACS' | 'FIGHTER' | 'GROUND_RADAR';
export type SensorPlatformStatus = 'ACTIVE' | 'JAMMED' | 'DEGRADED' | 'OFFLINE' | 'TASKED';

export interface SensorPlatform {
  id: string;
  callsign: string;
  variant: string;
  type: SensorPlatformType;
  status: SensorPlatformStatus;
  position: { x: number; y: number };
  heading: number;
  rangeRadius: number;
  mobile: boolean;
  taskingTarget?: { x: number; y: number };
  jammingProbability: number;
  trackQualityBonus: number;
}

export interface SensorTaskingRequest {
  x: number;
  y: number;
  requestedAt: number;
}

// Positions are in the 1670×1300 SVG coordinate space.
// Scale: ~1.2 km/px.  Ranges shown are approximate km equivalents.
export const SENSOR_PLATFORMS_SEED: SensorPlatform[] = [
  {
    id: 'AEW-100',
    callsign: 'ARGUS',
    variant: 'S 100B Argus (Erieye AEW)',
    type: 'AWACS',
    status: 'ACTIVE',
    position: { x: 835, y: 480 },
    heading: 270,
    rangeRadius: 380,   // ~456 km
    mobile: true,
    jammingProbability: 0.08,
    trackQualityBonus: 0.22,
  },
  {
    id: 'FTR-37',
    callsign: 'VIGGEN-11',
    variant: 'JA-37 Viggen (PS-46/A radar)',
    type: 'FIGHTER',
    status: 'ACTIVE',
    position: { x: 490, y: 310 },
    heading: 180,
    rangeRadius: 130,   // ~156 km
    mobile: true,
    jammingProbability: 0.12,
    trackQualityBonus: 0.12,
  },
  {
    id: 'GCI-NV',
    callsign: 'GIRAFFE-NORD',
    variant: 'Giraffe AMB (Northern Vanguard)',
    type: 'GROUND_RADAR',
    status: 'ACTIVE',
    position: { x: 198, y: 335 },
    heading: 0,
    rangeRadius: 185,   // ~222 km
    mobile: false,
    jammingProbability: 0.05,
    trackQualityBonus: 0.14,
  },
  {
    id: 'GCI-HC',
    callsign: 'COBRA-RIDGE',
    variant: 'HARD (Highridge Command)',
    type: 'GROUND_RADAR',
    status: 'ACTIVE',
    position: { x: 838, y: 75 },
    heading: 0,
    rangeRadius: 210,   // ~252 km
    mobile: false,
    jammingProbability: 0.04,
    trackQualityBonus: 0.16,
  },
  {
    id: 'GCI-BW',
    callsign: 'HAWK-WATCH',
    variant: 'PS-860 (Boreal Watch Post)',
    type: 'GROUND_RADAR',
    status: 'ACTIVE',
    position: { x: 1158, y: 385 },
    heading: 0,
    rangeRadius: 155,   // ~186 km
    mobile: false,
    jammingProbability: 0.07,
    trackQualityBonus: 0.11,
  },
];
