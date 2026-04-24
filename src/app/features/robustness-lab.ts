import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PolicyStore } from '../core/state/policy.store';
import { TacticalStore } from '../core/state/tactical.store';
import { LabStore } from '../core/state/lab.store';
import { OrchestrationStore } from '../core/state/orchestration.store';
import { CapabilityOrchestrator } from '../core/services/capability-orchestrator';
import { BdtApiService, LabRunResult } from '../core/services/bdt-api.service';

@Component({
  selector: 'app-robustness-lab',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full w-full p-6 flex flex-col gap-6 overflow-hidden text-boreal-text-secondary bg-boreal-canvas">
      <header class="flex items-center justify-between border-b border-boreal-border pb-4">
        <div class="flex flex-col gap-1">
            <h1 class="text-3xl font-light tracking-tight text-boreal-text-primary uppercase tracking-[0.2em]">Robustness Lab</h1>
            <p class="text-boreal-text-muted text-[10px] font-mono uppercase tracking-widest italic leading-none">Evidence-Driven Policy Stress-Testing & Stochastic Analysis</p>
        </div>
        <div class="flex items-center gap-3">
             @if (tactical.labHandoffTrack(); as handoff) {
                <div class="px-4 py-2 bg-boreal-blue/10 border border-boreal-blue/20 rounded-sm flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div class="flex flex-col">
                        <span class="text-[8px] text-boreal-blue font-bold uppercase tracking-tighter">Handoff Analysis Context</span>
                        <span class="text-[11px] font-mono font-bold text-boreal-text-primary">{{ handoff.id }}</span>
                    </div>
                    <button (click)="tactical.setLabHandoff(null)" class="text-boreal-text-muted hover:text-boreal-text-primary transition-colors">
                        <mat-icon class="!text-sm">close</mat-icon>
                    </button>
                </div>
             }

             <div class="h-8 w-px bg-boreal-border mx-2"></div>

             <button 
                (click)="runSyncStress()"
                [disabled]="runState() === 'RUNNING'"
                class="px-6 py-2.5 bg-boreal-blue shadow-[0_0_25px_var(--boreal-blue)] text-white rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 hover:brightness-110 shadow-lg transition-all border border-boreal-blue/20 disabled:opacity-50 disabled:cursor-wait"
             >
                @if (runState() === 'RUNNING') {
                    <mat-icon class="!text-sm animate-spin">sync</mat-icon>
                    Processing Scenario Batch...
                } @else {
                    <mat-icon class="!text-sm">play_circle_filled</mat-icon>
                    Run Stochastic Stress Test
                }
             </button>
        </div>
      </header>

      <div class="grid grid-cols-12 gap-6 flex-grow min-h-0">
        <!-- Left: Red Behavior & Uncertainty Controls -->
        <div class="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-hidden">
             <section class="bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl h-full">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 border-b border-boreal-border">Adversarial Vector Configuration</div>
                <div class="p-5 flex-grow overflow-y-auto space-y-6 scrollbar-thin">
                    
                    <div class="p-3 bg-boreal-canvas border border-boreal-border rounded-sm">
                        <span class="text-[8px] text-boreal-text-muted font-bold uppercase tracking-widest block mb-1">Target Assessment Context</span>
                        <div class="flex justify-between items-center">
                            <span class="text-[11px] font-bold text-boreal-text-primary truncate max-w-[150px] uppercase tracking-tight">{{ policy.activePolicy()?.name || 'Manual Posture' }}</span>
                            <span class="text-[9px] font-mono text-boreal-blue font-black uppercase">ACTIVE</span>
                        </div>
                        @if (policy.selectedCOA(); as coa) {
                            <div class="mt-2 pt-2 border-t border-boreal-border flex justify-between items-center opacity-80">
                                <span class="text-[9px] text-boreal-text-secondary font-bold uppercase tracking-tighter">COA: {{ coa.name }}</span>
                                <span class="text-[8px] text-boreal-text-muted uppercase font-mono">{{ coa.type }}</span>
                            </div>
                        }
                    </div>

                    <div class="space-y-3">
                        <span class="text-[9px] text-boreal-text-muted font-bold uppercase tracking-widest block">Red Force Persona</span>
                        <div class="flex flex-col gap-2">
                            @for (model of redModels; track model.id) {
                                <button 
                                    (click)="selectedRedModel.set(model.id); runState.set('IDLE')"
                                    class="p-3 border rounded-sm flex flex-col text-left transition-all group relative overflow-hidden"
                                    [class.bg-boreal-blue/10]="selectedRedModel() === model.id"
                                    [class.border-boreal-blue/40]="selectedRedModel() === model.id"
                                    [class.bg-boreal-panel-muted/20]="selectedRedModel() !== model.id"
                                    [class.border-boreal-border]="selectedRedModel() !== model.id"
                                >
                                    @if (selectedRedModel() === model.id) {
                                      <div class="absolute inset-y-0 left-0 w-1 bg-boreal-blue"></div>
                                    }
                                    <span class="text-[11px] font-bold tracking-tight uppercase group-hover:text-boreal-text-primary" [class.text-boreal-blue]="selectedRedModel() === model.id" [class.text-boreal-text-muted]="selectedRedModel() !== model.id">{{ model.label }}</span>
                                    <span class="text-[9px] text-boreal-text-muted uppercase tracking-widest leading-none mt-1.5">{{ model.description }}</span>
                                </button>
                            }
                        </div>
                    </div>

                    <div class="space-y-6 pt-6 border-t border-boreal-border">
                        <span class="text-[9px] text-boreal-text-muted font-bold uppercase tracking-widest block">Uncertainty Modifiers</span>
                        <div class="space-y-6">
                             <div class="flex flex-col gap-2.5">
                                <div class="flex justify-between text-[10px] text-boreal-text-secondary font-mono tracking-tight uppercase">
                                    <span>Jammer Severity</span>
                                    <span class="text-boreal-amber font-bold">{{ (jammerSeverity() * 15).toFixed(0) }}dB // {{ jammerSeverity() === 3 ? 'CRITICAL' : (jammerSeverity() === 1 ? 'LOW' : 'HIGH') }}</span>
                                </div>
                                <div class="flex items-center gap-4">
                                    <input type="range" min="1" max="3" step="1" 
                                        [value]="jammerSeverity()" 
                                        (input)="updateJammer($event)"
                                        class="flex-grow h-1 bg-boreal-canvas rounded-lg appearance-none cursor-pointer accent-boreal-amber"
                                    >
                                </div>
                            </div>
                             <div class="flex flex-col gap-2.5">
                                <div class="flex justify-between text-[10px] text-boreal-text-secondary font-mono tracking-tight uppercase">
                                    <span>Signal Degradation</span>
                                    <span class="text-boreal-green font-bold">{{ trackDegradation() === 3 ? 'MAX' : (trackDegradation() === 1 ? 'NOMINAL' : 'DEGRADED') }}</span>
                                </div>
                                <div class="flex items-center gap-4">
                                    <input type="range" min="1" max="3" step="1" 
                                        [value]="trackDegradation()" 
                                        (input)="updateDegradation($event)"
                                        class="flex-grow h-1 bg-boreal-canvas rounded-lg appearance-none cursor-pointer accent-boreal-green"
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             </section>
        </div>

        <!-- Center: Heatmap / Outcome Distribution -->
        <div class="col-span-12 lg:col-span-6 flex flex-col gap-6 overflow-hidden">
              <section class="flex-grow bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl relative">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 border-b border-boreal-border flex justify-between pr-3">
                    <div class="flex items-center gap-2">
                        <mat-icon class="!text-xs">grid_on</mat-icon>
                        <span>Stochastic Robustness Heatmap</span>
                    </div>
                    <span class="text-boreal-text-muted font-mono tracking-[0.1em] uppercase font-bold">Iterations: {{ (runCount() / 1000).toFixed(1) }}k / MODE: ADVERSARIAL</span>
                </div>
                
                <div class="flex-grow p-8 flex flex-col items-center justify-center relative bg-boreal-canvas/40 overflow-hidden">
                    <!-- Data Grid Background -->
                    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(circle, var(--boreal-text-primary) 1px, transparent 1px); background-size: 40px 40px;"></div>

                    <!-- Processing Overlay -->
                    @if (runState() === 'RUNNING') {
                        <div class="absolute inset-0 z-50 bg-boreal-canvas/70 backdrop-blur-sm flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
                            <div class="relative w-64 h-1.5 bg-boreal-panel-muted rounded-full overflow-hidden border border-boreal-border shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                <div class="absolute inset-y-0 left-0 bg-boreal-blue transition-all duration-300 ease-out shadow-[0_0_10px_var(--boreal-blue)]" [style.width.%]="runProgress()"></div>
                            </div>
                            <div class="flex flex-col items-center gap-2">
                                <span class="text-[10px] font-mono text-boreal-blue animate-pulse uppercase tracking-[0.4em]">Stochastic Convergence: {{ runProgress() }}%</span>
                                <span class="text-[8px] font-mono text-boreal-text-muted uppercase tracking-widest">Sampling adversarial state space ({{ (runCount() / 1000).toFixed(1) }}k/10k)</span>
                                <div class="flex gap-1 mt-2">
                                    <div class="w-1 h-3 bg-boreal-blue/40 animate-pulse"></div>
                                    <div class="w-1 h-3 bg-boreal-blue/60 animate-pulse delay-75"></div>
                                    <div class="w-1 h-3 bg-boreal-blue/30 animate-pulse delay-150"></div>
                                </div>
                            </div>
                        </div>
                    }

                    <!-- Heatmap Grid (12×12) -->
                    <div class="aspect-square w-full max-w-[480px] grid grid-cols-12 grid-rows-12 gap-1 border border-boreal-border p-3 bg-boreal-canvas/60 relative z-10 shadow-2xl">
                        @for (row of heatRows; track row) {
                            @for (col of heatCols; track col) {
                                <div class="relative rounded-[1px] transition-all duration-700 ease-in-out group/cell cursor-help"
                                     [style.background]="getHeatColor(row, col)">
                                     <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-boreal-panel-elevated border border-boreal-border rounded shadow-2xl opacity-0 group-hover/cell:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap text-[8px] font-mono text-boreal-text-primary">
                                        P(Fail) {{ ((lab.heatmap()?.[row]?.[col] ?? 0) * 100).toFixed(0) }}% @ Vol:{{ row+1 }} Jam:{{ col+1 }}
                                     </div>
                                </div>
                            }
                        }
                    </div>
                    
                    <!-- Axes -->
                    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-black font-mono text-boreal-text-muted uppercase tracking-[0.5em] bg-boreal-canvas px-6 py-1.5 border border-boreal-border shadow-xl">
                      Jammer Amplitude Axis (S<sub>J</sub>)
                    </div>
                    <div class="absolute left-4 top-1/2 -rotate-90 origin-center text-[8px] font-black font-mono text-boreal-text-muted uppercase tracking-[0.5em] bg-boreal-canvas px-6 py-1.5 border border-boreal-border whitespace-nowrap shadow-xl">
                      Adversarial Swarm Density (N<sub>T</sub>)
                    </div>

                    <!-- Selected Track Overlay (Handoff) -->
                     @if (tactical.labHandoffTrack(); as handoff) {
                        <div class="absolute top-[25%] right-[15%] p-5 bg-boreal-canvas/95 backdrop-blur-2xl border border-boreal-blue/40 rounded shadow-[0_0_50px_var(--boreal-blue)] z-30 flex flex-col gap-4 min-w-[240px] animate-in fade-in zoom-in duration-700 border-l-4 border-l-boreal-blue">
                             <div class="flex items-start justify-between">
                                <div class="flex items-center gap-3">
                                  <div class="w-10 h-10 rounded-sm bg-boreal-blue/10 border border-boreal-blue/20 flex items-center justify-center">
                                    <mat-icon class="text-boreal-blue !text-xl !w-5 !h-5">biotech</mat-icon>
                                  </div>
                                  <div class="flex flex-col">
                                      <span class="text-[11px] font-black text-boreal-text-primary uppercase tracking-widest">{{ handoff.id }} Base Trace</span>
                                      <span class="text-[8px] text-boreal-text-muted font-mono uppercase tracking-tighter">Latent Uncertainty Point</span>
                                  </div>
                                </div>
                             </div>
                             <div class="space-y-2 pt-2 border-t border-boreal-border">
                                <div class="flex justify-between text-[9px] font-mono">
                                    <span class="text-boreal-text-muted uppercase">Policy Fragility</span>
                                    <span class="text-boreal-red font-bold uppercase tracking-tight">EVALUATING</span>
                                </div>
                                <div class="h-[1px] w-full bg-boreal-panel-muted relative overflow-hidden">
                                    <div class="absolute inset-y-0 left-0 bg-boreal-blue animate-[progress_1s_ease-in-out_infinite]" style="width: 33%"></div>
                                </div>
                             </div>
                             <p class="text-[10px] text-boreal-text-secondary leading-relaxed italic">
                                Scrutinizing decision logic integrity under identified <span class="text-boreal-blue font-bold uppercase tracking-tighter">{{ handoff.uncertaintySource || 'Sensor Entropy' }}</span> vector.
                             </p>
                        </div>
                     }

                    @if (insights(); as res) {
                        <div class="absolute bottom-20 right-12 p-4 bg-boreal-canvas/90 border border-boreal-red/40 rounded-sm backdrop-blur-xl flex flex-col gap-1.5 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-20 animate-in slide-in-from-bottom-4 duration-1000 border-r-4 border-boreal-red">
                            <div class="flex items-center gap-3">
                                <mat-icon class="text-boreal-red !text-base !w-4 !h-4">report_problem</mat-icon>
                                <span class="text-[11px] font-black text-boreal-text-primary uppercase tracking-widest">Fragility Peak: {{ res.fragilityPoint }}</span>
                            </div>
                            <p class="text-[10px] text-boreal-text-secondary max-w-[180px] leading-relaxed italic">{{ res.narrativeSummary }}</p>
                        </div>
                    }
                </div>
             </section>
        </div>

        <!-- Right: Comparison & Failure Breakdown -->
        <div class="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-hidden">
             <section class="flex-grow bg-boreal-panel border border-boreal-border rounded-sm overflow-hidden flex flex-col shadow-2xl">
                <div class="panel-header uppercase tracking-widest text-[9px] text-boreal-text-muted bg-boreal-panel-muted/20 flex justify-between pr-3 border-b border-boreal-border">
                    <span>Robustness Audit Node</span>
                    <span class="text-boreal-text-muted font-mono tracking-tighter uppercase font-bold">STOCHASTIC-B</span>
                </div>
                
                @if (insights(); as res) {
                    <div class="flex-grow overflow-y-auto p-6 space-y-10 animate-in fade-in duration-1000 scrollbar-thin">
                        <!-- Score readout -->
                        <div class="flex flex-col gap-1 items-center pb-8 border-b border-boreal-border relative">
                            <span class="text-[10px] text-boreal-text-muted font-black uppercase tracking-[0.3em] mb-2">Robustness Score</span>
                            <div class="relative flex items-center justify-center">
                                <span class="text-5xl font-light tracking-tighter text-boreal-text-primary" [class.text-boreal-red]="res.robustnessScore < 0.4" [class.text-boreal-amber]="res.robustnessScore < 0.75">
                                    {{ (res.robustnessScore * 100).toFixed(0) }}
                                </span>
                                <div class="absolute -inset-8 opacity-20" 
                                     [class.bg-boreal-red]="res.robustnessScore < 0.4" 
                                     [class.bg-boreal-amber]="res.robustnessScore >= 0.4 && res.robustnessScore < 0.75" 
                                     [class.bg-boreal-blue]="res.robustnessScore >= 0.75" 
                                     style="filter: blur(40px); background: radial-gradient(circle, currentColor 0%, transparent 70%)">
                                </div>
                            </div>
                            <span class="text-[11px] text-boreal-text-muted font-mono uppercase tracking-[0.2em] mt-2">P(Success / Adversarial)</span>
                        </div>

                        <div class="space-y-6">
                            <span class="text-[10px] text-boreal-text-muted font-black uppercase tracking-widest block">System Delta (vs Legacy Logic)</span>
                            <div class="space-y-6">
                                <div class="flex flex-col gap-2.5">
                                    <div class="flex justify-between items-center text-[10px] font-mono">
                                        <span class="text-boreal-text-primary uppercase tracking-tighter font-bold">Active Steel Policy</span>
                                        <span class="text-boreal-blue font-black tracking-widest uppercase">{{ (res.robustnessScore * 100).toFixed(0) }}%</span>
                                    </div>
                                    <div class="h-1.5 bg-boreal-canvas rounded-full shadow-inner overflow-hidden border border-boreal-border">
                                        <div class="h-full bg-boreal-blue/80 shadow-[0_0_10px_var(--boreal-blue)] transition-all duration-1000 ease-out" [style.width.%]="res.robustnessScore * 100"></div>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2.5">
                                    <div class="flex justify-between items-center text-[10px] font-mono">
                                        <span class="text-boreal-text-muted uppercase tracking-tighter">Legacy Static Baseline</span>
                                        <span class="text-boreal-red font-black tracking-widest uppercase">{{ (res.legacyScore * 100).toFixed(0) }}%</span>
                                    </div>
                                    <div class="h-1 bg-boreal-canvas rounded-full overflow-hidden border border-boreal-border">
                                        <div class="h-full bg-boreal-red/60 transition-all duration-1000 ease-out" [style.width.%]="res.legacyScore * 100"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- Delta callout — always visible -->
                            <div class="mt-4 p-3 bg-boreal-green/5 border border-boreal-green/30 rounded-sm flex items-center justify-between">
                                <span class="text-[9px] text-boreal-text-muted uppercase font-bold tracking-widest">Steel Resilience Gain</span>
                                <span class="text-lg font-black text-boreal-green tracking-tighter">+{{ ((res.robustnessScore - res.legacyScore) * 100).toFixed(0) }}pp</span>
                            </div>
                        </div>

                        <div class="space-y-4 pt-8 border-t border-boreal-border">
                            <span class="text-[10px] text-boreal-text-muted font-black uppercase tracking-widest block">Operational Sustainability Audit</span>
                            <div class="grid grid-cols-2 gap-6 p-4 bg-boreal-canvas border border-boreal-border rounded-sm">
                                <div class="flex flex-col gap-1.5">
                                    <span class="text-[9px] text-boreal-text-muted font-mono tracking-tight uppercase">Next-Wave</span>
                                    <span class="text-xs font-black uppercase tracking-tight" [class.text-boreal-red]="res.nextWaveReadiness === 'CRITICAL'" [class.text-boreal-amber]="res.nextWaveReadiness === 'MODERATE'" [class.text-boreal-green]="res.nextWaveReadiness === 'OPTIMAL'">{{ res.nextWaveReadiness }} Readiness</span>
                                </div>
                                <div class="flex flex-col gap-1.5 border-l border-boreal-border pl-6">
                                    <span class="text-[9px] text-boreal-text-muted font-mono tracking-tight uppercase">Depletion</span>
                                    <span class="text-xs font-black text-boreal-text-primary font-mono tracking-tighter">{{ res.depletionDelta }} UNIT DELTA</span>
                                </div>
                            </div>
                            <p class="text-[9px] text-boreal-text-muted leading-relaxed italic border-l-2 border-boreal-blue/30 pl-3">
                               High robustness ensures <span class="text-boreal-blue uppercase font-bold tracking-tighter">{{ res.nextWaveReadiness }}</span> viability for subsequent saturation waves.
                            </p>
                        </div>

                         <div class="p-5 bg-boreal-blue/5 border border-boreal-blue/20 rounded-sm mt-8 relative overflow-hidden group/rec">
                            <div class="absolute inset-y-0 left-0 w-1 bg-boreal-blue opacity-40 group-hover/rec:opacity-100 transition-opacity"></div>
                            <span class="text-[9px] text-boreal-blue font-black uppercase tracking-[0.2em] block mb-3">Recommended Policy Adjustment</span>
                            <p class="text-[10px] text-boreal-text-secondary italic leading-relaxed">
                                "{{ res.correctionRecommendation }}"
                            </p>
                        </div>
                    </div>
                } @else {
                    <div class="flex-grow flex flex-col items-center justify-center p-10 gap-6 opacity-20">
                         <mat-icon class="!w-16 !h-16 !text-6xl text-boreal-text-muted">biotech</mat-icon>
                         <div class="flex flex-col items-center gap-2">
                             <span class="text-xs uppercase font-black tracking-[0.3em] text-boreal-text-muted">Awaiting Simulation</span>
                             <span class="text-[9px] font-mono text-boreal-text-muted uppercase italic">Initiate batch run to converge policy insights</span>
                         </div>
                    </div>
                }

                <div class="p-5 border-t border-boreal-border bg-boreal-canvas/40 flex flex-col gap-3">
                     <button 
                        (click)="sendToCommander()"
                        [disabled]="!insights()"
                        class="w-full py-3.5 bg-boreal-blue text-white rounded-sm text-[10px] font-black tracking-[0.2em] uppercase hover:brightness-110 shadow-2xl shadow-boreal-blue/20 transition-all active:scale-[0.98] disabled:opacity-20 disabled:grayscale"
                    >
                        Pin Outcome to Commander
                    </button>
                     <button 
                        (click)="exportReport()"
                        class="w-full py-3 bg-boreal-panel-elevated border border-boreal-border text-boreal-text-muted rounded-sm text-[9px] font-black tracking-[0.2em] uppercase hover:text-boreal-text-primary hover:bg-boreal-panel transition-all font-mono"
                    >
                        Export Lab Audit Report
                    </button>
                    <p class="text-[8px] text-center text-boreal-text-muted font-mono tracking-widest uppercase mt-3">Analytical Signature: STEEL-LAB-V9.2 // CONVERGED</p>
                </div>
             </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mat-icon { font-size: 16px; width: 16px; height: 16px; }

    @keyframes progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(330%); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RobustnessLab {
    policy       = inject(PolicyStore);
    tactical     = inject(TacticalStore);
    lab          = inject(LabStore);
    orchestration= inject(OrchestrationStore);
    orchestrator = inject(CapabilityOrchestrator);
    api          = inject(BdtApiService);

    selectedRedModel  = signal<'DECEPTIVE' | 'SATURATION' | 'KINETIC'>('DECEPTIVE');
    jammerSeverity    = signal(2);
    trackDegradation  = signal(1);
    runState          = signal<'IDLE' | 'RUNNING' | 'COMPLETED'>('IDLE');
    runProgress       = signal(0);
    runCount          = signal(0);

    private _labResult = signal<LabRunResult | null>(null);

    // 12×12 grid indices (0-based, passed to template)
    readonly heatRows = Array.from({ length: 12 }, (_, i) => i);
    readonly heatCols = Array.from({ length: 12 }, (_, i) => i);

    readonly redModels: { id: 'DECEPTIVE' | 'SATURATION' | 'KINETIC'; label: string; description: string }[] = [
        { id: 'DECEPTIVE',  label: 'Deceptive Red',    description: 'Feint-Heavy Logic & Decoy Injection' },
        { id: 'SATURATION', label: 'Saturation Red',   description: 'Volume Swarming & Effector Depletion' },
        { id: 'KINETIC',    label: 'Kinetic Priority', description: 'High-Lethality Direct Strike Pattern' },
    ];

    insights = computed(() => {
        const result = this._labResult();
        if (!result || this.runState() !== 'COMPLETED') return null;
        const r6 = result.moeDistributions.readiness6h.mean;
        return {
            robustnessScore:          result.robustnessScore,
            legacyScore:              result.legacyComparisonScore,
            fragilityPoint:           result.fragilityPoint,
            narrativeSummary:         result.correctionRecommendation,
            nextWaveReadiness:        r6 > 0.70 ? 'OPTIMAL' : r6 > 0.50 ? 'MODERATE' : 'CRITICAL',
            depletionDelta:           `-${((1 - r6) * 100).toFixed(0)}%`,
            correctionRecommendation: result.correctionRecommendation,
        };
    });

    updateJammer(event: Event) {
        this.jammerSeverity.set(parseInt((event.target as HTMLInputElement).value));
        this.runState.set('IDLE');
    }

    updateDegradation(event: Event) {
        this.trackDegradation.set(parseInt((event.target as HTMLInputElement).value));
        this.runState.set('IDLE');
    }

    runSyncStress() {
        const coaId = this.policy.selectedCOAId();
        this.runState.set('RUNNING');
        this.runProgress.set(0);
        this.runCount.set(0);

        // Animate progress bar while waiting for real API response
        let fakeCount = 0;
        const fakeTotal = 500;
        const progressInterval = setInterval(() => {
            fakeCount = Math.min(fakeTotal, fakeCount + Math.floor(Math.random() * 60) + 20);
            this.runCount.set(fakeCount);
            this.runProgress.set(Math.floor((fakeCount / fakeTotal) * 90)); // cap at 90% until real result
            if (fakeCount >= fakeTotal) clearInterval(progressInterval);
        }, 80);

        this.api.runLab({
            coaId:            coaId ?? 'COA-BAL',
            redModel:         this.selectedRedModel(),
            jammerSeverity:   this.jammerSeverity(),
            trackDegradation: this.trackDegradation(),
            nRuns:            500,
        }).subscribe({
            next: result => {
                clearInterval(progressInterval);
                this._labResult.set(result);
                this.lab.setHeatmap(result.failureHeatmap);
                this.lab.setRunResult(result);
                this.runProgress.set(100);
                this.runCount.set(result.runsCompleted);
                setTimeout(() => this.runState.set('COMPLETED'), 300);
            },
            error: () => {
                clearInterval(progressInterval);
                this.runState.set('IDLE');
            },
        });
    }

    getHeatColor(row: number, col: number): string {
        if (this.runState() === 'IDLE') return 'var(--boreal-panel-muted)';
        const val = this.lab.heatmap()?.[row]?.[col] ?? 0;
        if (val > 0.60) return 'var(--boreal-red)';
        if (val > 0.30) return 'var(--boreal-amber)';
        return 'var(--boreal-blue)';
    }

    sendToCommander() {
        const res    = this.insights();
        const result = this._labResult();
        if (!res) return;

        this.lab.addInsight({
            id: `LAB-OUTCOME-${Math.floor(Math.random() * 8999) + 1000}`,
            sourceTrackId: this.tactical.labHandoffTrackId() || undefined,
            robustnessScore: res.robustnessScore,
            fragilityPoint:  res.fragilityPoint,
            recommendedPolicyAdjustment: res.correctionRecommendation,
            timestamp: new Date().toISOString(),
            config: {
                redModel:         this.selectedRedModel(),
                jammerSeverity:   this.jammerSeverity(),
                trackDegradation: this.trackDegradation(),
            },
            fullResult: result ?? undefined,
        });

        // Fire-and-forget: fetch AI rationale for audit log
        if (result) {
            this.api.getRationaleForLabResult(result).subscribe({
                next: r => this.orchestrator.showFeature({
                    name: 'Strategic Loop Closure (Lab → Commander)',
                    operationalFunction: r.rationaleText,
                    persona: 'Intelligence Officer / Air Defense Marshall',
                    decisionImproved: 'Evidence-Based Weight Rebalancing',
                    inputs: `Robustness: ${res.robustnessScore}, Fragility: ${res.fragilityPoint}`,
                    outputs: 'Pinned Insight in Commander Console',
                    rationale: r.rationaleText,
                    status: 'OPERATIONAL',
                    tier: 'MVP',
                    nextStep: 'Navigate to Commander Orchestrator to see the policy impact.',
                }),
                error: () => this.orchestrator.showFeature({
                    name: 'Strategic Loop Closure (Lab → Commander)',
                    operationalFunction: 'Pins Monte Carlo findings to the Commander Orchestrator, updating the policy steering vector with explicit robustness evidence.',
                    persona: 'Intelligence Officer / Air Defense Marshall',
                    decisionImproved: 'Evidence-Based Weight Rebalancing',
                    inputs: `Robustness: ${res.robustnessScore}, Fragility: ${res.fragilityPoint}`,
                    outputs: 'Pinned Insight in Commander Console',
                    rationale: 'Closing the loop ensures tactical analysis directly informs strategic policy steering.',
                    status: 'OPERATIONAL',
                    tier: 'MVP',
                    nextStep: 'Navigate to Commander Orchestrator to see the policy impact.',
                }),
            });
            return;
        }

        this.orchestrator.showFeature({
            name: 'Strategic Loop Closure (Lab → Commander)',
            operationalFunction: 'Pins Monte Carlo findings to the Commander Orchestrator, updating the policy steering vector with explicit robustness evidence.',
            persona: 'Intelligence Officer / Air Defense Marshall',
            decisionImproved: 'Evidence-Based Weight Rebalancing',
            inputs: `Robustness: ${res.robustnessScore}, Fragility: ${res.fragilityPoint}`,
            outputs: 'Pinned Insight in Commander Console',
            rationale: 'Closing the loop ensures tactical analysis directly informs strategic policy steering.',
            status: 'OPERATIONAL',
            tier: 'MVP',
            nextStep: 'Navigate to Commander Orchestrator to see the policy impact.',
        });
    }

    exportReport() {
        this.orchestrator.showFeature({
            name: 'Operational Stress Audit PDF',
            operationalFunction: 'Generates a formal audit trail of COA performance against adversarial swarms, jammer corridors, and signal noise.',
            persona: 'Regional Commander / Compliance Officer',
            decisionImproved: 'Post-Mission Accountability & Trust',
            inputs: 'Stochastic Heatmap, Run Data, Weight Distribution',
            outputs: 'Digital Audit Report (Signed)',
            rationale: 'High-stakes decisions must be audit-ready.',
            status: 'STUBBED_UI',
            tier: 'SECONDARY',
            nextStep: 'Template generation for formal command reporting.',
        });
    }
}
