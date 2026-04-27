import { Injectable, inject, signal, computed } from '@angular/core';
import { SteelApiService, ScenarioSimResult, ScenarioCompareResult } from '../services/steel-api.service';
import { AuditLogger } from '../services/audit-logger';

export type ScenarioSimMode = 'idle' | 'sweep' | 'compare';

@Injectable({ providedIn: 'root' })
export class ScenarioSimStore {
  private api = inject(SteelApiService);
  private audit = inject(AuditLogger);

  mode = signal<ScenarioSimMode>('idle');
  isRunning = signal(false);
  error = signal<string | null>(null);

  scenarioA = signal('boreal-strike');
  scenarioB = signal('ghost-feint');

  sweepResult = signal<ScenarioSimResult | null>(null);
  compareResult = signal<ScenarioCompareResult | null>(null);

  policySweep = signal<Record<string, number[]>>({
    safety: [0.3, 0.5, 0.7],
    sustainability: [0.3, 0.5, 0.7],
  });
  jammerSweep = signal<number[] | null>(null);

  readonly overallRobustness = computed(() => this.sweepResult()?.aggregate?.overallRobustness ?? 0);
  readonly overallFailure = computed(() => this.sweepResult()?.aggregate?.overallFailureProbability ?? 0);
  readonly overallTrust = computed(() => this.sweepResult()?.aggregate?.overallTrust ?? 0);
  readonly bestPolicy = computed(() => this.sweepResult()?.aggregate?.bestPolicy ?? null);
  readonly robustnessRange = computed(() => this.sweepResult()?.aggregate?.robustnessRange ?? null);

  readonly compareVerdict = computed(() => this.compareResult()?.deltas?.verdict ?? '');
  readonly compareRobustnessDelta = computed(() => this.compareResult()?.deltas?.robustness ?? 0);

  runSweep(): void {
    this.isRunning.set(true);
    this.error.set(null);
    this.sweepResult.set(null);
    this.mode.set('sweep');

    this.api.runScenarioSim({
      scenarioName: this.scenarioA(),
      policySweep: this.policySweep(),
      jammerSweep: this.jammerSweep() ?? undefined,
    }).subscribe({
      next: (result) => {
        this.sweepResult.set(result);
        this.isRunning.set(false);
        this.audit.log({
          actor: 'ANALYST',
          action: 'Scenario Sweep Complete',
          rationale: `${result.scenarioName}: robustness=${result.aggregate.overallRobustness} across ${result.sweepCount} points`,
          category: 'LAB',
        });
      },
      error: (err) => {
        this.error.set(err.message || 'Scenario sweep failed');
        this.isRunning.set(false);
      },
    });
  }

  runCompare(): void {
    this.isRunning.set(true);
    this.error.set(null);
    this.compareResult.set(null);
    this.mode.set('compare');

    this.api.runScenarioCompare({
      scenarioA: this.scenarioA(),
      scenarioB: this.scenarioB(),
      policySweep: this.policySweep(),
      jammerSweep: this.jammerSweep() ?? undefined,
    }).subscribe({
      next: (result) => {
        this.compareResult.set(result);
        this.isRunning.set(false);
        this.audit.log({
          actor: 'ANALYST',
          action: 'Scenario Comparison Complete',
          rationale: `${result.scenarioA.name} vs ${result.scenarioB.name}: delta=${result.deltas.robustness}, verdict=${result.deltas.verdict}`,
          category: 'LAB',
        });
      },
      error: (err) => {
        this.error.set(err.message || 'Scenario comparison failed');
        this.isRunning.set(false);
      },
    });
  }
}