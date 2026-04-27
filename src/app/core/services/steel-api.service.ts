import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TelemetryService } from './telemetry.service';
import { API_BASE_URL } from '../tokens/api.token';
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

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
  phase: string;
  threatCount: number;
  baseCount: number;
  source: 'prebuilt' | 'drawing-board';
}

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
  overrides?: Record<string, number>;
}

export interface ScenarioSweepPoint {
  policy: { safety: number; sustainability: number; resilience: number };
  jammerIntensity: number;
  trustScore: number;
  avgBlueRobustness: number;
  avgFailureProbability: number;
  avgRedRisk: number;
  assetResults: {
    assetId: string;
    label: string;
    unitType: string;
    side: string;
    robustnessScore: number;
    readinessFloor: number;
    failureProbability: number;
    asymmetryRatio: number;
    deltaRobustness: number;
  }[];
}

export interface ScenarioSimResult {
  scenarioName: string;
  phase: string;
  baseCount: number;
  threatCount: number;
  sweepCount: number;
  elapsedMs: number;
  sweepPoints: ScenarioSweepPoint[];
  aggregate: {
    overallRobustness: number;
    overallFailureProbability: number;
    overallTrust: number;
    robustnessRange: { min: number; max: number; std: number };
    bestPolicy: { safety: number; sustainability: number; resilience: number };
    worstPolicy: { safety: number; sustainability: number; resilience: number };
  };
}

export interface ScenarioCompareResult {
  scenarioA: { name: string; threatCount: number; baseCount: number; overallRobustness: number; overallFailureProbability: number };
  scenarioB: { name: string; threatCount: number; baseCount: number; overallRobustness: number; overallFailureProbability: number };
  deltas: { robustness: number; failureProbability: number; trust: number; verdict: string };
  pairedSweep: {
    policy: { safety: number; sustainability: number; resilience: number };
    jammerIntensity: number;
    robustnessA: number;
    robustnessB: number;
    deltaRobustness: number;
  }[];
  bestPolicyA: { safety: number; sustainability: number; resilience: number };
  bestPolicyB: { safety: number; sustainability: number; resilience: number };
}

export interface ActionReplayMetadata {
  clientActionId?: string;
  deviceId?: string;
  queuedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SteelApiService {
  http = inject(HttpClient);
  private telemetry = inject(TelemetryService);
  private base = inject(API_BASE_URL);

  // ── Twin reads ──────────────────────────────────────────────────────────────

  getCampaign(): Observable<{ bases: BaseTwin[], threats: ThreatTwin[], policy: PolicyTwin, coas: COATwin[], simTime: number, phase: string, scenarioName?: string }> {
    return this.http.get<{ bases: BaseTwin[], threats: ThreatTwin[], policy: PolicyTwin, coas: COATwin[], simTime: number, phase: string, scenarioName?: string }>(`${this.base}/twins/campaign`);
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

  updateGuardrails(guardrails: Partial<{
    civilianProtected: boolean;
    reserveInterceptorFloor: number;
    minReadinessThreshold: number;
    engagementAuthority: string;
  }>): Observable<{ ok: boolean; weights: PolicyTwin['weights'] }> {
    return this.http.post<{ ok: boolean; weights: PolicyTwin['weights'] }>(
      `${this.base}/twins/policy`,
      { guardrails }
    );
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

  resetScenario(): Observable<{ status: string; scenarioName?: string; simTime: number; bases: number; threats: number }> {
    return this.http.post<{ status: string; scenarioName?: string; simTime: number; bases: number; threats: number }>(`${this.base}/twins/reset`, {});
  }

  loadScenario(scenarioName: string): Observable<{ status: string; scenario: string; scenarioName?: string; simTime: number; bases: number; threats: number }> {
    return this.http.post<{ status: string; scenario: string; scenarioName?: string; simTime: number; bases: number; threats: number }>(`${this.base}/twins/scenario/${scenarioName}`, {});
  }

  listScenarios(): Observable<ScenarioInfo[]> {
    return this.http.get<ScenarioInfo[]>(`${this.base}/twins/scenarios`);
  }

  redirectTracks(payload: { trackIds?: string[]; heading?: number; velocity?: number; targetId?: string }): Observable<{ redirected: number; ids: string[]; applied: { heading?: number; velocity?: number; targetId?: string } }> {
    return this.http.post<{ redirected: number; ids: string[]; applied: { heading?: number; velocity?: number; targetId?: string } }>(`${this.base}/twins/redirect-tracks`, payload);
  }

  setJamming(active: boolean, severity = 0.7): Observable<{ jammingActive: boolean; severity: number; affectedTracks: number }> {
    return this.http.post<{ jammingActive: boolean; severity: number; affectedTracks: number }>(`${this.base}/twins/set-jamming`, { active, severity });
  }

  // ── Scenarios ──────────────────────────────────────────────────────────────

  getScenarios(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/scenarios`);
  }

  saveScenario(scenario: unknown): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/scenarios`, scenario);
  }

  deleteScenario(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.base}/scenarios/${id}`);
  }


  // ── COA solver ──────────────────────────────────────────────────────────────

  solveCOAs(weights: { safety: number; sustainability: number; resilience: number }): Observable<COASolveResult> {
    return this.http.post<COASolveResult>(`${this.base}/coa/solve`, { policyWeights: weights });
  }

  // ── Monte Carlo lab ─────────────────────────────────────────────────────────

  runLab(config: LabRunConfig): Observable<LabRunResult> {
    const t0 = performance.now();
    return this.http.post<LabRunResult>(`${this.base}/lab/run`, {
      coaId:           config.coaId,
      redModel:        config.redModel,
      jammerSeverity:  config.jammerSeverity,
      trackDegradation: config.trackDegradation,
      nRuns:           config.nRuns ?? 500,
    }).pipe(
      tap(() => this.telemetry.recordInference(performance.now() - t0))
    );
  }

  // ── Counterfactual lab ────────────────────────────────────────────────────

  predictCounterfactual(request: CounterfactualSimulationRequest): Observable<CounterfactualPrediction> {
    const t0 = performance.now();
    return this.http.post<CounterfactualPrediction>(`${this.base}/ml/predict`, request).pipe(
      tap(() => this.telemetry.recordInference(performance.now() - t0))
    );
  }

  predictSketchIntent(sketch: SketchIntentRequest): Observable<IntentPredictionResponse> {
    const SPEED_MAP: Record<string, number> = {
      AIRCRAFT: 0.90, DRONE: 0.72, DRONE_SWARM: 0.50, HELICOPTER: 0.60,
      SHIP_DESTROYER: 0.45, SHIP_CARRIER: 0.35, SHIP_SUBMARINE: 0.40,
      SHIP_PATROL: 0.55, ARMOR: 0.35, ARTILLERY: 0.25,
      INFANTRY: 0.18, SPECIAL_FORCES: 0.42,
    };
    const assets = sketch.agents.map(a => ({
      id: a.id,
      unitType: a.type,
      side: a.side,
      readiness: 0.75,
      speed: SPEED_MAP[a.type] ?? 0.40,
      waypointComplexity: 0.30,
      inventoryDepth: 0.60,
      sensorQuality: 0.70,
      exposedRisk: a.side === 'RED' ? 0.55 : 0.30,
      mobility: SPEED_MAP[a.type] ?? 0.40,
      endurance: 0.70,
      source: 'sketch',
      armament: a.armament ?? 'Standard',
    }));
    const payload = {
      theater: {
        timestamp: sketch.timestamp,
        trackCount: sketch.agents.filter(a => a.side === 'RED').length,
        avgVelocity: 0.5,
        clusterDensity: sketch.agents.length / 10.0,
        baseReadinessMean: 0.75,
        jammerIntensity: 0.0,
        phase: 'SKETCH',
        scenarioName: 'Drawing Board',
        trackVelocitySpread: 0.2,
      },
      assets,
      horizonMinutes: [0, 5, 10, 15, 20, 25, 30],
      modelVersion: 'synthetic-ensemble-v2',
      nEnsembleMembers: 7,
    };
    return this.http.post<IntentPredictionResponse>(`${this.base}/ml/predict`, payload);
  }

  runAdvancedSim(units: unknown[]): Observable<import('../state/drawing-board.store').ScenarioBundle> {
    return this.http.post<import('../state/drawing-board.store').ScenarioBundle>(`${this.base}/ml/advanced-sim`, units);
  }

  predictDrawnIntent(drawnPoints: {x: number, y: number}[]): Observable<IntentPredictionResponse> {
    const payload = {
      theater: {
        timestamp: new Date().toISOString(),
        trackCount: drawnPoints.length,
        avgVelocity: 0.5,
        clusterDensity: drawnPoints.length / 10.0,
        baseReadinessMean: 0.75,
        jammerIntensity: 0.0,
        phase: 'SKETCH',
        scenarioName: 'Drawing Board',
        trackVelocitySpread: 0.2,
      },
      assets: drawnPoints.map((p, i) => ({
        id: `DRAWN-${i}`,
        unitType: 'UNKNOWN',
        side: 'RED',
        readiness: 0.70,
        speed: 0.50,
        waypointComplexity: 0.30,
        inventoryDepth: 0.60,
        sensorQuality: 0.60,
        exposedRisk: 0.50,
        mobility: 0.50,
        endurance: 0.60,
        source: 'drawn',
      })),
      horizonMinutes: [0, 5, 10, 15, 20, 25, 30],
      modelVersion: 'synthetic-ensemble-v2',
      nEnsembleMembers: 7,
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

  enableML(dockerImage?: string): Observable<{status: string; provider: string; endpoint_id?: string; template_id?: string; image?: string; message?: string}> {
    return this.http.post<{status: string; provider: string; endpoint_id?: string; template_id?: string; image?: string; message?: string}>(
      `${this.base}/ml/enable`,
      dockerImage ? { dockerImage } : {},
    );
  }

  getMLStatus(): Observable<{provider: string; endpoint_id: string | null; rf_model_loaded: boolean; pending_jobs: number}> {
    return this.http.get<{provider: string; endpoint_id: string | null; rf_model_loaded: boolean; pending_jobs: number}>(`${this.base}/ml/status`);
  }

  // ── Scenario Simulation ───────────────────────────────────────────────────────

  runScenarioSim(request: { scenarioName: string; policySweep?: Record<string, number[]>; jammerSweep?: number[]; nRuns?: number }): Observable<ScenarioSimResult> {
    return this.http.post<ScenarioSimResult>(`${this.base}/ml/scenario-sim`, request);
  }

  runScenarioCompare(request: { scenarioA: string; scenarioB: string; policySweep?: Record<string, number[]>; jammerSweep?: number[]; nRuns?: number }): Observable<ScenarioCompareResult> {
    return this.http.post<ScenarioCompareResult>(`${this.base}/ml/scenario-compare`, request);
  }

  // ── Logistics ───────────────────────────────────────────────────────────────

  getLogistics(): Observable<LogisticsSnapshot> {
    return this.http.get<LogisticsSnapshot>(`${this.base}/logistics`);
  }

  // ── Audit ───────────────────────────────────────────────────────────────────
  getAuditLog(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/audit`);
  }

  logAuditEvent(entry: { eventType: string; payload: unknown; actorId?: string }): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/audit`, entry);
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
