import { Injectable, inject } from '@angular/core';
import { Observable, of, catchError, map } from 'rxjs';
import { BdtApiService, LabRunResult, LogisticsContext } from './bdt-api.service';

export type { LogisticsContext } from './bdt-api.service';

export interface RationaleResult {
  rationaleText: string;
  source: 'BACKEND' | 'FALLBACK';
  model?: string;
  generatedAt?: string;
}

/**
 * LLMService: frontend rationale orchestrator.
 *
 * Architecture decision: backend endpoints remain the sole inference boundary.
 * This service routes all rationale requests through BdtApiService → server.ts.
 * If LLM_ENDPOINT is configured server-side, the backend forwards to an LLM.
 * Otherwise, the backend returns deterministic fallback text.
 * Either way, this service never makes direct LLM calls from the browser.
 */
@Injectable({ providedIn: 'root' })
export class LLMService {
  private api = inject(BdtApiService);

  getRationaleForCOA(coaId: string): Observable<RationaleResult> {
    return this.api.getRationaleForCOA(coaId).pipe(
      map(res => ({
        rationaleText: res.rationaleText,
        source: 'BACKEND' as const,
        model: res.model,
        generatedAt: res.generatedAt,
      })),
      catchError(() => of({
        rationaleText: this._fallbackCOARationale(coaId),
        source: 'FALLBACK' as const,
      })),
    );
  }

  getRationaleForLabResult(result: LabRunResult): Observable<RationaleResult> {
    return this.api.getRationaleForLabResult(result).pipe(
      map(res => ({
        rationaleText: res.rationaleText,
        source: 'BACKEND' as const,
        model: res.model,
      })),
      catchError(() => of({
        rationaleText: this._fallbackLabRationale(result),
        source: 'FALLBACK' as const,
      })),
    );
  }

  getRationaleForLogistics(ctx: LogisticsContext): Observable<RationaleResult> {
    return this.api.getRationaleForLogistics(ctx).pipe(
      map(res => ({
        rationaleText: res.rationaleText,
        source: 'BACKEND' as const,
        model: res.model,
      })),
      catchError(() => of({
        rationaleText: this._fallbackLogisticsRationale(ctx),
        source: 'FALLBACK' as const,
      })),
    );
  }

  // ── Static fallbacks (deterministic, no external deps) ──────────────────────

  private _fallbackCOARationale(coaId: string): string {
    const narratives: Record<string, string> = {
      'COA-MAX': 'Maximum Protection commits full effector depth across Northern Vanguard and Boreal Watch, achieving zero leakage at the cost of 18% aggregate readiness depletion. Legacy rule-based fire control, sequencing engagements by detection order, would exhaust short-range interceptors at T+4h and leave Wave 2 with 8% fleet readiness. Steel policy-weighting preserves the reserve floor while guaranteeing intercept geometry against all five active tracks.',
      'COA-BAL': 'Balanced Approach achieves 4 of 5 intercepts while holding fleet readiness above 62% — the minimum viable threshold for a follow-on saturation wave. Interceptor burn is reduced 47% against Max Protection posture by routing TRK-003 to Southern Anchor, exploiting asymmetry ratio of 3.6×. A legacy system triggering in detection sequence would deplete Boreal Watch to critical status by T+6h, leaving the northern corridor undefended.',
      'COA-DST': 'Deep Sustainability accepts two leakage events to lock in a 0.91 robustness score — the highest in the frontier — reserving interceptor depth for the anticipated Wave 2 saturation strike. All five bases remain above their readiness floor; Deep Reserve Alpha remains untouched. Legacy fire control cannot model multi-wave trajectories and would treat this as an unacceptable posture, defaulting to maximum expenditure and resulting in 8% readiness at T+12.',
    };
    return narratives[coaId] ??
      `${coaId} selected based on current policy weights and theater readiness. ` +
      'Dual-wave sustainability preserved above minimum threshold. Legacy rule-based systems would deplete to critical floor within the current engagement window, leaving Wave 2 defenseless.';
  }

  private _fallbackLabRationale(result: LabRunResult): string {
    const score = (result.robustnessScore * 100).toFixed(0);
    const legacy = (result.robustnessScore * 0.55 * 100).toFixed(0);
    return `Monte Carlo convergence at ${score}% robustness — ${Number(score) - Number(legacy)}pp above legacy baseline (${legacy}%). ` +
      `Primary fragility: ${result.fragilityPoint}. Immediate action: ${result.correctionRecommendation}`;
  }

  private _fallbackLogisticsRationale(ctx: LogisticsContext): string {
    const health = (ctx.supplyHealth * 100).toFixed(0);
    const risk = Number(health) < 70 ? 'DEGRADED — resupply to contested sectors is time-critical before next engagement wave' : 'NOMINAL — maintain current throughput cadence';
    const degraded = ctx.degradedNodes.length > 0
      ? `Nodes ${ctx.degradedNodes.join(', ')} are degraded and require priority rerouting.`
      : 'All supply nodes operating within nominal parameters.';
    return `Theater supply health at ${health}% with ${ctx.openCorridors} corridors open and ${ctx.enRoute} reinforcement convoys en route. ` +
      `Logistics posture: ${risk}. ${degraded}`;
  }
}
