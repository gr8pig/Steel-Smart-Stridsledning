import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterfactualLabStore } from '../core/ml/counterfactual-lab.store';
import { FrontierViewComponent } from '../shared/ui/frontier-view';

@Component({
  selector: 'app-counterfactual-lab',
  standalone: true,
  imports: [CommonModule, FrontierViewComponent],
  template: `
    <div class="page-container h-full flex flex-col p-6 gap-6 bg-boreal-canvas animate-in fade-in duration-500">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-black text-boreal-text-primary tracking-tighter uppercase italic">Counterfactual Command Lab</h1>
          <p class="text-xs text-boreal-text-muted font-mono tracking-widest">Synthetic Intelligence Fabric / Latent Policy Exploration</p>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex flex-col items-end">
            <span class="text-[8px] font-black text-boreal-text-muted uppercase tracking-[0.2em]">Ensemble Trust</span>
            <div class="h-1.5 w-32 bg-boreal-border/30 rounded-full mt-1 overflow-hidden">
              <div class="h-full bg-boreal-blue transition-all duration-500"
                   [style.width.%]="store.trustLevel() * 100"
                   [class.bg-yellow-500]="store.trustLevel() < 0.7 && store.trustLevel() >= 0.5"
                   [class.bg-red-500]="store.trustLevel() < 0.5"></div>
            </div>
          </div>

          <button (click)="triggerDeepSim()"
                  [disabled]="store.isSimulating()"
                  class="px-4 py-2 bg-boreal-blue/10 border border-boreal-blue/40 hover:bg-boreal-blue/20 text-boreal-blue text-[10px] font-black uppercase tracking-widest rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            {{ store.isSimulating() ? 'Worker Active...' : 'Trigger Deep Sim' }}
          </button>
        </div>
      </header>

      <div class="flex-grow grid grid-cols-12 gap-6 min-h-0">
        <div class="col-span-3 flex flex-col gap-4">
          <div class="bg-boreal-panel/40 border border-boreal-border p-4 rounded flex flex-col gap-6">
            <h2 class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.25em]">Latent Perturbations</h2>

            <div class="flex flex-col gap-2">
              <div class="flex justify-between text-[10px] font-mono">
                <span class="text-boreal-text-muted uppercase">Safety Weight Δ</span>
                <span class="text-boreal-blue font-bold">{{ store.activePolicyDeltas().safety | number:'1.2-2' }}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05"
                     [value]="store.activePolicyDeltas().safety"
                     (input)="onDeltaChange('safety', $event)"
                     class="w-full h-1 bg-boreal-border rounded-lg appearance-none cursor-pointer accent-boreal-blue">
            </div>

            <div class="flex flex-col gap-2">
              <div class="flex justify-between text-[10px] font-mono">
                <span class="text-boreal-text-muted uppercase">Sustainability Δ</span>
                <span class="text-boreal-blue font-bold">{{ store.activePolicyDeltas().sustainability | number:'1.2-2' }}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05"
                     [value]="store.activePolicyDeltas().sustainability"
                     (input)="onDeltaChange('sustainability', $event)"
                     class="w-full h-1 bg-boreal-border rounded-lg appearance-none cursor-pointer accent-boreal-blue">
            </div>

            <div class="mt-4 pt-4 border-t border-boreal-border/30">
              <p class="text-[9px] leading-relaxed text-boreal-text-muted italic">
                Adjust sliders to perturb the live theater policy. The ensemble predicts outcome trajectories across the Pareto frontier in real-time.
              </p>
            </div>
          </div>

          <div class="bg-boreal-panel/40 border border-boreal-border p-4 rounded flex-grow">
            <h2 class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.25em] mb-4">Predicted Outcomes (T+30m)</h2>

            <div class="grid gap-4">
              @for (moe of moes; track moe.label) {
                <div class="flex flex-col">
                  <span class="text-[7px] font-black text-boreal-text-muted uppercase tracking-widest">{{ moe.label }}</span>
                  <div class="flex items-baseline gap-2 mt-0.5">
                    <span class="text-lg font-black text-boreal-text-primary">{{ moe.value | number:'1.2-2' }}</span>
                    @if (moe.trend !== 0) {
                      <span [class]="moe.trend > 0 ? 'text-emerald-500' : 'text-rose-500'" class="text-[9px] font-mono">
                        {{ moe.trend > 0 ? '▲' : '▼' }}{{ Math.abs(moe.trend) }}%
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="col-span-9 flex flex-col gap-6">
          <div class="flex-grow">
            <app-frontier-view
              [currentTrajectory]="store.currentTrajectory()"
              [policyDeltas]="store.activePolicyDeltas()"></app-frontier-view>
          </div>

          <div class="h-48 bg-boreal-panel/20 border border-boreal-border p-4 rounded">
            <h2 class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.25em] mb-4">Robustness Projection Timeline</h2>
            <div class="flex items-end gap-1 h-24 w-full">
              @for (val of store.currentTrajectory()?.p50; track $index) {
                <div class="flex-grow bg-boreal-blue/40 border-t border-boreal-blue group relative"
                     [style.height.%]="val * 100">
                  <div class="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-boreal-panel border border-boreal-border px-1 text-[7px] font-mono whitespace-nowrap z-10">
                    T+{{ $index * 5 }}m: {{ val * 100 | number:'1.0-0' }}%
                  </div>
                </div>
              }
            </div>
            <div class="flex justify-between mt-2 text-[7px] font-mono text-boreal-text-muted">
              <span>NOW</span>
              <span>T+5M</span>
              <span>T+10M</span>
              <span>T+15M</span>
              <span>T+20M</span>
              <span>T+30M</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    input[type=range]::-webkit-slider-thumb {
      height: 12px;
      width: 12px;
      border-radius: 2px;
      background: var(--boreal-blue);
      cursor: pointer;
      -webkit-appearance: none;
      box-shadow: 0 0 10px rgba(0, 163, 255, 0.4);
    }
  `]
})
export class CounterfactualLab {
  readonly store = inject(CounterfactualLabStore);
  readonly Math = Math;

  moes = [
    { label: 'Robustness Index', value: 0.88, trend: +4 },
    { label: 'Readiness Floor', value: 0.72, trend: -2 },
    { label: 'Asymmetry Ratio', value: 3.4, trend: +12 },
  ];

  constructor() {
    this.runInference();

    effect(() => {
      this.store.activePolicyDeltas();
      this.runInference();
    }, { allowSignalWrites: true });
  }

  onDeltaChange(key: 'safety' | 'sustainability', event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.store.updateDeltas({ ...this.store.activePolicyDeltas(), [key]: value });
  }

  runInference() {
    const deltas = this.store.activePolicyDeltas();
    const trajectory = this.buildTrajectory(deltas);
    this.store.setTrajectory(trajectory);

    const lastVal = trajectory.p50[trajectory.p50.length - 1] ?? trajectory.p50[0] ?? 0;
    const startVal = trajectory.p50[0] ?? lastVal;
    this.moes[0].value = lastVal;
    this.moes[0].trend = Math.round((lastVal - startVal) * 100);
    this.moes[1].value = Math.max(0.2, 0.78 - deltas.safety * 0.18 + deltas.sustainability * 0.04);
    this.moes[1].trend = Math.round((this.moes[1].value - 0.74) * 100);
    this.moes[2].value = Math.max(1.5, 4.2 - deltas.sustainability * 0.7 + deltas.safety * 0.35);
    this.moes[2].trend = Math.round((this.moes[2].value - 3.4) * 10);
  }

  triggerDeepSim() {
    this.store.setSimulating(true);
    const deltas = this.store.activePolicyDeltas();

    globalThis.setTimeout(() => {
      this.store.setTrajectory(this.buildTrajectory({
        safety: Math.min(1, deltas.safety + 0.05),
        sustainability: Math.max(0, deltas.sustainability - 0.05),
      }));
      this.store.setSimulating(false);
    }, 1400);
  }

  private buildTrajectory(deltas: { safety: number; sustainability: number }) {
    const horizon = [0, 5, 10, 15, 20, 30];
    const safety = Math.max(0, Math.min(1, deltas.safety));
    const sustainability = Math.max(0, Math.min(1, deltas.sustainability));
    const trust = Math.max(0.35, Math.min(0.98, 0.94 - safety * 0.16 - sustainability * 0.12));
    const center = Math.max(0.2, Math.min(0.95, 0.86 - safety * 0.22 + sustainability * 0.08));
    const slope = Math.max(0.018, 0.03 + safety * 0.01 - sustainability * 0.012);

    const p50 = horizon.map((minute, index) => {
      const drift = center - slope * index - (minute / 30) * (0.02 + safety * 0.05);
      return Math.max(0.08, Math.min(0.98, drift));
    });

    const p10 = p50.map((value, index) => Math.max(0.03, Math.min(0.96, value - 0.1 - index * 0.01)));
    const p90 = p50.map((value, index) => Math.max(0.12, Math.min(1, value + 0.07 + index * 0.005)));

    return {
      time_horizon: horizon,
      p10,
      p50,
      p90,
      trust_score: trust,
      is_speculative: trust < 0.85 || safety > 0.65,
    };
  }
}
