import { Injectable, signal, computed, inject } from '@angular/core';
import { AuditLogger } from '../services/audit-logger';
import { LabRunResult } from '../services/steel-api.service';

export interface LabInsight {
  id: string;
  sourceTrackId?: string;
  robustnessScore: number;
  fragilityPoint: string;
  recommendedPolicyAdjustment?: string;
  timestamp: string;
  config: {
    redModel: string;
    jammerSeverity: number;
    trackDegradation: number;
  };
  fullResult?: LabRunResult;
}

@Injectable({ providedIn: 'root' })
export class LabStore {
  private audit = inject(AuditLogger);
  private _insights = signal<LabInsight[]>([]);
  private _latestInsightId = signal<string | null>(null);
  private _heatmap = signal<number[][] | null>(null);

  insights     = this._insights.asReadonly();
  heatmap      = this._heatmap.asReadonly();

  latestInsight = computed(() =>
    this._insights().find(i => i.id === this._latestInsightId()) || null
  );

  addInsight(insight: LabInsight) {
    this._insights.update(list => [insight, ...list]);
    this._latestInsightId.set(insight.id);
    if (insight.fullResult?.failureHeatmap) {
      this._heatmap.set(insight.fullResult.failureHeatmap);
    }
    this.audit.log({
      actor: 'ANALYST',
      action: 'Lab Insight Generated',
      rationale: `Stochastic analysis ${insight.id}. Robustness: ${(insight.robustnessScore * 100).toFixed(0)}%. Fragility: ${insight.fragilityPoint}.`,
      category: 'LAB',
    });
  }

  setHeatmap(heatmap: number[][]) {
    this._heatmap.set(heatmap);
  }

  setRunResult(result: LabRunResult) {
    this._heatmap.set(result.failureHeatmap);
  }

  clearInsights() {
    this._insights.set([]);
    this._latestInsightId.set(null);
    this._heatmap.set(null);
  }
}
