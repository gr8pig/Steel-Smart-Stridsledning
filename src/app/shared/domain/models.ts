export interface BaseTwin {
  id: string;
  name: string;
  role: string;
  readiness: number; // 0-1
  sortieCapacity: number;
  runwayStatus: 'OPERATIONAL' | 'DEGRADED' | 'DISABLED';
  airframesAvailable: number;
  crewsAvailable: number;
  crewFatigue: number; // 0-1
  fuelStock: number; // 0-1
  depletionRate?: number; // 0-1 per wave
  missileInventory: {
    interceptorShort: number;
    interceptorMid: number;
    interceptorLong: number;
  };
  recoveryTime: string; // duration
  threatExposure: number;
  isReserved?: boolean;
  targetFloor?: number;
}

export type PlatformType = 'S_400' | 'PATRIOT' | 'GRIPEN' | 'SU_35' | 'F_35' | 'GENERIC_DRONE' | 'GENERIC_MISSILE' | 'UNKNOWN';
export type ArmamentType = 'LONG_RANGE_AAM' | 'SHORT_RANGE_AAM' | 'BOMB' | 'CRUISE_MISSILE' | 'SAM_LONG_RANGE' | 'SAM_SHORT_RANGE' | 'NONE';
export type ArmamentLoadout = 'KINETIC_STRIKE' | 'ELECTRONIC_WARFARE' | 'ISR_SURVEILLANCE' | 'AIR_SUPERIORITY' | 'HYBRID_DECEPTION';
export type OriginCountry = 'SWEDEN' | 'NATO' | 'RUSSIA' | 'OTHER';

export interface ThreatTwin {
  id: string;
  class: 'DRONE' | 'MISSILE' | 'AIRCRAFT' | 'UNKNOWN';
  platform?: PlatformType;
  armaments?: ArmamentType[];
  armament?: ArmamentLoadout;
  heading?: number;
  originCountry?: OriginCountry;
  intent: 'PROBE' | 'FEINT' | 'STRIKE' | 'SATURATION' | 'DECOY' | 'STRATEGIC_STRIKE' | 'TACTICAL_CAP';
  confidence: number;
  timeToTarget: number; // seconds
  targetId: string;
  geometry: {
    x: number;
    y: number;
    heading: number;
    velocity: number;
  };
  status: 'IDENTIFIED' | 'TRACKING' | 'ENGAGED' | 'NEUTRALIZED' | 'LEAKED';
  uncertaintySource?: string;
  // Live backend fields
  intentDistribution?: {
    probe: number;
    feint: number;
    strike: number;
    saturation: number;
    decoy: number;
  };
  classificationConfidence?: number;
  sensorQuality?: number;
  jammingProbability?: number;
  clusterId?: string;
  densityScore?: number;
}

export type TwinDataSource = 'AUTHORITATIVE' | 'CACHED' | 'HEURISTIC';

export interface SyncMetadata {
  source: TwinDataSource;
  lastSyncedAt: string | null;
  updatedAt: string;
  stale: boolean;
}

export type OperationalDirectiveType = 'ENGAGE_TRACK';
export type OperationalDirectiveState = 'QUEUED' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED';

export interface OperationalDirective {
  id: string;
  type: OperationalDirectiveType;
  state: OperationalDirectiveState;
  createdAt: string;
  updatedAt: string;
  trackId: string;
  baseId: string;
  effectorType: string;
  rationale: string;
  source: 'OPERATOR' | 'OFFLINE_QUEUE';
  lastAttemptAt?: string | null;
  error?: string | null;
}

export interface TacticalSnapshot {
  tracks: ThreatTwin[];
  simTime: number;
  sync: SyncMetadata;
  cachedAt: string;
}

export interface ReadinessSnapshot {
  bases: BaseTwin[];
  cachedAt: string;
}

export interface PolicyTwin {
  id: string;
  name: string;
  weights: {
    safety: number;
    sustainability: number;
    resilience: number;
  };
  readinessFloors: Record<string, number>;
  guardrails: {
    civilianProtected: boolean;
    reserveInterceptorFloor: number;
    minReadinessThreshold: number; // 0-1
    criticalAssetPriority: number; // 0-1
    engagementAuthority: 'AUTO' | 'SEMI' | 'MANUAL';
  };
}

export interface COATwin {
  id: string;
  name: string;
  type: 'MAX_PROTECTION' | 'BALANCED' | 'DEEP_SUSTAINABILITY' | 'CUSTOM';
  rationale: string;
  projectedOutcome: {
    intercepts: number;
    leakage: number;
    cost: number;
    readinessDeltaByBase: Record<string, number>;
    asymmetryRatio: number;
    robustnessScore: number;
    confidence: number;
  };
  assignments: {
    threatId: string;
    baseId: string;
    effectorType: string;
    pk?: number;
  }[];
}

export interface EffectorTwin {
  id: string;
  name: string;
  type: 'KINETIC' | 'NON_KINETIC' | 'ELECTRONIC';
  status: 'READY' | 'DEPLOYED' | 'DEPLETED' | 'MAINTENANCE';
  currentStock: number;
  maxCapacity: number;
  costPerUnit: number; // For asymmetry calculation
  rearmTime: number; // seconds
}

export interface SensorTwin {
  id: string;
  name: string;
  type: 'RADAR' | 'SIGINT' | 'EOIR';
  fieldOfView: number; // degrees
  range: number; // km
  status: 'NOMINAL' | 'JAMMED' | 'DEGRADED' | 'OFFLINE';
  trackQuality: number; // 0-1
}

export interface MapFeature {
  recordType: 'location' | 'terrain';
  id?: string;
  name: string;
  side: 'north' | 'south';
  subtype: string;
  geometryType: 'point' | 'polygon';
  x?: number;
  y?: number;
  coordinates?: [number, number][];
  notes?: string;
}

export interface ScenarioPhase {
  id: string;
  name: string;
  status: 'COMPLETED' | 'ACTIVE' | 'UPCOMING';
  description: string;
}
