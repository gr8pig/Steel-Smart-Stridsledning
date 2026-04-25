import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CapabilityOrchestrator } from '../core/services/capability-orchestrator';
import { LabStore } from '../core/state/lab.store';
import { OrchestrationStore } from '../core/state/orchestration.store';
import { PolicyStore } from '../core/state/policy.store';
import { PolicyTwin } from '../shared/domain/models';

@Component({
  selector: 'app-commander-policy-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="design-card overflow-hidden !p-0 h-full flex flex-col shadow-2xl">
      <div class="panel-header">
        <span>Policy Steering Vector</span>
        <div class="flex items-center gap-1.5">
          <span aria-hidden="true" class="w-2 h-0.5 bg-boreal-blue" [style.opacity]="policyWeights().safety"></span>
          <span aria-hidden="true" class="w-2 h-0.5 bg-boreal-amber" [style.opacity]="policyWeights().sustainability"></span>
          <span aria-hidden="true" class="w-2 h-0.5 bg-boreal-green" [style.opacity]="policyWeights().resilience"></span>
        </div>
      </div>

      <div class="flex-grow overflow-y-auto p-4 space-y-4">
        @if (lab.latestInsight(); as insight) {
          <div class="rounded-sm border border-boreal-blue/25 bg-boreal-blue/8 p-4" role="status" aria-live="polite">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <mat-icon class="!text-sm text-boreal-blue">biotech</mat-icon>
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-blue">Lab Feedback</span>
              </div>
              <span class="text-[8px] font-mono text-boreal-text-muted">{{ insight.timestamp | date:'HH:mm:ss' }}</span>
            </div>
            <p class="mt-3 text-[10px] leading-relaxed text-boreal-text-secondary">
              <span class="font-black uppercase tracking-[0.15em] text-boreal-blue">Recommended adjustment:</span>
              {{ insight.recommendedPolicyAdjustment }}
            </p>
            <div class="mt-3 flex flex-wrap gap-3 text-[8px] uppercase tracking-widest">
              <span class="rounded-sm border border-boreal-blue/20 bg-boreal-blue/10 px-2 py-1 text-boreal-blue">Robustness {{ (insight.robustnessScore * 100).toFixed(0) }}%</span>
              <span class="rounded-sm border border-boreal-red/20 bg-boreal-red/10 px-2 py-1 text-boreal-red">Fragility {{ insight.fragilityPoint }}</span>
              <button type="button" aria-label="Dismiss lab feedback" (click)="lab.clearInsights()" class="ml-auto text-boreal-text-muted hover:text-boreal-text-primary transition-colors">
                <mat-icon class="!text-xs">close</mat-icon>
              </button>
            </div>
          </div>
        }

        @if (policy.activePolicy(); as p) {
          <div class="space-y-3">
            @for (weight of weights; track weight.key) {
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full" [class.bg-boreal-blue]="weight.key === 'safety'" [class.bg-boreal-amber]="weight.key === 'sustainability'" [class.bg-boreal-green]="weight.key === 'resilience'"></span>
                    <span class="text-[10px] font-black uppercase tracking-wider text-boreal-text-primary">{{ weight.label }}</span>
                  </div>
                  <span class="text-[10px] font-mono font-bold tracking-tighter" [class.text-boreal-blue]="weight.key === 'safety'" [class.text-boreal-amber]="weight.key === 'sustainability'" [class.text-boreal-green]="weight.key === 'resilience'">
                    {{ (p.weights[weight.key] * 100).toFixed(0) }}%
                  </span>
                </div>
                <input
                  type="range"
                  class="mt-2 w-full h-1 accent-current cursor-pointer rounded-lg appearance-none border border-boreal-border bg-boreal-canvas"
                  [class.text-boreal-blue]="weight.key === 'safety'"
                  [class.text-boreal-amber]="weight.key === 'sustainability'"
                  [class.text-boreal-green]="weight.key === 'resilience'"
                  [value]="p.weights[weight.key] * 100"
                  (input)="updateWeight(weight.key, $event)"
                />
                <p class="mt-2 text-[9px] italic leading-tight text-boreal-text-muted">{{ weight.note }}</p>
              </div>
            }
          </div>

          <div class="rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Commander Guardrails</span>
              <span class="text-[8px] uppercase tracking-[0.18em] text-boreal-text-muted">{{ policyNarrative() }}</span>
            </div>

            <div class="space-y-3">
              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] uppercase tracking-widest text-boreal-text-muted">Reserve Interceptor Floor</span>
                  <span class="text-[10px] font-mono font-bold text-boreal-text-primary">{{ p.guardrails.reserveInterceptorFloor }} <span class="text-[8px] text-boreal-text-muted">UNITS</span></span>
                </div>
                <input
                  type="range"
                  class="mt-2 w-full h-1 rounded-lg appearance-none border border-boreal-border bg-boreal-canvas accent-boreal-text-muted"
                  min="0"
                  max="100"
                  [value]="p.guardrails.reserveInterceptorFloor"
                  (input)="updateGuardrail('reserveInterceptorFloor', $event)"
                />
              </div>

              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] uppercase tracking-widest text-boreal-text-muted">Min Readiness Threshold</span>
                  <span class="text-[10px] font-mono font-bold text-boreal-text-primary">{{ (p.guardrails.minReadinessThreshold * 100).toFixed(0) }}%</span>
                </div>
                <input
                  type="range"
                  class="mt-2 w-full h-1 rounded-lg appearance-none border border-boreal-border bg-boreal-canvas accent-boreal-amber"
                  min="0"
                  max="100"
                  [value]="p.guardrails.minReadinessThreshold * 100"
                  (input)="updateGuardrailPercent('minReadinessThreshold', $event)"
                />
              </div>

              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-3">
                <div class="flex items-center justify-between">
                  <span class="text-[9px] uppercase tracking-widest text-boreal-text-muted">Critical Asset Priority</span>
                  <span class="text-[10px] font-mono font-bold text-boreal-blue">{{ (p.guardrails.criticalAssetPriority * 100).toFixed(0) }}%</span>
                </div>
                <input
                  type="range"
                  class="mt-2 w-full h-1 rounded-lg appearance-none border border-boreal-border bg-boreal-canvas accent-boreal-blue"
                  min="0"
                  max="100"
                  [value]="p.guardrails.criticalAssetPriority * 100"
                  (input)="updateGuardrailPercent('criticalAssetPriority', $event)"
                />
                <p class="mt-2 text-[8px] italic uppercase tracking-tighter text-boreal-text-muted">Weight applied to tier-1 defense nodes.</p>
              </div>

              <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-3">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[9px] uppercase tracking-widest text-boreal-text-muted font-black">Authority</span>
                  <div class="flex gap-1">
                    @for (level of authorityLevels; track level) {
                      <button
                        type="button"
                        (click)="updateGuardrail('engagementAuthority', level)"
                        class="px-2 py-1 text-[8px] font-black uppercase tracking-widest border transition-colors transition-transform rounded-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boreal-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-boreal-canvas"
                        [class.bg-boreal-blue]="p.guardrails.engagementAuthority === level"
                        [class.border-boreal-blue]="p.guardrails.engagementAuthority === level"
                        [class.text-white]="p.guardrails.engagementAuthority === level"
                        [class.shadow-[0_0_8px_var(--boreal-blue)]]="p.guardrails.engagementAuthority === level"
                        [class.border-boreal-border]="p.guardrails.engagementAuthority !== level"
                        [class.text-boreal-text-muted]="p.guardrails.engagementAuthority !== level"
                        [class.bg-transparent]="p.guardrails.engagementAuthority !== level"
                      >
                        {{ level }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          @if (orchestration.publishedIntent(); as intent) {
            <div class="rounded-sm border border-boreal-blue/20 bg-boreal-blue/5 p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-blue">Active Strategic Intent</span>
                <span class="rounded-sm border border-boreal-blue/30 bg-boreal-blue/15 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-boreal-blue">Committed</span>
              </div>
              <p class="text-[10px] leading-relaxed text-boreal-text-primary">{{ intent.commanderRationale }}</p>
              <div class="grid grid-cols-2 gap-2 text-[8px] uppercase tracking-widest">
                <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-2">
                  <div class="text-boreal-text-muted">Track Count</div>
                  <div class="mt-1 font-mono text-boreal-text-primary">5 Active</div>
                </div>
                <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-2">
                  <div class="text-boreal-text-muted">Policy ID</div>
                  <div class="mt-1 font-mono text-boreal-text-primary">POL-01-V4</div>
                </div>
              </div>
              <button
                (click)="orchestration.clearIntent()"
                class="w-full rounded-sm border border-boreal-border bg-boreal-panel-elevated px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted hover:text-boreal-red transition-colors"
              >
                Revoke Intent
              </button>
            </div>
          } @else {
            <div class="rounded-sm border border-boreal-border bg-boreal-canvas/55 p-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-boreal-text-muted">Asset Priorities</span>
                <mat-icon class="!text-[10px] text-boreal-text-muted">info</mat-icon>
              </div>
              <div class="space-y-2">
                <div class="flex items-center justify-between rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-2">
                  <span class="text-[9px] uppercase tracking-tighter text-boreal-text-primary">Nordvik Power Plant</span>
                  <span class="rounded-sm border border-boreal-red/20 bg-boreal-red/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-boreal-red">Critical</span>
                </div>
                <div class="flex items-center justify-between rounded-sm border border-boreal-border bg-boreal-panel-muted/20 p-2 opacity-70">
                  <span class="text-[9px] uppercase tracking-tighter text-boreal-text-primary">Boreal Watch-1</span>
                  <span class="rounded-sm border border-boreal-amber/20 bg-boreal-amber/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-boreal-amber">High</span>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <div class="border-t border-boreal-border bg-boreal-canvas/60 p-4 space-y-2">
        <button
          type="button"
          (click)="publishPolicy()"
          class="w-full rounded-sm bg-boreal-text-primary px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-boreal-canvas shadow-xl transition-transform transition-colors hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boreal-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-boreal-canvas"
        >
          Publish Policy Shift
        </button>
        <div class="flex items-center gap-2 text-[8px] uppercase tracking-[0.2em] text-boreal-text-muted">
          <span class="h-px flex-1 bg-boreal-border"></span>
          <span>Intent propagation remains coupled to the active policy stack.</span>
          <span class="h-px flex-1 bg-boreal-border"></span>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommanderPolicyPanel {
  policy = inject(PolicyStore);
  lab = inject(LabStore);
  orchestration = inject(OrchestrationStore);
  orchestrator = inject(CapabilityOrchestrator);

  authorityLevels: PolicyTwin['guardrails']['engagementAuthority'][] = ['AUTO', 'SEMI', 'MANUAL'];
  policyWeights = computed(() => this.policy.activePolicy()?.weights ?? {
    safety: 0,
    sustainability: 0,
    resilience: 0,
  });

  weights = [
    { key: 'safety' as const, label: 'Safety Priority', note: 'Intercept expenditure vs asset leakage risk.' },
    { key: 'sustainability' as const, label: 'Sustainability', note: 'Present safety vs future interceptor depth.' },
    { key: 'resilience' as const, label: 'Resilience', note: 'Base recovery rate and sortie durability.' },
  ];

  policyNarrative = computed(() => {
    const weights = this.policy.activePolicy()?.weights;
    if (!weights) return 'Policy neutral';

    if (weights.safety > 0.75) return 'Protection heavy';
    if (weights.sustainability > 0.75) return 'Conservation heavy';
    if (weights.resilience > 0.75) return 'Resilience heavy';
    return 'Balanced posture';
  });

  updateWeight(key: keyof PolicyTwin['weights'], event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10) / 100;
    this.policy.updateWeights({ [key]: val });
  }

  updateGuardrail(key: keyof PolicyTwin['guardrails'], event: Event | string) {
    const value = typeof event === 'string' ? event : (event.target as HTMLInputElement).value;
    const parsedValue = isNaN(Number(value)) ? value : Number(value);
    this.policy.updateGuardrails({ [key]: parsedValue } as Partial<PolicyTwin['guardrails']>);
  }

  updateGuardrailPercent(key: keyof PolicyTwin['guardrails'], event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10) / 100;
    this.policy.updateGuardrails({ [key]: val } as Partial<PolicyTwin['guardrails']>);
  }

  publishPolicy() {
    this.orchestrator.showFeature('policy-propagation');
  }
}
