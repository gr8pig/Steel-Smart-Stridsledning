import { ArmamentLoadout, ArmamentType, OriginCountry, PlatformType } from '../../shared/domain/models';

export interface CounterfactualPolicyDeltas {
  safety: number;
  sustainability: number;
  resilience?: number;
}

export interface CounterfactualTheaterVector {
  timestamp: string;
  trackCount: number;
  avgVelocity: number;
  clusterDensity: number;
  baseReadinessMean: number;
  jammerIntensity: number;
  policyDeltas: CounterfactualPolicyDeltas;
  scenarioName?: string | null;
  phase?: string | null;
  trackVelocitySpread?: number | null;
}

export type AssetSource = 'drawing_board' | 'campaign' | 'catalog';
export type AssetSide = 'BLUE' | 'RED' | 'NEUTRAL';

export interface CounterfactualAsset {
  id: string;
  label: string;
  unitType: string;
  side: AssetSide;
  platform?: PlatformType;
  armaments?: ArmamentType[];
  armament?: ArmamentLoadout;
  heading?: number;
  originCountry?: OriginCountry;
  readiness: number;
  speed: number;
  waypointComplexity: number;
  inventoryDepth: number;
  sensorQuality: number;
  exposedRisk: number;
  mobility: number;
  endurance: number;
  source: AssetSource;
  metadata?: Record<string, unknown>;
}

export interface ForecastMetric {
  name: string;
  unit: string;
  p10: number[];
  p50: number[];
  p90: number[];
}

export interface EnsembleMemberTrace {
  id: string;
  label: string;
  values: number[];
  agreement: number;
  variance: number;
}

export interface FeatureContribution {
  name: string;
  category: string;
  value: number;
  impact: number;
}

export interface AssetImpact {
  asset_id: string;
  label: string;
  unit_type: string;
  source: string;
  side: string;
  robustness_score: number;
  readiness_floor: number;
  failure_probability: number;
  asymmetry_ratio: number;
  delta_robustness: number;
  delta_readiness: number;
  delta_failure_probability: number;
  summary: string;
}

export interface DeepSimHint {
  required: boolean;
  reason: string;
  recommendedRuns: number;
  provider: string;
}

export interface CounterfactualPrediction {
  time_horizon: number[];
  p10: number[];
  p50: number[];
  p90: number[];
  trust_score: number;
  is_speculative: boolean;
  metric_trajectories: ForecastMetric[];
  ensemble_members: EnsembleMemberTrace[];
  feature_importances: FeatureContribution[];
  asset_impacts: AssetImpact[];
  selected_asset?: CounterfactualAsset | null;
  selected_asset_id?: string | null;
  scenario_digest?: string | null;
  model_version?: string | null;
  deep_sim_hint?: DeepSimHint | null;
  provenance?: Record<string, string>;
}

export interface CounterfactualSimulationRequest {
  theater: CounterfactualTheaterVector;
  assets: CounterfactualAsset[];
  selectedAssetId?: string | null;
  horizonMinutes?: number[];
  modelVersion?: string;
  nEnsembleMembers?: number;
  nRuns?: number;
}

export interface DeepSimJobMetadata {
  status: string;
  job_id: string;
  provider: string;
  provider_job_id?: string | null;
  scenario_digest: string;
  model_version: string;
  selected_asset_id?: string | null;
  asset_count: number;
  n_runs: number;
  trust_score: number;
  created_at?: string | null;
}
