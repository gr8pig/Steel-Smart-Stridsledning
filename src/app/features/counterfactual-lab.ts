import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {PolicyStore} from '../core/state/policy.store';
import {ScenarioStore} from '../core/state/scenario.store';
import {OrchestrationStore} from '../core/state/orchestration.store';

type BranchId = 'baseline' | 'no-jam' | 'reserve-hold' | 'early-shift';

interface BranchProfile {
  id: BranchId;
  label: string;
  summary: string;
  readiness: number;
  risk: number;
  confidence: number;
  note: string;
  tone: 'blue' | 'green' | 'amber';
}

const BRANCH_PROFILES: Record<BranchId, BranchProfile> = {
  baseline: {
    id: 'baseline',
    label: 'Baseline',
    summary: 'Current policy, current sensor state, and the live scenario path.',
    readiness: 62,
    risk: 41,
    confidence: 88,
    note: 'Reference branch for comparison.',
    tone: 'blue'
  },
  'no-jam': {
    id: 'no-jam',
    label: 'No Jamming',
    summary: 'Assumes a clean spectrum. C2 traffic stays coherent and the command loop remains crisp.',
    readiness: 77,
    risk: 24,
    confidence: 91,
    note: 'Improved telemetry and faster authorization cycles.',
    tone: 'green'
  },
  'reserve-hold': {
    id: 'reserve-hold',
    label: 'Reserve Hold',
    summary: 'Protects sustainment depth and delays commitment until the next wave is clearer.',
    readiness: 69,
    risk: 17,
    confidence: 84,
    note: 'Lower immediate burn, higher future endurance.',
    tone: 'amber'
  },
  'early-shift': {
    id: 'early-shift',
    label: 'Early Shift',
    summary: 'Moves forces earlier, trading short-term resilience for higher early effect.',
    readiness: 54,
    risk: 56,
    confidence: 79,
    note: 'High tempo, higher depletion.',
    tone: 'blue'
  }
};

@Component({
  selector: 'app-counterfactual-lab',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <div class="h-full w-full overflow-y-auto bg-boreal-canvas p-6 text-boreal-text-primary">
      <header class="mb-6 flex flex-col gap-3 border-b border-boreal-border pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <h1 class="text-3xl font-light tracking-[0.2em] uppercase">Counterfactual Lab</h1>
            <span class="rounded-sm border border-boreal-amber/30 bg-boreal-amber/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-boreal-amber">WHAT-IF</span>
          </div>
          <p class="text-[10px] font-mono uppercase tracking-widest italic text-boreal-text-muted">
            Compare the current branch against alternate assumptions, timings, and policy shifts.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 px-3 py-2">
            <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Authority</div>
            <div class="text-[11px] font-bold uppercase text-boreal-text-primary">{{ policy.activePolicy()?.guardrails?.engagementAuthority || 'AUTO' }}</div>
          </div>
          <a
            routerLink="/reference"
            class="rounded-sm border border-boreal-border px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted hover:text-boreal-text-primary hover:border-boreal-amber/30 transition-all"
          >
            Back to Atlas
          </a>
        </div>
      </header>

      <div class="grid min-h-0 grid-cols-12 gap-4">
        <section class="design-card col-span-12 lg:col-span-3 !p-0 overflow-hidden">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Branch Selector</div>
          <div class="space-y-2 p-4">
            @for (branch of branches; track branch.id) {
              <button
                (click)="selectedBranch.set(branch.id)"
                class="w-full rounded-sm border p-3 text-left transition-all"
                [class.border-boreal-blue/40]="selectedBranch() === branch.id"
                [class.bg-boreal-blue/10]="selectedBranch() === branch.id"
                [class.border-boreal-border]="selectedBranch() !== branch.id"
                [class.bg-boreal-panel-muted/20]="selectedBranch() !== branch.id"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-tight text-boreal-text-primary">{{ branch.label }}</span>
                  <span class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">{{ branch.confidence }}%</span>
                </div>
                <p class="mt-2 text-[10px] leading-relaxed text-boreal-text-muted">{{ branch.summary }}</p>
              </button>
            }
          </div>
        </section>

        <section class="design-card col-span-12 lg:col-span-6 !p-0 overflow-hidden">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Branch Comparison</div>
          <div class="grid min-h-[420px] gap-px bg-boreal-border lg:grid-cols-2">
            <div class="bg-boreal-panel p-5">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Baseline</span>
                <mat-icon class="!text-[11px] text-boreal-blue">radio_button_checked</mat-icon>
              </div>
              <div class="mt-4 space-y-3">
                <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Selected COA</div>
                  <div class="mt-1 text-lg font-bold uppercase text-boreal-text-primary">{{ policy.selectedCOA()?.name || policy.recommendedCOA().name }}</div>
                </div>
                <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Scenario Phase</div>
                  <div class="mt-1 text-lg font-bold uppercase text-boreal-text-primary">{{ scenario.currentPhase()?.name || 'UNKNOWN' }}</div>
                </div>
                <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Published Intent</div>
                  <div class="mt-1 text-lg font-bold uppercase text-boreal-text-primary">{{ orchestration.publishedIntent() ? 'COMMITTED' : 'PROPOSED' }}</div>
                </div>
              </div>
            </div>

            <div class="bg-boreal-panel p-5">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Counterfactual</span>
                <mat-icon class="!text-[11px] text-boreal-amber">swap_horiz</mat-icon>
              </div>
              <div class="mt-4 space-y-3">
                <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Selected Branch</div>
                  <div class="mt-1 text-lg font-bold uppercase text-boreal-text-primary">{{ branch().label }}</div>
                  <p class="mt-2 text-[10px] leading-relaxed text-boreal-text-secondary">{{ branch().note }}</p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                    <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Readiness</div>
                    <div class="mt-1 text-2xl font-mono font-black text-boreal-text-primary">{{ branch().readiness }}%</div>
                  </div>
                  <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                    <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Risk</div>
                    <div class="mt-1 text-2xl font-mono font-black text-boreal-text-primary">{{ branch().risk }}%</div>
                  </div>
                  <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                    <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Confidence</div>
                    <div class="mt-1 text-2xl font-mono font-black text-boreal-text-primary">{{ branch().confidence }}%</div>
                  </div>
                  <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                    <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Direction</div>
                    <div class="mt-1 text-2xl font-mono font-black text-boreal-text-primary">{{ branch().tone.toUpperCase() }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="design-card col-span-12 lg:col-span-3 !p-0 overflow-hidden">
          <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20">Delta Summary</div>
          <div class="space-y-4 p-4">
            <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4">
              <div class="text-[8px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Branch Effect</div>
              <div class="mt-2 text-[12px] font-bold uppercase text-boreal-text-primary">{{ branch().summary }}</div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Readiness Delta</div>
                <div class="mt-1 text-xl font-mono font-black text-boreal-green">+{{ branch().readiness - 62 }}%</div>
              </div>
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/60 p-3">
                <div class="text-[7px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Risk Delta</div>
                <div class="mt-1 text-xl font-mono font-black text-boreal-red">-{{ 41 - branch().risk }}%</div>
              </div>
            </div>

            <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-boreal-amber animate-pulse"></span>
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Interpretation</span>
              </div>
              <p class="mt-2 text-[10px] leading-relaxed text-boreal-text-secondary">
                Counterfactuals let the operator compare timing, reserve posture, and comms assumptions before the choice is committed into the live policy state.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CounterfactualLab {
  readonly policy = inject(PolicyStore);
  readonly scenario = inject(ScenarioStore);
  readonly orchestration = inject(OrchestrationStore);
  readonly selectedBranch = signal<BranchId>('baseline');

  readonly branches = Object.values(BRANCH_PROFILES);
  readonly branch = computed(() => BRANCH_PROFILES[this.selectedBranch()]);
}
