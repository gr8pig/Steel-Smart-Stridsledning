import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LogisticsSnapshot } from '../../shared/domain/logistics-ontology';
import {
  BaseTwin,
  ThreatTwin,
  PolicyTwin,
  COATwin,
} from '../../shared/domain/models';
import {
  CounterfactualPrediction,
  CounterfactualSimulationRequest,
  DeepSimJobMetadata,
} from '../ml/counterfactual-lab.models';

export interface LogisticsContext {
  supplyHealth: number;
  openCorridors: number;
  enRoute: number;
  degradedNodes: string[];
}

export interface COASolveResult {
  coas: COATwin[];
  paretoFrontierSize: number;
  solveTimeMs: number;
  threatCount: number;
  reachableAssignments: number;
}

export interface SketchIntentRequest {
  timestamp: string;
  agents: {
    id: string;
    type: string;
    side: string;
    x: number;
    y: number;
    armament?: string;
    origin?: string;
  }[];
}

export interface IntentPredictionResponse {
  predictions: import('../state/drawing-board.store').IntentPrediction[];
}


export interface Distribution {
  mean: number; std: number; p10: number; p90: number;
}

export interface MOEDistributions {
  interceptFraction: Distribution;
  readiness6h: Distribution;
  blueExpenditure: Distribution;
  asymmetryRatio: Distribution;
}

export interface LabRunResult {
  robustnessScore: number;
  legacyComparisonScore: number;
  fragilityPoint: string;
  failureProbability: number;
  failureHeatmap: number[][];   // [12][12]
  moeDistributions: MOEDistributions;
  runsCompleted: number;
  runTimeMs: number;
  correctionRecommendation: string;
}

export interface ReadinessProjection {
  baseId: string;
  baseName: string;
  readinessNow: number;
  readiness6h: number;
  readiness12h: number;
  readiness24h: number;
  lifeExpectancyHours: number;
}

export interface LabRunConfig {
  coaId: string;
  redModel: 'DECEPTIVE' | 'SATURATION' | 'KINETIC';
  jammerSeverity: number;
  trackDegradation: number;
  nRuns?: number;
}

export interface ActionReplayMetadata {
  clientActionId?: string;
  deviceId?: string;
  queuedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SteelApiService {
  private http = inject(HttpClient);
  private base = (window as any).API_BASE_URL || 'http://127.0.0.1:8000';

  // ── Twin reads ──────────────────────────────────────────────────────────────

  getCampaign(): Observable<{ bases: BaseTwin[], threats: ThreatTwin[], policy: PolicyTwin, coas: COATwin[], simTime: number, phase: string }> {
    return this.http.get<{ bases: BaseTwin[], threats: ThreatTwin[], policy: PolicyTwin, coas: COATwin[], simTime: number, phase: string }>(`${this.base}/twins/campaign`);
  }

  getBases(): Observable<BaseTwin[]> {
    return this.http.get<BaseTwin[]>(`${this.base}/twins/bases`);
  }

  getThreats(): Observable<ThreatTwin[]> {
    return this.http.get<ThreatTwin[]>(`${this.base}/twins/threats`);
  }

  getReadinessProjection(): Observable<ReadinessProjection[]> {
    return this.http.get<ReadinessProjection[]>(`${this.base}/twins/readiness/projection`);
  }

  // ── Policy ──────────────────────────────────────────────────────────────────

  updatePolicy(weights: { safety: number; sustainability: number; resilience: number }): Observable<{ ok: boolean; weights: PolicyTwin['weights'] }> {
    return this.http.post<{ ok: boolean; weights: PolicyTwin['weights'] }>(`${this.base}/twins/policy`, { policyWeights: weights });
  }

  updateReservedBases(reservedBaseIds: string[]): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/twins/policy`,
      { reservedBases: reservedBaseIds });
  }

  engageTrack(
    trackId: string,
    baseId: string,
    effectorType: string,
    replay?: ActionReplayMetadata
  ): Observable<{ success: boolean; trackId: string; newStatus: string; effectorType: string }> {
    return this.http.post<{ success: boolean; trackId: string; newStatus: string; effectorType: string }>(`${this.base}/twins/engage`, {
      trackId,
      baseId,
      effectorType,
      ...(replay ?? {}),
    });
  }

  injectTracks(count: number, type: 'FEINT' | 'KINETIC' | 'MIXED' | 'DRONE'): Observable<{ injected: number; ids: string[] }> {
    return this.http.post<{ injected: number; ids: string[] }>(`${this.base}/twins/inject-tracks`, { count, type });
  }

  resetScenario(): Observable<{ status: string; simTime: number; bases: number; threats: number }> {
    return this.http.post<{ status: string; simTime: number; bases: number; threats: number }>(`${this.base}/twins/reset`, {});
  }


  // ── COA solver ──────────────────────────────────────────────────────────────

  solveCOAs(weights: { safety: number; sustainability: number; resilience: number }): Observable<COASolveResult> {
    return this.http.post<COASolveResult>(`${this.base}/coa/solve`, { policyWeights: weights });
  }

  // ── Monte Carlo lab ─────────────────────────────────────────────────────────

  runLab(config: LabRunConfig): Observable<LabRunResult> {
    return this.http.post<LabRunResult>(`${this.base}/lab/run`, {
      coaId:           config.coaId,
      redModel:        config.redModel,
      jammerSeverity:  config.jammerSeverity,
      trackDegradation: config.trackDegradation,
      nRuns:           config.nRuns ?? 500,
    });
  }

  // ── Counterfactual lab ────────────────────────────────────────────────────

  predictCounterfactual(request: CounterfactualSimulationRequest): Observable<CounterfactualPrediction> {
    return this.http.post<CounterfactualPrediction>(`${this.base}/ml/predict`, request);
  }

  predictSketchIntent(sketch: SketchIntentRequest): Observable<IntentPredictionResponse> {
    return this.http.post<IntentPredictionResponse>(`${this.base}/ml/predict`, sketch);
  }

  predictDrawnIntent(drawnPoints: {x: number, y: number}[]): Observable<IntentPredictionResponse> {
    // Construct a mock TheaterState payload from the drawn points
    const payload = {
      theater: { timestamp: new Date().toISOString(), trackCount: drawnPoints.length },
      assets: drawnPoints.map((p, i) => ({ id: `DRAWN-${i}`, lat: p.y, lng: p.x, class: 'UNKNOWN' }))
    };
    return this.http.post<IntentPredictionResponse>(`${this.base}/ml/predict`, payload);
  }

  triggerDeepSim(request: CounterfactualSimulationRequest): Observable<DeepSimJobMetadata> {
    return this.http.post<DeepSimJobMetadata>(`${this.base}/ml/deep-sim`, request);
  }

  getDeepSimStatus(jobId: string): Observable<{ id: string; status: string; output?: CounterfactualPrediction; error?: string }> {
    return this.http.get<{ id: string; status: string; output?: CounterfactualPrediction; error?: string }>(
      `${this.base}/ml/deep-sim/${jobId}/status`
    );
  }

  // ── Logistics ───────────────────────────────────────────────────────────────

  getLogistics(): Observable<LogisticsSnapshot> {
    return this.http.get<LogisticsSnapshot>(`${this.base}/logistics`);
  }

  // ── Rationale (backend is sole inference boundary) ───────────────────────────

  getRationaleForCOA(coaId: string): Observable<{ rationaleText: string; model?: string; generatedAt: string }> {
    return this.http.post<{ rationaleText: string; model?: string; generatedAt: string }>(`${this.base}/rationale/coa`, { coaId });
  }

  getRationaleForLabResult(runResult: LabRunResult): Observable<{ rationaleText: string; model?: string }> {
    return this.http.post<{ rationaleText: string; model?: string }>(`${this.base}/rationale/lab-result`, { runResult });
  }

  getRationaleForLogistics(ctx: LogisticsContext): Observable<{ rationaleText: string; model?: string }> {
    return this.http.post<{ rationaleText: string; model?: string }>(`${this.base}/rationale/logistics`, { ctx });
  }
}
