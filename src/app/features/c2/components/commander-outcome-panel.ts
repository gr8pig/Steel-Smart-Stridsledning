import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { CapabilityOrchestrator } from '../../../core/services/capability-orchestrator';
import { OrchestrationStore } from '../../../core/state/orchestration.store';
import { PolicyStore } from '../../../core/state/policy.store';
import { ReadinessStore } from '../../../core/state/readiness.store';

@Component({
  selector: 'app-commander-outcome-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="design-card overflow-hidden !p-0 h-full flex flex-col border-l-2 border-l-boreal-blue/35 shadow-2xl" aria-live="polite">
      <div class="panel-header">
        <span>COA Projected Outcome</span>
        <mat-icon class="!text-[11px] text-boreal-blue">analytics</mat-icon>
      </div>

      @if (policy.selectedCOA(); as coa) {
        <div class="flex-grow overflow-y-auto p-5 space-y-5">
          <header class="space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-balance text-[1.45rem] font-light uppercase tracking-[0.18em] text-boreal-text-primary">{{ coa.name }}</h2>
                <div class="mt-2 flex items-center gap-3">
                  <span class="rounded-sm bg-boreal-blue px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">{{ coa.type }}</span>
                  <span class="text-[9px] font-mono italic text-boreal-text-muted">Conf: {{ coa.projectedOutcome.confidence * 100 | number:'1.0-0' }}%</span>
                </div>
              </div>
              <div class="rounded-sm border border-boreal-border bg-gradient-to-br from-boreal-panel-muted/50 to-boreal-canvas/40 p-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <span class="block text-[8px] uppercase tracking-widest text-boreal-text-muted">Selected</span>
                <span class="mt-1 block text-[11px] font-black uppercase tracking-[0.18em] text-boreal-green">Active</span>
              </div>
            </div>
          </header>

          <div class="grid gap-2 sm:grid-cols-3">
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-3">
              <span class="text-[7px] uppercase tracking-[0.24em] text-boreal-text-muted font-black block">Confidence</span>
              <div class="mt-1 text-[1.45rem] font-mono font-bold text-boreal-text-primary leading-none">{{ coa.projectedOutcome.confidence * 100 | number:'1.0-0' }}%</div>
            </div>
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-3">
              <span class="text-[7px] uppercase tracking-[0.24em] text-boreal-text-muted font-black block">Cost</span>
              <div class="mt-1 text-[1.45rem] font-mono font-bold text-boreal-amber leading-none">{{ (coa.projectedOutcome.cost / 1000) | number:'1.0-0' }}k</div>
            </div>
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-3">
              <span class="text-[7px] uppercase tracking-[0.24em] text-boreal-text-muted font-black block">Asymmetry</span>
              <div class="mt-1 text-[1.45rem] font-mono font-bold text-boreal-blue leading-none">{{ coa.projectedOutcome.asymmetryRatio }}x</div>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-sm border border-boreal-border bg-gradient-to-br from-boreal-green/7 to-boreal-canvas/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span class="text-[8px] uppercase text-boreal-text-muted font-bold tracking-widest block mb-1">Expected Intercepts</span>
              <div class="text-[1.95rem] font-mono font-bold text-boreal-green leading-none">{{ coa.projectedOutcome.intercepts }} / 5</div>
              <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Interception capacity retained</p>
            </div>
            <div class="rounded-sm border border-boreal-border bg-gradient-to-br from-boreal-red/7 to-boreal-canvas/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" [class.border-boreal-red/40]="coa.projectedOutcome.leakage > 0">
              <span class="text-[8px] uppercase text-boreal-text-muted font-bold tracking-widest block mb-1">Expected Leakage</span>
              <div class="text-[1.95rem] font-mono font-bold leading-none" [class.text-boreal-red]="coa.projectedOutcome.leakage > 0" [class.text-boreal-text-muted]="coa.projectedOutcome.leakage === 0">
                {{ coa.projectedOutcome.leakage }}
              </div>
              <p class="mt-1 text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">Projected residual exposure</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex items-baseline justify-between">
                <span class="text-[9px] uppercase text-boreal-text-muted font-bold tracking-widest">Sustainability Delta (12h)</span>
                <span class="text-[9px] font-mono text-boreal-text-primary">{{ (coa.projectedOutcome.cost / 2000000 * 100).toFixed(1) }}% LOSS</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full border border-boreal-border bg-boreal-canvas">
                <div class="h-full bg-gradient-to-r from-boreal-amber via-boreal-amber to-boreal-red/40" [style.width.%]="coa.projectedOutcome.cost / 2000000 * 100"></div>
              </div>

              <div class='mt-3 pt-2 border-t border-boreal-border/30 flex gap-4 text-[8px] font-mono uppercase tracking-widest text-boreal-text-muted'>
                <span>Pareto frontier: {{ policy.paretoSize() }} candidates</span>
                <span>Solved in {{ policy.solveTimeMs() }}ms</span>
              </div>

              <div class='mt-3'>
                <button
                  (click)='showAssignments.set(!showAssignments())'
                  class='text-[8px] font-mono uppercase tracking-widest text-boreal-blue hover:text-boreal-text-primary transition-colors flex items-center gap-1'>
                  ENGAGEMENT ASSIGNMENTS ({{ coa.assignments.length }})
                  <span>{{ showAssignments() ? '▲' : '▼' }}</span>
                </button>
                @if (showAssignments()) {
                  <div class='mt-2 space-y-1'>
                    @for (a of coa.assignments; track a.threatId) {
                      <div class='grid grid-cols-4 gap-2 text-[8px] font-mono text-boreal-text-muted'>
                        <span class='text-boreal-red'>{{ a.threatId }}</span>
                        <span>→ {{ a.baseId }}</span>
                        <span>{{ a.effectorType }}</span>
                        <span class='text-boreal-green'>pk: {{ ((a.pk || 0) * 100) | number:'1.0-0' }}%</span>
                      </div>
                    }
                  </div>
                }
              </div>
              
              @if (rationaleLoading()) {
                <div class='animate-pulse h-2 bg-boreal-border/50 rounded w-3/4 my-1'></div>
                <div class='animate-pulse h-2 bg-boreal-border/50 rounded w-1/2 my-1'></div>
              } @else {
                <p class='border-l-2 border-boreal-border pl-3 text-[9px] italic leading-relaxed text-boreal-text-muted'>{{ rationaleText() }}</p>
              }
            </div>

            <div class="space-y-2">

              <div class="flex items-baseline justify-between">
                <span class="text-[9px] uppercase text-boreal-text-muted font-bold tracking-widest">Decision Robustness Score</span>
                <div class="flex items-center gap-2">
                  <span class="text-[9px] font-mono text-boreal-blue">{{ coa.projectedOutcome.robustnessScore }}</span>
                  <span class='text-[8px] font-mono font-black px-1.5 py-0.5 rounded-sm bg-boreal-panel-elevated/50'
                        [class.text-boreal-green]='coa.projectedOutcome.robustnessScore > policy.legacyBaseline().robustnessScore'
                        [class.text-boreal-red]='coa.projectedOutcome.robustnessScore <= policy.legacyBaseline().robustnessScore'>
                    {{ (coa.projectedOutcome.robustnessScore - policy.legacyBaseline().robustnessScore) | number:"+1.2-2" }} vs baseline
                  </span>
                </div>
              </div>
              <div class="h-1 overflow-hidden rounded-full border border-boreal-border bg-boreal-canvas">
                <div class="h-full bg-gradient-to-r from-boreal-blue via-boreal-blue to-boreal-green/70" [style.width.%]="coa.projectedOutcome.robustnessScore * 100"></div>
              </div>
            </div>

            <div class="rounded-sm border border-boreal-green/20 bg-gradient-to-br from-boreal-green/8 to-boreal-canvas/40 p-4">
              <span class="text-[8px] uppercase text-boreal-green font-bold tracking-widest">Asymmetry Ratio</span>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-3xl font-bold text-boreal-text-primary leading-none tracking-tighter">{{ coa.projectedOutcome.asymmetryRatio }}x</span>
                <span class="text-[8px] uppercase italic text-boreal-text-muted">Protection : Depletion</span>
              </div>
            </div>
          </div>

          <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4">
            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Base Recovery Forecast</span>
            <div class="mt-3 space-y-2">
              @for (base of readiness.bases(); track base.id) {
                @let delta = coa.projectedOutcome.readinessDeltaByBase[base.id] || 0;
                <div class="flex items-center justify-between rounded-sm border border-boreal-border bg-boreal-canvas/55 px-3 py-2 text-[10px] font-mono">
                  <span class="uppercase text-boreal-text-muted">{{ base.name }}</span>
                  <div class="flex items-center gap-2">
                    <span [class.text-boreal-red]="delta < -0.05" [class.text-boreal-green]="delta >= 0" [class.text-boreal-text-muted]="delta < 0 && delta >= -0.05">
                      {{ delta * 100 | number:'1.1-1' }}%
                    </span>
                    <mat-icon class="!text-[10px]" [class.text-boreal-red]="delta < -0.05" [class.text-boreal-text-muted]="delta >= -0.05">
                      {{ delta < 0 ? 'south_east' : 'north_east' }}
                    </mat-icon>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="border-t border-boreal-border bg-boreal-canvas/60 p-4 space-y-4">
          <div class="space-y-2">
            <span class="text-[9px] font-black uppercase tracking-widest text-boreal-blue block">Intent Publication State</span>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-2">
                <span class="block text-[8px] uppercase text-boreal-text-muted">Mode</span>
                <span class="mt-1 block text-[9px] font-bold uppercase text-boreal-text-primary">{{ policy.activePolicy()?.guardrails?.engagementAuthority }}</span>
              </div>
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-2">
                <span class="block text-[8px] uppercase text-boreal-text-muted">Burn Constraint</span>
                <span class="mt-1 block text-[9px] font-bold uppercase text-boreal-text-primary">Sustainability {{ (summary().sustainWeight * 10).toFixed(0) }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <button
              type="button"
              (click)="approveCOA()"
              class="w-full rounded-sm bg-boreal-blue px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-xl shadow-boreal-blue/20 transition-transform transition-colors hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boreal-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-boreal-canvas"
            >
              Commit Intent to Tactical
            </button>
            <button
              type="button"
              (click)="analyzeInLab()"
              class="w-full rounded-sm border border-boreal-border bg-boreal-panel-elevated px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-boreal-text-muted transition-colors hover:text-boreal-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boreal-blue/50 focus-visible:ring-offset-2 focus-visible:ring-offset-boreal-canvas"
            >
              Analyze in Lab
            </button>
          </div>
        </div>
      } @else {
        <div class="flex flex-grow items-center justify-center p-10 text-center">
          <div class="max-w-xs space-y-3">
            <mat-icon class="!text-3xl text-boreal-text-muted">dashboard</mat-icon>
            <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-boreal-text-primary">No COA Selected</h3>
            <p class="text-[10px] leading-relaxed text-boreal-text-muted">
              Use the frontier panel to pick a course of action, then the projected outcome and tactical publication controls will populate here.
            </p>
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommanderOutcomePanel {
  policy = inject(PolicyStore);
  readiness = inject(ReadinessStore);
  orchestration = inject(OrchestrationStore);
  orchestrator = inject(CapabilityOrchestrator);
  private http = inject(HttpClient);

  rationaleText = signal('');
  rationaleLoading = signal(false);
  showAssignments = signal(false);

  constructor() {
    effect(() => {
      const c = this.policy.selectedCOA();
      if (!c) return;
      this.rationaleLoading.set(true);
      this.rationaleText.set('');
      this.http.post<{rationaleText: string}>('/api/rationale/coa', { coaId: c.id })
        .subscribe({
          next: r => { this.rationaleText.set(r.rationaleText); this.rationaleLoading.set(false); },
          error: () => { this.rationaleLoading.set(false); }
        });
    });
  }

  summary = computed(() => {
    const activePolicy = this.policy.activePolicy();
    return {
      sustainWeight: activePolicy?.weights.sustainability || 0,
    };
  });

  approveCOA() {
    const coa = this.policy.selectedCOA();
    const activePolicy = this.policy.activePolicy();
    const sustainWeight = activePolicy?.weights.sustainability || 0;

    if (coa) {
      const desc = sustainWeight > 0.75
        ? 'Strategic Conservation'
        : sustainWeight < 0.4
          ? 'Maximum Protection'
          : 'Balanced Command';

      this.orchestration.publishIntent(`${desc} | ${coa.rationale}`);
    }

    this.orchestrator.showFeature('commander-intent-commitment');
  }

  analyzeInLab() {
    this.orchestration.handoffCOAToLab();
    this.orchestrator.showFeature({
      name: 'Choice Sensitivity Lab',
      operationalFunction: 'Exports the current tradeoff curve to Robustness Lab to verify whether the selected COA holds up under adversarial stress.',
      persona: 'Air Defense Commander',
      decisionImproved: 'Decision Robustness',
      inputs: 'COA Outcome, Pareto Frontier',
      outputs: 'Robustness Heatmap',
      rationale: 'The Pareto frontier shows the best current options. The Lab shows which ones survive the next surprise.',
      status: 'PARTIAL_FRONTEND',
      tier: 'MVP',
      nextStep: 'The Lab now displays the COA being stress tested.'
    });
  }
}
