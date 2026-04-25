import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LogisticsSnapshot } from '../../shared/domain/logistics-ontology';
import { DecisionFabricTwin } from '../../shared/domain/decision-fabric';

export interface LogisticsContext {
  supplyHealth: number;
  openCorridors: number;
  enRoute: number;
  degradedNodes: string[];
}

export interface COASolveResult {
  coas: import('../../shared/domain/models').COATwin[];
  paretoFrontierSize: number;
  solveTimeMs: number;
  threatCount: number;
  reachableAssignments: number;
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

export interface MutationSyncOptions {
  clientActionId?: string;
  deviceId?: string;
  queuedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class SteelApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // ── Twin reads ──────────────────────────────────────────────────────────────

  getCampaign(): Observable<any> {
    return this.http.get(`${this.base}/twins/campaign`);
  }

  getBases(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/twins/bases`);
  }

  getThreats(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/twins/threats`);
  }

  getReadinessProjection(): Observable<ReadinessProjection[]> {
    return this.http.get<ReadinessProjection[]>(`${this.base}/twins/readiness/projection`);
  }

  getDecisionFabric(): Observable<DecisionFabricTwin> {
    return this.http.get<DecisionFabricTwin>(`${this.base}/twins/decision-fabric`);
  }

  // ── Policy ──────────────────────────────────────────────────────────────────

  updatePolicy(
    weights: { safety: number; sustainability: number; resilience: number },
    sync?: MutationSyncOptions,
  ): Observable<any> {
    return this.http.post(`${this.base}/twins/policy`, {
      policyWeights: weights,
      clientActionId: sync?.clientActionId,
      deviceId: sync?.deviceId,
      queuedAt: sync?.queuedAt,
    });
  }

  engageTrack(
    trackId: string,
    baseId: string,
    effectorType: string,
    sync?: MutationSyncOptions,
  ): Observable<any> {
    return this.http.post(`${this.base}/twins/engage`, {
      trackId,
      baseId,
      effectorType,
      clientActionId: sync?.clientActionId,
      deviceId: sync?.deviceId,
      queuedAt: sync?.queuedAt,
    });
  }

  injectTracks(count: number, type: 'FEINT' | 'KINETIC' | 'MIXED' | 'DRONE'): Observable<any> {
    return this.http.post(`${this.base}/twins/inject-tracks`, { count, type });
  }

  resetScenario(): Observable<any> {
    return this.http.post(`${this.base}/twins/reset`, {});
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

  // ── Logistics ───────────────────────────────────────────────────────────────

  getLogistics(): Observable<LogisticsSnapshot> {
    return this.http.get<LogisticsSnapshot>(`${this.base}/logistics`);
  }

  // ── Rationale (backend is sole inference boundary) ───────────────────────────

  getRationaleForCOA(coaId: string): Observable<{ rationaleText: string; model?: string; generatedAt: string }> {
    return this.http.post<any>(`${this.base}/rationale/coa`, { coaId });
  }

  getRationaleForLabResult(runResult: LabRunResult): Observable<{ rationaleText: string; model?: string }> {
    return this.http.post<any>(`${this.base}/rationale/lab-result`, { runResult });
  }

  getRationaleForLogistics(ctx: LogisticsContext): Observable<{ rationaleText: string; model?: string }> {
    return this.http.post<any>(`${this.base}/rationale/logistics`, { ctx });
  }
}
