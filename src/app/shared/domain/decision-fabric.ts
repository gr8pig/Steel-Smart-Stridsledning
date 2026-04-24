export interface DecisionFabricTwin {
  id: string;
  simTime: number;
  c2ResilienceScore: number;
  trustEntropy: number;
  authorityFriction: number;
  operatorLoad: number;
  auditCompleteness: number;
  failureProbability: number; // Injected from ML Surrogate
  projectedCollapseSec: number | null;
  status: 'HEALTHY' | 'STRESSED' | 'DEGRADED' | 'COLLAPSED';
  timestamp: string;
}

export interface FrictionTrend {
  score: number;
  velocity: number; // ΔScore / ΔTime
  projectedCollapseSec: number | null;
}
