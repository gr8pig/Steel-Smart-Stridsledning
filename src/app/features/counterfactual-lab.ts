import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterfactualLabStore } from '../core/ml/counterfactual-lab.store';
import { FrontierViewComponent } from '../shared/ui/frontier-view';
import { BdtApiService } from '../core/services/bdt-api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-counterfactual-lab',
  standalone: true,
  imports: [CommonModule, FrontierViewComponent],
  template: `
    <div class="page-container h-full flex flex-col p-6 gap-6 bg-boreal-canvas animate-in fade-in duration-500">
      <!-- Header -->
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
        <!-- Sidebar Controls -->
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

          <!-- Predicted MOEs -->
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

        <!-- Main Visualization -->
        <div class="col-span-9 flex flex-col gap-6">
          <div class="flex-grow">
            <app-frontier-view 
              [currentTrajectory]="store.currentTrajectory()"
              [policyDeltas]="store.activePolicyDeltas()"></app-frontier-view>
          </div>
          
          <!-- Temporal Projection -->
          <div class="h-48 bg-boreal-panel/20 border border-boreal-border p-4 rounded">
            <h2 class="text-[9px] font-black text-boreal-text-muted uppercase tracking-[0.25em] mb-4">Robustness Projection Timeline</h2>
            <!-- Mini-chart placeholder for trajectory -->
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
  private readonly api = inject(BdtApiService);
  readonly Math = Math;

  moes = [
    { label: 'Robustness Index', value: 0.88, trend: +4 },
    { label: 'Readiness Floor', value: 0.72, trend: -2 },
    { label: 'Asymmetry Ratio', value: 3.4, trend: +12 },
  ];

  constructor() {
    // Initial fetch
    this.runInference();

    // Re-run inference when deltas change
    effect(() => {
      this.store.activePolicyDeltas();
      this.runInference();
    }, { allowSignalWrites: true });
  }

  onDeltaChange(key: 'safety' | 'sustainability', event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.store.updateDeltas({ ...this.store.activePolicyDeltas(), [key]: value });
  }

  async runInference() {
    try {
      // In a real app, we'd use a dedicated endpoint or extend BdtApiService
      // For integration, we'll call the new /api/ml/predict endpoint
      const response = await fetch('http://localhost:8000/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.store.activePolicyDeltas())
      });
      
      if (response.ok) {
        const data = await response.json();
        this.store.setTrajectory(data);
        
        // Update MOEs based on T+30m projection
        if (data.p50 && data.p50.length > 0) {
            const lastVal = data.p50[data.p50.length - 1];
            this.moes[0].value = lastVal;
            this.moes[0].trend = Math.round((lastVal - data.p50[0]) * 100);
        }
      }
    } catch (e) {
      console.error('ML Inference failed', e);
    }
  }

  async triggerDeepSim() {
    this.store.setSimulating(true);
    try {
        const response = await fetch('http://localhost:8000/api/ml/deep-sim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deltas: this.store.activePolicyDeltas(),
                nRuns: 1000
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Deep Sim triggered:', data.jobId);
            // In a real flow, we'd poll for completion or use a websocket notification
            setTimeout(() => this.store.setSimulating(false), 5000); // UI simulation
        }
    } catch {
        this.store.setSimulating(false);
    }
  }
}
